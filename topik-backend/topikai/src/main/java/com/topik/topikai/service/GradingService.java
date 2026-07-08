package com.topik.topikai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.topik.topikai.dto.GradingContext;
import com.topik.topikai.dto.SubmitRequest;
import com.topik.topikai.entity.User;
import com.topik.topikai.entity.UserAnswer;
import com.topik.topikai.repository.UserAnswerRepository;
import com.topik.topikai.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Điểm vào (orchestration) duy nhất cho việc chấm điểm: quota -> pre-validate ->
 * gọi Gemini (đã throttle) -> validate -> lưu kết quả.
 *
 * <p>Tách khỏi controller để Giai đoạn 2 (async) chỉ cần thay phần thân bằng việc
 * đẩy job vào hàng đợi mà không phải sửa controller hay GeminiService.
 */
@Service
public class GradingService {

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

    @Autowired
    private MistakeSrsService mistakeSrsService;

    @Autowired
    private LearnerProfileService learnerProfileService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Mỗi user chỉ được chấm 1 bài tại một thời điểm. Chặn double-click/spam gửi nhiều
     * request song song -> tránh vượt hạn mức (race condition giữa canGrade và save) và
     * tránh 1 user chiếm nhiều "vé" Gemini cùng lúc, gây thiệt cho user khác khi quá tải.
     */
    private static final Set<Long> GRADING_IN_FLIGHT = ConcurrentHashMap.newKeySet();

    public ResponseEntity<?> grade(SubmitRequest request, Long userId) {
        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy người dùng"));
        }

        if (!GRADING_IN_FLIGHT.add(userId)) {
            Map<String, Object> busy = new HashMap<>();
            busy.put("apiError", true);
            busy.put("total_score", 0);
            busy.put("native_suggestion",
                    "Bạn đang có một bài đang được chấm. Vui lòng đợi kết quả rồi thử lại. Lượt chấm không bị trừ.");
            return ResponseEntity.ok(busy);
        }

        try {
            return doGrade(request, userId);
        } finally {
            GRADING_IN_FLIGHT.remove(userId);
        }
    }

    private ResponseEntity<?> doGrade(SubmitRequest request, Long userId) {
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
            if (request.getQuestionId() != null) {
                answer.setExternalQuestionId(String.valueOf(request.getQuestionId()));
            }
            if (request.getTopikSession() != null) {
                answer.setTopikSession(request.getTopikSession());
            }
            answer.setRewriteVersion(request.getRewriteVersion() != null ? request.getRewriteVersion() : 1);
            answer.setParentAnswerId(request.getParentAnswerId());

            userAnswerRepository.save(answer);

            mistakeSrsService.ensureMistakeCardsFromJson(userId, cleanJson, request.getQuestionNumber());
            learnerProfileService.invalidateCache(userId);

            if (jsonObject instanceof ObjectNode objectNode) {
                objectNode.put("answerId", answer.getId());
                return ResponseEntity.ok(objectMapper.writeValueAsString(objectNode));
            }
            return ResponseEntity.ok(cleanJson);

        } catch (Exception e) {
            System.err.println("Lỗi bóc tách điểm: " + e.getMessage());
            return ResponseEntity.ok("{\"total_score\": 0, \"criteria_scores\": {}, \"grammar_errors\": [], \"content_issues\": [], \"native_suggestion\": \"Lỗi bóc tách điểm.\"}");
        }
    }
}
