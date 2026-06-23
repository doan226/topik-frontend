package com.topik.topikai.controller;

import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/premium-features")
public class PremiumController {

    // Đây là API giả lập tính năng Chấm điểm TOPIK bằng AI (Chỉ PREMIUM mới gọi được)
    @GetMapping("/ai-scoring")
    public Map<String, Object> accessPremiumFeature() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "✨ Chào mừng VIP! AI đang phân tích và chấm điểm bài viết TOPIK của bạn...");
        return response;
    }
}
