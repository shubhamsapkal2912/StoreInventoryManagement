package com.store.inventory.security;

import com.store.inventory.config.AppProperties;
import com.store.inventory.exception.TooManyRequestsException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * In-memory brute-force protection: failed logins are counted per (client IP + email) and per client IP.
 * Single-instance only; behind multiple replicas also rate-limit at the gateway/WAF (see README).
 */
@Component
public class LoginRateLimiter {

    private static final int IP_MULTIPLIER = 5;

    private record Window(int count, Instant start) {}

    private final Map<String, Window> failures = new ConcurrentHashMap<>();
    private final int maxAttempts;
    private final Duration window;

    public LoginRateLimiter(AppProperties props) {
        this.maxAttempts = props.login().maxAttempts();
        this.window = props.login().window();
    }

    public void check(String ip, String email) {
        verify(accountKey(ip, email), maxAttempts);
        verify(ipKey(ip), maxAttempts * IP_MULTIPLIER);
    }

    public void recordFailure(String ip, String email) {
        bump(accountKey(ip, email));
        bump(ipKey(ip));
    }

    public void reset(String ip, String email) {
        failures.remove(accountKey(ip, email));
    }

    @Scheduled(fixedDelayString = "PT5M")
    void purge() {
        Instant cutoff = Instant.now().minus(window);
        failures.entrySet().removeIf(e -> e.getValue().start().isBefore(cutoff));
    }

    private void verify(String key, int limit) {
        Window w = failures.get(key);
        if (w == null) {
            return;
        }
        Instant end = w.start().plus(window);
        Instant now = Instant.now();
        if (now.isAfter(end)) {
            failures.remove(key, w);
        } else if (w.count() >= limit) {
            throw new TooManyRequestsException("Too many failed login attempts. Try again later.",
                    Math.max(1, Duration.between(now, end).toSeconds()));
        }
    }

    private void bump(String key) {
        Instant now = Instant.now();
        failures.merge(key, new Window(1, now), (old, ignored) ->
                now.isAfter(old.start().plus(window)) ? new Window(1, now) : new Window(old.count() + 1, old.start()));
    }

    private static String accountKey(String ip, String email) {
        return "a|" + ip + "|" + (email == null ? "" : email.trim().toLowerCase());
    }

    private static String ipKey(String ip) {
        return "i|" + ip;
    }
}
