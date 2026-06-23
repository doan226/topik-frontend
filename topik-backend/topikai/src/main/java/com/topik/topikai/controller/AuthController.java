package com.topik.topikai.controller;

import com.topik.topikai.entity.Role;
import com.topik.topikai.entity.User;
import com.topik.topikai.repository.UserRepository;
import com.topik.topikai.security.JwtService;
import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.service.EmailService;
import com.topik.topikai.service.EntitlementService;
import com.topik.topikai.service.UsageQuotaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private EntitlementService entitlementService;

    @Autowired
    private UsageQuotaService usageQuotaService;

    @PostMapping("/register")
    public Map<String, Object> registerUser(@RequestBody AuthRequest request) {
        Map<String, Object> response = new HashMap<>();

        if (userRepository.existsByUsername(request.getUsername())) {
            response.put("success", false);
            response.put("message", "Tên đăng nhập đã tồn tại!");
            return response;
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            response.put("success", false);
            response.put("message", "Email này đã được sử dụng!");
            return response;
        }

        String code = String.valueOf((int)(Math.random() * 900000) + 100000);

        try {
            emailService.sendVerificationEmail(request.getEmail(), code);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi gửi email xác thực: " + e.getMessage());
            return response;
        }

        User newUser = new User();
        newUser.setUsername(request.getUsername());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setEmail(request.getEmail());
        newUser.setVerificationCode(code);
        newUser.setVerified(false);
        newUser.setRole(Role.FREE_USER);

        userRepository.save(newUser);

        response.put("success", true);
        response.put("message", "Đăng ký thành công! Vui lòng kiểm tra email.");
        return response;
    }

    @PostMapping("/login")
    public Map<String, Object> loginUser(@RequestBody AuthRequest request) {
        Map<String, Object> response = new HashMap<>();
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (!user.isVerified()) {
                response.put("success", false);
                response.put("message", "Tài khoản chưa xác thực email. Vui lòng nhập mã OTP.");
                return response;
            }
            if (passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                String token = jwtService.generateToken(user);
                response.put("success", true);
                response.put("message", "Đăng nhập thành công!");
                response.put("token", token);
                response.put("userId", user.getId());
                response.put("role", user.getRole().name());
                response.put("email", user.getEmail());
                response.put("username", user.getUsername());
                response.put("reminderEnabled", user.isReminderEnabled());
                int gradingUsed = usageQuotaService.countGradingToday(user.getId());
                response.putAll(entitlementService.buildEntitlementSnapshot(user.getId(), gradingUsed));
                return response;
            }
        }

        response.put("success", false);
        response.put("message", "Sai tên đăng nhập hoặc mật khẩu!");
        return response;
    }

    @PostMapping("/verify")
    public Map<String, Object> verifyUser(@RequestBody VerifyRequest request) {
        Map<String, Object> response = new HashMap<>();

        Optional<User> userOptional = userRepository.findByUsername(request.getUsername());

        if (userOptional.isEmpty()) {
            response.put("success", false);
            response.put("message", "Tài khoản không tồn tại trên hệ thống!");
            return response;
        }

        User user = userOptional.get();

        if (user.getVerificationCode() != null && user.getVerificationCode().equals(request.getCode())) {
            user.setVerified(true);
            user.setVerificationCode(null);
            userRepository.save(user);

            response.put("success", true);
            response.put("message", "Xác thực tài khoản thành công!");
        } else {
            response.put("success", false);
            response.put("message", "Mã xác thực không chính xác hoặc đã hết hạn!");
        }

        return response;
    }

    @PutMapping("/preferences/{userId}")
    public Map<String, Object> updatePreferences(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> body) {
        SecurityUtils.assertUserAccess(userId);

        Map<String, Object> response = new HashMap<>();
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "Không tìm thấy người dùng");
            return response;
        }
        User user = userOpt.get();
        if (body.containsKey("reminderEnabled")) {
            user.setReminderEnabled(Boolean.TRUE.equals(body.get("reminderEnabled")));
        }
        userRepository.save(user);
        response.put("success", true);
        response.put("reminderEnabled", user.isReminderEnabled());
        return response;
    }
}

class AuthRequest {
    private String username;
    private String password;
    private String email;

    public void setUsername(String username) { this.username = username; }
    public void setPassword(String password) { this.password = password; }
    public void setEmail(String email) { this.email = email; }

    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public String getEmail() { return email; }
}

class VerifyRequest {
    private String username;
    private String code;

    public void setUsername(String username) { this.username = username; }
    public void setCode(String code) { this.code = code; }

    public String getUsername() { return username; }
    public String getCode() { return code; }
}
