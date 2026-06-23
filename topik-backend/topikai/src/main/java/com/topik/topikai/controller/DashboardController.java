package com.topik.topikai.controller;

import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.service.GeminiService;
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

    @GetMapping("/quota/{userId}")
    public ResponseEntity<Map<String, Object>> getQuota(@PathVariable Long userId) {
        SecurityUtils.assertUserAccess(userId);
        return ResponseEntity.ok(usageQuotaService.getQuotaInfo(userId));
    }

    @GetMapping("/learning-path/{userId}")
    public ResponseEntity<Map<String, Object>> getLearningPath(@PathVariable Long userId) {
        SecurityUtils.assertUserAccess(userId);
        Map<String, Object> path = new HashMap<>();
        try {
            String sql = "SELECT question_number, AVG(score) as avg_score, COUNT(*) as cnt " +
                    "FROM user_answer WHERE user_id = ? GROUP BY question_number";
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, userId);

            int weakest = 51;
            double lowestAvg = 999;
            int totalSubmissions = 0;

            Map<Integer, Integer> goals = new HashMap<>();
            goals.put(51, 0);
            goals.put(52, 0);
            goals.put(53, 0);
            goals.put(54, 0);

            for (Map<String, Object> row : rows) {
                int qNum = ((Number) row.get("question_number")).intValue();
                double avg = row.get("avg_score") != null ? ((Number) row.get("avg_score")).doubleValue() : 0;
                int cnt = ((Number) row.get("cnt")).intValue();
                totalSubmissions += cnt;
                goals.put(qNum, cnt);

                if (avg < lowestAvg) {
                    lowestAvg = avg;
                    weakest = qNum;
                }
            }

            int targetPerQuestion = 3;
            Map<String, Object> progress = new HashMap<>();
            for (int q : new int[]{51, 52, 53, 54}) {
                int done = goals.getOrDefault(q, 0);
                Map<String, Object> item = new HashMap<>();
                item.put("done", done);
                item.put("target", targetPerQuestion);
                item.put("percent", Math.min(100, (done * 100) / targetPerQuestion));
                progress.put("q" + q, item);
            }

            path.put("weakestQuestion", weakest);
            path.put("recommendation", "Tuần này nên ôn Câu " + weakest + " — điểm trung bình thấp nhất.");
            path.put("totalSubmissions", totalSubmissions);
            path.put("weeklyGoal", "Hoàn thành 3 bài mỗi dạng câu trước kỳ thi");
            path.put("progress", progress);
        } catch (Exception e) {
            path.put("weakestQuestion", 51);
            path.put("recommendation", "Bắt đầu với Câu 51 — làm 3 bài để tích lũy dữ liệu.");
            path.put("progress", Collections.emptyMap());
        }
        return ResponseEntity.ok(path);
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
