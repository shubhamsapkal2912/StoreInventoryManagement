package com.store.inventory.auth;

import com.store.inventory.config.AppProperties;
import com.store.inventory.exception.ApiException;
import com.store.inventory.security.JwtService;
import com.store.inventory.security.LoginRateLimiter;
import com.store.inventory.user.Role;
import com.store.inventory.user.User;
import com.store.inventory.user.UserDto;
import com.store.inventory.user.UserRepository;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    public record LoginRequest(@NotBlank @Email @Size(max = 255) String email, @NotBlank @Size(max = 72) String password) {}

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 72, message = "must be between 8 and 72 characters")
            @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "must contain at least one letter and one digit")
            String password,
            @Size(max = 30) String phone,
            @Size(max = 500) String address) {}

    public record AuthResponse(String accessToken, String tokenType, long expiresIn, UserDto user) {}

    /** Result of a login/refresh: the JSON body plus the raw refresh token destined for the HttpOnly cookie. */
    public record AuthResult(AuthResponse body, String refreshToken) {}

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final LoginRateLimiter limiter;
    private final AppProperties props;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens,
                       AuthenticationManager authenticationManager, PasswordEncoder encoder, JwtService jwt,
                       LoginRateLimiter limiter, AppProperties props) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.authenticationManager = authenticationManager;
        this.encoder = encoder;
        this.jwt = jwt;
        this.limiter = limiter;
        this.props = props;
    }

    @Transactional
    public AuthResult login(LoginRequest req, String clientIp) {
        String email = req.email().trim().toLowerCase();
        limiter.check(clientIp, email);
        try {
            authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(email, req.password()));
        } catch (AuthenticationException ex) {
            limiter.recordFailure(clientIp, email);
            log.warn("Failed login for email={} ip={}", email, clientIp);
            throw ApiException.unauthorized("Invalid email or password");
        }
        limiter.reset(clientIp, email);
        User user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        log.info("Login success user={} role={}", user.getId(), user.getRole());
        return issue(user, UUID.randomUUID().toString());
    }

    @Transactional
    public AuthResult register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account with this email already exists");
        }
        User u = new User();
        u.setEmail(email);
        u.setFullName(req.fullName().trim());
        u.setPasswordHash(encoder.encode(req.password()));
        u.setPhone(req.phone() == null || req.phone().isBlank() ? null : req.phone().trim());
        u.setAddress(req.address() == null || req.address().isBlank() ? null : req.address().trim());
        u.setRole(Role.CUSTOMER); // role is never taken from the request
        u = users.saveAndFlush(u);
        log.info("Customer registered user={}", u.getId());
        return issue(u, UUID.randomUUID().toString());
    }

    /**
     * Rotates the refresh token. Presenting an already-rotated token is treated as theft: the whole token family
     * is revoked. noRollbackFor makes sure that revocation is committed even though we answer 401.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResult refresh(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw ApiException.unauthorized("Session expired");
        }
        RefreshToken stored = refreshTokens.findByHashForUpdate(hash(rawToken))
                .orElseThrow(() -> ApiException.unauthorized("Session expired"));
        Instant now = Instant.now();
        if (stored.getRevokedAt() != null) {
            refreshTokens.revokeFamily(stored.getFamilyId(), now);
            log.warn("Refresh token reuse detected user={} family={}", stored.getUser().getId(), stored.getFamilyId());
            throw ApiException.unauthorized("Session expired");
        }
        if (stored.getExpiresAt().isBefore(now) || !stored.getUser().isEnabled()) {
            stored.setRevokedAt(now);
            throw ApiException.unauthorized("Session expired");
        }
        stored.setRevokedAt(now);
        return issue(stored.getUser(), stored.getFamilyId());
    }

    @Transactional
    public void logout(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        refreshTokens.findByHashForUpdate(hash(rawToken))
                .ifPresent(t -> refreshTokens.revokeFamily(t.getFamilyId(), Instant.now()));
    }

    @Transactional(readOnly = true)
    public UserDto me(Long userId) {
        return users.findById(userId).map(UserDto::from)
                .orElseThrow(() -> ApiException.unauthorized("Account no longer exists"));
    }

    @Scheduled(cron = "0 15 3 * * *")
    @Transactional
    void purgeExpired() {
        int n = refreshTokens.deleteExpired(Instant.now().minusSeconds(86_400));
        if (n > 0) {
            log.info("Purged {} expired refresh tokens", n);
        }
    }

    private AuthResult issue(User user, String familyId) {
        byte[] bytes = new byte[48];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        RefreshToken t = new RefreshToken();
        t.setUser(user);
        t.setFamilyId(familyId);
        t.setTokenHash(hash(raw));
        t.setExpiresAt(Instant.now().plus(props.refresh().ttl()));
        refreshTokens.save(t);
        AuthResponse body = new AuthResponse(jwt.issueAccessToken(user), "Bearer", jwt.accessTtl().toSeconds(),
                UserDto.from(user));
        return new AuthResult(body, raw);
    }

    static String hash(String raw) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
