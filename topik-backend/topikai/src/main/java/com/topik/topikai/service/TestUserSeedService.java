package com.topik.topikai.service;

import com.topik.topikai.entity.Role;
import com.topik.topikai.entity.User;
import com.topik.topikai.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class TestUserSeedService {

    private static final String TEST_PASSWORD = "1";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public TestUserSeedService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> seedTestUsers() {
        User a = upsert("A", "a@test.topik.local", Role.FREE_USER);
        User a1 = upsertPremiumAlias();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("message", "Đã tạo/cập nhật A (FREE) và A1 (PREMIUM), mật khẩu: 1");
        result.put("users", Map.of(
                "A", userSummary(a),
                "A1", userSummary(a1)
        ));
        return result;
    }

    private User upsertPremiumAlias() {
        User user = userRepository.findByUsername("A1")
                .or(() -> userRepository.findByUsername("a1"))
                .orElseGet(User::new);
        user.setUsername("A1");
        user.setEmail("a1@test.topik.local");
        user.setPassword(passwordEncoder.encode(TEST_PASSWORD));
        user.setVerified(true);
        user.setVerificationCode(null);
        user.setRole(Role.PREMIUM_USER);
        user.setReminderEnabled(true);
        return userRepository.save(user);
    }

    private User upsert(String username, String email, Role role) {
        User user = userRepository.findByUsername(username).orElseGet(User::new);
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(TEST_PASSWORD));
        user.setVerified(true);
        user.setVerificationCode(null);
        user.setRole(role);
        user.setReminderEnabled(true);
        return userRepository.save(user);
    }

    private Map<String, Object> userSummary(User user) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("id", user.getId());
        summary.put("username", user.getUsername());
        summary.put("role", user.getRole().name());
        summary.put("verified", user.isVerified());
        return summary;
    }
}
