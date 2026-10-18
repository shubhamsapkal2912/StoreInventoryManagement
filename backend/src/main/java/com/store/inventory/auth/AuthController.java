package com.store.inventory.auth;

import com.store.inventory.auth.AuthService.AuthResponse;
import com.store.inventory.auth.AuthService.AuthResult;
import com.store.inventory.auth.AuthService.LoginRequest;
import com.store.inventory.auth.AuthService.RegisterRequest;
import com.store.inventory.config.AppProperties;
import com.store.inventory.exception.ApiException;
import com.store.inventory.user.UserDto;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String CSRF_HEADER = "X-Requested-With";
    private static final String COOKIE_PATH = "/api/auth";

    private final AuthService auth;
    private final AppProperties props;

    public AuthController(AuthService auth, AppProperties props) {
        this.auth = auth;
        this.props = props;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        return withCookie(HttpStatus.OK, auth.login(req, http.getRemoteAddr()));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return withCookie(HttpStatus.CREATED, auth.register(req));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest http) {
        requireCsrfHeader(http);
        try {
            return withCookie(HttpStatus.OK, auth.refresh(readCookie(http)));
        } catch (ApiException ex) {
            // Drop the dead cookie so the browser stops presenting it.
            return ResponseEntity.status(ex.getStatus())
                    .header(HttpHeaders.SET_COOKIE, clearedCookie().toString())
                    .body(null);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest http) {
        requireCsrfHeader(http);
        auth.logout(readCookie(http));
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, clearedCookie().toString()).build();
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal Jwt jwt) {
        return auth.me(Long.valueOf(jwt.getSubject()));
    }

    private ResponseEntity<AuthResponse> withCookie(HttpStatus status, AuthResult result) {
        ResponseCookie cookie = baseCookie(result.refreshToken(), props.refresh().ttl()).build();
        return ResponseEntity.status(status).header(HttpHeaders.SET_COOKIE, cookie.toString()).body(result.body());
    }

    private ResponseCookie clearedCookie() {
        return baseCookie("", Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value, Duration maxAge) {
        AppProperties.Refresh r = props.refresh();
        return ResponseCookie.from(r.cookieName(), value)
                .httpOnly(true)
                .secure(r.cookieSecure())
                .sameSite(r.cookieSameSite())
                .path(COOKIE_PATH)
                .maxAge(maxAge);
    }

    private String readCookie(HttpServletRequest http) {
        if (http.getCookies() == null) {
            return null;
        }
        for (Cookie c : http.getCookies()) {
            if (c.getName().equals(props.refresh().cookieName())) {
                return c.getValue();
            }
        }
        return null;
    }

    /** A custom header cannot be set by a cross-site form post and forces a CORS pre-flight for cross-origin XHR. */
    private void requireCsrfHeader(HttpServletRequest http) {
        if (http.getHeader(CSRF_HEADER) == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Missing " + CSRF_HEADER + " header");
        }
    }
}
