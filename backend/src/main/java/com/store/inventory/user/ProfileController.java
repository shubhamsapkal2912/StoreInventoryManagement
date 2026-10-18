package com.store.inventory.user;

import com.store.inventory.user.ProfileService.ChangePasswordRequest;
import com.store.inventory.user.ProfileService.UpdateProfileRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService service;

    public ProfileController(ProfileService service) {
        this.service = service;
    }

    @GetMapping
    public UserDto get(@AuthenticationPrincipal Jwt jwt) {
        return service.get(Long.valueOf(jwt.getSubject()));
    }

    @PutMapping
    public UserDto update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest req) {
        return service.update(Long.valueOf(jwt.getSubject()), req);
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal Jwt jwt,
                                               @Valid @RequestBody ChangePasswordRequest req) {
        service.changePassword(Long.valueOf(jwt.getSubject()), req);
        return ResponseEntity.noContent().build();
    }
}
