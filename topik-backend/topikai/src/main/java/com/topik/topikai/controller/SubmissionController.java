package com.topik.topikai.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.dto.GradingContext;
import com.topik.topikai.dto.SubmitRequest;
import com.topik.topikai.entity.User;
import com.topik.topikai.entity.UserAnswer;
import com.topik.topikai.repository.UserAnswerRepository;
import com.topik.topikai.repository.UserRepository;
import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.service.EntitlementService;
import com.topik.topikai.service.GeminiService;
import com.topik.topikai.service.GradingScoreValidator;
import com.topik.topikai.service.PreGradingValidator;
import com.topik.topikai.service.UsageQuotaService;
import com.topik.topikai.service.WritingQuestionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/topik")
public class SubmissionController {

    @Autowired
    private GeminiService aiService;

    @Autowired
    private UserAnswerRepository userAnswerRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UsageQuotaService usageQuotaService;

    @Autowired
    private WritingQuestionService writingQuestionService;

    @Autowired
    private GradingScoreValidator gradingScoreValidator;

    @Autowired
    private PreGradingValidator preGradingValidator;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/submit")
    public ResponseEntity<?> submitWriting(@RequestBody SubmitRequest request) {
        Long userId = SecurityUtils.requireCurrentUserId();

        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy người dùng"));
        }

        User user = userOptional.get();
        boolean hasWriting = usageQuotaService.isPremium(userId);

        if (request.getQuestionNumber() == 54 && !hasWriting) {
            Map<String, Object> denied = new HashMap<>();
            denied.put("quotaExceeded", true);
            denied.put("total_score", 0);
            denied.put("native_suggestion", "Câu 54 cần gói Viết. Vui lòng nâng cấp tài khoản.");
            return ResponseEntity.ok(denied);
        }

        if (!usageQuotaService.canGrade(userId)) {
            Map<String, Object> denied = new HashMap<>();
            denied.put("quotaExceeded", true);
            denied.put("total_score", 0);
            int limit = usageQuotaService.getQuotaInfo(userId).get("gradingLimitDaily") instanceof Number n
                    ? n.intValue() : EntitlementService.FREE_DAILY_GRADING;
            denied.put("native_suggestion", "Đã hết " + limit + " lượt chấm AI hôm nay. Nâng cấp gói Viết để tăng lượt.");
            return ResponseEntity.ok(denied);
        }

        GradingContext context = writingQuestionService.resolveGradingContext(request);
        Map<String, Object> preValidation = preGradingValidator.validate(context);
        GradingContext gradingContext = context.withPreValidation(preValidation);
        String aiResult = aiService.gradeTopikWriting(gradingContext);

        try {
            String cleanJson = gradingScoreValidator.validateAndNormalize(
                    aiResult, gradingContext.getMaxScore(), preValidation);
            JsonNode jsonObject = objectMapper.readTree(cleanJson);

            if (jsonObject.path("apiError").asBoolean(false)) {
                return ResponseEntity.ok(cleanJson);
            }

            int totalScore = jsonObject.path("total_score").asInt(0);

            UserAnswer answer = new UserAnswer();
            answer.setUserId(userId);
            answer.setQuestionNumber(request.getQuestionNumber());
            answer.setContent(request.getContent());
            answer.setAiFeedbackJson(cleanJson);
            answer.setScore(totalScore);

            userAnswerRepository.save(answer);

            return ResponseEntity.ok(cleanJson);

        } catch (Exception e) {
            System.err.println("Lỗi bóc tách điểm: " + e.getMessage());
            return ResponseEntity.ok("{\"total_score\": 0, \"criteria_scores\": {}, \"grammar_errors\": [], \"content_issues\": [], \"native_suggestion\": \"Lỗi bóc tách điểm.\"}");
        }
    }
}
