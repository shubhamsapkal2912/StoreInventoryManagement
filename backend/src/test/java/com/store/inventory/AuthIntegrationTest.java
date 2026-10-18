package com.store.inventory;

import com.jayway.jsonpath.JsonPath;
import com.store.inventory.config.AppProperties;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.Map;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasKey;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    JwtEncoder encoder;
    @Autowired
    AppProperties props;

    @Test
    void managerLoginSucceedsAndSetsHttpOnlyRefreshCookie() throws Exception {
        mvc.perform(withBody(post("/api/auth/login"), Map.of("email", MANAGER_EMAIL, "password", MANAGER_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("STORE_MANAGER"))
                .andExpect(jsonPath("$.user.email").value(MANAGER_EMAIL))
                .andExpect(jsonPath("$.user", org.hamcrest.Matchers.not(hasKey("passwordHash"))))
                .andExpect(cookie().httpOnly("refresh_token", true))
                .andExpect(cookie().path("refresh_token", "/api/auth"))
                .andExpect(header().string("Set-Cookie", containsString("SameSite=Strict")));
    }

    @Test
    void wrongPasswordIsRejectedWithGenericMessage() throws Exception {
        mvc.perform(withBody(post("/api/auth/login"), Map.of("email", MANAGER_EMAIL, "password", "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
        mvc.perform(withBody(post("/api/auth/login"), Map.of("email", "nobody@test.local", "password", "whatever1")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void loginValidationReportsFieldErrors() throws Exception {
        mvc.perform(withBody(post("/api/auth/login"), Map.of("email", "not-an-email", "password", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    void registrationCreatesCustomerEvenIfRoleIsSupplied() throws Exception {
        String email = "reg-" + unique() + "@test.local";
        mvc.perform(withBody(post("/api/auth/register"), Map.of("fullName", "Rita Reg", "email", email,
                        "password", "Passw0rdOK", "role", "STORE_MANAGER")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.role").value("CUSTOMER"));
        // duplicate (case-insensitive)
        mvc.perform(withBody(post("/api/auth/register"), Map.of("fullName", "Rita Reg", "email", email.toUpperCase(),
                        "password", "Passw0rdOK")))
                .andExpect(status().isConflict());
    }

    @Test
    void registrationEnforcesPasswordPolicy() throws Exception {
        mvc.perform(withBody(post("/api/auth/register"), Map.of("fullName", "Weak", "email", "weak-" + unique() + "@test.local",
                        "password", "onlyletters")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    void protectedEndpointRequiresValidJwt() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer not.a.jwt")).andExpect(status().isUnauthorized());

        String token = managerToken();
        mvc.perform(get("/api/auth/me").header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value(MANAGER_EMAIL));

        // tampered signature
        String tampered = token.substring(0, token.length() - 4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");
        mvc.perform(get("/api/auth/me").header("Authorization", bearer(tampered))).andExpect(status().isUnauthorized());
    }

    @Test
    void expiredWrongIssuerAndNonAccessTokensAreRejected() throws Exception {
        Instant now = Instant.now();
        mvc.perform(get("/api/auth/me").header("Authorization", bearer(sign("1", props.jwt().issuer(), "access",
                now.minusSeconds(3600), now.minusSeconds(1800))))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header("Authorization", bearer(sign("1", "someone-else", "access",
                now, now.plusSeconds(600))))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header("Authorization", bearer(sign("1", props.jwt().issuer(), "refresh",
                now, now.plusSeconds(600))))).andExpect(status().isUnauthorized());
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() throws Exception {
        var otherKey = new javax.crypto.spec.SecretKeySpec(
                "another-secret-another-secret-another-secret".getBytes(), "HmacSHA256");
        var otherEncoder = new org.springframework.security.oauth2.jwt.NimbusJwtEncoder(
                new com.nimbusds.jose.jwk.source.ImmutableSecret<>(otherKey));
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(props.jwt().issuer()).subject("1").issuedAt(now)
                .expiresAt(now.plusSeconds(600)).claim("role", "STORE_MANAGER").claim("typ", "access").build();
        String forged = otherEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        mvc.perform(get("/api/auth/me").header("Authorization", bearer(forged))).andExpect(status().isUnauthorized());
    }

    @Test
    void refreshRotatesTokenAndReuseRevokesTheFamily() throws Exception {
        Customer c = registerCustomer();
        MvcResult login = mvc.perform(withBody(post("/api/auth/login"),
                Map.of("email", c.email(), "password", "Passw0rdOK"))).andExpect(status().isOk()).andReturn();
        Cookie first = login.getResponse().getCookie("refresh_token");
        assertThat(first).isNotNull();

        MvcResult refreshed = mvc.perform(post("/api/auth/refresh").cookie(first).header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();
        Cookie second = refreshed.getResponse().getCookie("refresh_token");
        assertThat(second).isNotNull();
        assertThat(second.getValue()).isNotEqualTo(first.getValue());

        // replaying the old token = reuse -> 401 and the whole family is revoked
        mvc.perform(post("/api/auth/refresh").cookie(first).header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").cookie(second).header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshRequiresCsrfHeaderAndCookie() throws Exception {
        mvc.perform(post("/api/auth/refresh")).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/refresh").header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRevokesRefreshToken() throws Exception {
        Customer c = registerCustomer();
        MvcResult login = mvc.perform(withBody(post("/api/auth/login"),
                Map.of("email", c.email(), "password", "Passw0rdOK"))).andReturn();
        Cookie cookie = login.getResponse().getCookie("refresh_token");
        mvc.perform(post("/api/auth/logout").cookie(cookie).header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("refresh_token", 0));
        mvc.perform(post("/api/auth/refresh").cookie(cookie).header("X-Requested-With", "XMLHttpRequest"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void repeatedFailedLoginsAreRateLimited() throws Exception {
        String email = "victim-" + unique() + "@test.local";
        for (int i = 0; i < 5; i++) {
            mvc.perform(withBody(post("/api/auth/login"), Map.of("email", email, "password", "bad-password")))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(withBody(post("/api/auth/login"), Map.of("email", email, "password", "bad-password")))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"));
    }

    private String sign(String subject, String issuer, String typ, Instant issuedAt, Instant expiresAt) {
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(issuer).subject(subject).issuedAt(issuedAt)
                .expiresAt(expiresAt).claim("role", "STORE_MANAGER").claim("typ", typ).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
