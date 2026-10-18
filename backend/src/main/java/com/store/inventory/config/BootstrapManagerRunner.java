package com.store.inventory.config;

import com.store.inventory.user.Role;
import com.store.inventory.user.User;
import com.store.inventory.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Provisions the first store manager from MANAGER_EMAIL / MANAGER_PASSWORD at startup. There is deliberately no
 * public endpoint for creating managers. The account is only created if it does not exist yet.
 */
@Component
public class BootstrapManagerRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapManagerRunner.class);
    private static final int MIN_PASSWORD_LENGTH = 12;

    private final AppProperties props;
    private final UserRepository users;
    private final PasswordEncoder encoder;

    public BootstrapManagerRunner(AppProperties props, UserRepository users, PasswordEncoder encoder) {
        this.props = props;
        this.users = users;
        this.encoder = encoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        String email = props.bootstrap().managerEmail();
        String password = props.bootstrap().managerPassword();
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.info("No MANAGER_EMAIL/MANAGER_PASSWORD configured; skipping manager bootstrap");
            return;
        }
        if (password.length() < MIN_PASSWORD_LENGTH || password.length() > 72) {
            throw new IllegalStateException("MANAGER_PASSWORD must be between " + MIN_PASSWORD_LENGTH + " and 72 characters");
        }
        String normalized = email.trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(normalized)) {
            log.info("Bootstrap manager {} already exists; nothing to do", normalized);
            return;
        }
        User u = new User();
        u.setEmail(normalized);
        u.setFullName(props.bootstrap().managerName());
        u.setPasswordHash(encoder.encode(password));
        u.setRole(Role.STORE_MANAGER);
        users.save(u);
        log.info("Bootstrap store manager created: {}", normalized);
    }
}
