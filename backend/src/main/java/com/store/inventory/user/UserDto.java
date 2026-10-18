package com.store.inventory.user;

import java.time.Instant;

public record UserDto(Long id, String email, String fullName, String phone, String address, Role role,
                      Instant createdAt) {
    public static UserDto from(User u) {
        return new UserDto(u.getId(), u.getEmail(), u.getFullName(), u.getPhone(), u.getAddress(), u.getRole(),
                u.getCreatedAt());
    }
}
