package com.topik.topikai.controller;

import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.entity.User;
import com.topik.topikai.service.EntitlementService;
import com.topik.topikai.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/exams")
public class ExamController {

    @Autowired
    private EntitlementService entitlementService;

    @Autowired
    private UserRepository userRepository;

    // Frontend bây giờ chỉ cần gửi userId lên, ví dụ: /api/v1/exams/52?userId=1
    @GetMapping("/{examId}")
    public Map<String, Object> getExam(@PathVariable int examId, @RequestParam(required = false) Long userId) {
        Long resolvedUserId = SecurityUtils.requireCurrentUserId();
        if (userId != null) {
            SecurityUtils.assertUserAccess(userId);
        }
        userId = resolvedUserId;
        Map<String, Object> response = new HashMap<>();

        // Logic 1: Nhóm đề miễn phí (Đề 1 đến Đề 5) -> Cho phép tải luôn không cần check VIP
        if (examId >= 1 && examId <= 5) {
            response.put("success", true);
            response.put("message", "Đang tải nội dung Đề " + examId + "... Chúc bạn làm bài tốt!");
            return response;
        }

        // Logic 2: Nhóm đề nâng cấp (Đề 52)
        if (examId == 52) {
            // Chọc vào Database để lấy thông tin user thật
            Optional<User> userOptional = userRepository.findById(userId);

            if (userOptional.isPresent()) {
                User user = userOptional.get();
                // Kiểm tra bằng enum Role chuẩn xác
                if (entitlementService.hasWriting(userId)) {
                    response.put("success", true);
                    response.put("message", "Chào mừng! Đang tải nội dung Đề 52...");
                } else {
                    response.put("success", false);
                    response.put("message", "Đề 52 cần gói Viết. Vui lòng nâng cấp tài khoản.");
                }
            } else {
                response.put("success", false);
                response.put("message", "Không tìm thấy thông tin người dùng!");
            }
            return response;
        }

        // Nếu nhập sai số đề không tồn tại
        response.put("success", false);
        response.put("message", "Đề thi không tồn tại trên hệ thống!");
        return response;
    }
}