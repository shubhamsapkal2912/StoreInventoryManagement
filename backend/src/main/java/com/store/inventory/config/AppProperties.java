package com.store.inventory.config;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, Refresh refresh, Cors cors, Login login, Bootstrap bootstrap) {

    public record Jwt(String secret, String issuer, Duration accessTokenTtl) {}

    public record Refresh(Duration ttl, String cookieName, boolean cookieSecure, String cookieSameSite) {}

    public record Cors(List<String> allowedOrigins) {}

    public record Login(int maxAttempts, Duration window) {}

    public record Bootstrap(String managerEmail, String managerPassword, String managerName) {}
}
