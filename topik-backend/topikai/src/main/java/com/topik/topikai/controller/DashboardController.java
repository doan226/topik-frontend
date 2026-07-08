package com.topik.topikai.controller;

import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.service.GeminiService;
import com.topik.topikai.service.LearnerProfileService;
import com.topik.topikai.service.UsageQuotaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private UsageQuotaService usageQuotaService;

    @Autowired
    private LearnerProfileService learnerProfileService;

    @GetMapping("/quota/{userId}")
    public ResponseEntity<Map<String, Object>> getQuota(@PathVariable Long userId) {
        SecurityUtils.assertUserAccess(userId);
        return ResponseEntity.ok(usageQuotaService.getQuotaInfo(userId));
    }

    @GetMapping("/learning-path/{userId}")
    public ResponseEntity<Map<String, Object>> getLearningPath(@PathVariable Long userId) {
        SecurityUtils.assertUserAccess(userId);
        return ResponseEntity.ok(learnerProfileService.getLearningPath(userId));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserHistory(@PathVariable Long userId) {
        SecurityUtils.assertUserAccess(userId);
        try {
            String sql = "SELECT id, question_number, content, ai_feedback_json, score, created_at " +
                    "FROM user_answer WHERE user_id = ? ORDER BY created_at DESC";

            List<Map<String, Object>> rawHistory = jdbcTemplate.queryForList(sql, userId);

            List<Map<String, Object>> processedHistory = new ArrayList<>();
            int count51 = 0, count52 = 0, count53 = 0, count54 = 0;

            for (Map<String, Object> record : rawHistory) {
                int qNum = ((Number) record.get("question_number")).intValue();

                if (qNum == 51 && count51 < 10) { processedHistory.add(record); count51++; }
                else if (qNum == 52 && count52 < 10) { processedHistory.add(record); count52++; }
                else if (qNum == 53 && count53 < 10) { processedHistory.add(record); count53++; }
                else if (qNum == 54 && count54 < 10) { processedHistory.add(record); count54++; }
            }

            Collections.reverse(processedHistory);
            return ResponseEntity.ok(processedHistory);

        } catch (Exception e) {
            System.err.println("🔴 LỖI TRUY XUẤT DASHBOARD: " + e.getMessage());
            return ResponseEntity.badRequest().body("Lỗi truy xuất dữ liệu: " + e.getMessage());
        }
    }

    @PostMapping("/generate-test")
    public ResponseEntity<?> generateTest(@RequestBody Map<String, Object> payload) {
        try {
            String errorHistory = (String) payload.get("errorHistory");
            Long userId = SecurityUtils.requireCurrentUserId();

            if (!usageQuotaService.canGenerateMiniTest(userId)) {
                return ResponseEntity.ok(Map.of(
                        "quotaExceeded", true,
                        "main_weakness", "Hết lượt mini-test",
                        "analysis", "FREE: 1 mini-test/tuần. Nâng cấp PREMIUM để không giới hạn.",
                        "mini_test", Collections.emptyList()
                ));
            }

            String testJson = geminiService.analyzeErrorsAndGenerateTest(errorHistory);

            usageQuotaService.logMiniTest(userId);

            return ResponseEntity.ok(testJson);
        } catch (Exception e) {
            System.err.println("🔴 LỖI TẠO BÀI TẬP: " + e.getMessage());
            return ResponseEntity.badRequest().body("Lỗi tạo bài tập: " + e.getMessage());
        }
    }
}
