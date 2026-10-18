package com.store.inventory.user;

import com.store.inventory.exception.ApiException;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

    public record UpdateProfileRequest(@NotBlank @Size(max = 120) String fullName,
                                       @Size(max = 30) String phone,
                                       @Size(max = 500) String address) {}

    public record ChangePasswordRequest(@NotBlank String currentPassword,
                                        @NotBlank @Size(min = 8, max = 72) String newPassword) {}

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public ProfileService(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Transactional(readOnly = true)
    public UserDto get(Long userId) {
        return UserDto.from(load(userId));
    }

    @Transactional
    public UserDto update(Long userId, UpdateProfileRequest req) {
        User u = load(userId);
        u.setFullName(req.fullName().trim());
        u.setPhone(blankToNull(req.phone()));
        u.setAddress(blankToNull(req.address()));
        return UserDto.from(u);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest req) {
        User u = load(userId);
        if (!encoder.matches(req.currentPassword(), u.getPasswordHash())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        u.setPasswordHash(encoder.encode(req.newPassword()));
    }

    private User load(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
