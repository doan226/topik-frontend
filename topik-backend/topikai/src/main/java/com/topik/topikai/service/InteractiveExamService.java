package com.topik.topikai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.entity.ExamQuestion;
import com.topik.topikai.entity.ExamSubmission;
import com.topik.topikai.repository.ExamQuestionRepository;
import com.topik.topikai.repository.ExamSubmissionRepository;
import com.topik.topikai.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class InteractiveExamService {

    @Autowired
    private ExamQuestionRepository questionRepository;

    @Autowired
    private ExamSubmissionRepository submissionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private UsageQuotaService usageQuotaService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Map<String, Object>> listQuestions(String section, String examId, Long userId) {
        List<ExamQuestion> questions = examId == null || examId.isBlank()
                ? questionRepository.findBySectionOrderBySortOrderAsc(section)
                : questionRepository.findByExamIdAndSectionOrderBySortOrderAsc(examId, section);

        return questions.stream()
                .map(this::toQuestionDto)
                .toList();
    }

    @Transactional
    public Map<String, Object> submit(Long userId, Map<String, Object> body) {
        Long questionId = longVal(body.get("questionId"));
        String userAnswer = str(body.get("userAnswer"));
        if (questionId == null || userAnswer.isBlank()) {
            return Map.of("success", false, "message", "Thiếu questionId hoặc userAnswer");
        }
        ExamQuestion q = questionRepository.findById(questionId).orElse(null);
        if (q == null) {
            return Map.of("success", false, "message", "Không tìm thấy câu hỏi");
        }
        boolean correct = userAnswer.trim().equalsIgnoreCase(q.getCorrectAns().trim());

        ExamSubmission sub = new ExamSubmission();
        sub.setUserId(userId);
        sub.setQuestionId(questionId);
        sub.setUserAnswer(userAnswer);
        sub.setIsCorrect(correct);
        submissionRepository.save(sub);

        return Map.of(
                "success", true,
                "isCorrect", correct,
                "correctAnswer", q.getCorrectAns()
        );
    }

    public Map<String, Object> aiExplain(Long userId, Map<String, Object> body) {
        String jsonExplain = str(body.get("explanationVi"));
        if (!jsonExplain.isBlank()) {
            return Map.of(
                    "success", true,
                    "explanation", jsonExplain,
                    "source", "json"
            );
        }

        if (userId != null && !usageQuotaService.canAiExplain(userId)) {
            int limit = usageQuotaService.getAiExplainLimit(userId);
            return Map.of(
                    "success", false,
                    "quotaExceeded", true,
                    "message", "Đã hết " + limit + " lượt giải thích AI hôm nay."
            );
        }

        String passage = str(body.get("passage"));
        String question = str(body.get("question"));
        String userAnswer = str(body.get("userAnswer"));
        String correctAnswer = str(body.get("correctAnswer"));
        String distractorNotes = str(body.get("distractorNotes"));

        String prompt = "Bạn là giáo viên TOPIK. Giải thích ngắn gọn bằng tiếng Việt tại sao đáp án đúng là "
                + correctAnswer + " và vì sao học viên chọn " + userAnswer + ".\n"
                + "Đoạn văn: " + passage + "\nCâu hỏi: " + question;
        if (!distractorNotes.isBlank()) {
            prompt += "\nGợi ý phân tích đáp án: " + distractorNotes;
        }

        String raw = geminiService.gradeTopikWriting(prompt, 52);
        if (userId != null) {
            usageQuotaService.consumeAiExplain(userId);
        }
        return Map.of("success", true, "explanation", raw, "source", "gemini");
    }

    public Map<String, Object> getProgress(Long userId, String examId) {
        List<Object[]> rows = examId == null || examId.isBlank()
                ? submissionRepository.aggregateProgressByUser(userId)
                : submissionRepository.aggregateProgressByUserAndExam(userId, examId);

        Map<String, Map<String, Object>> examMap = new LinkedHashMap<>();
        List<Map<String, Object>> recentSessions = new ArrayList<>();

        for (Object[] row : rows) {
            String eid = str(row[0]);
            String section = str(row[1]);
            long answered = row[2] != null ? ((Number) row[2]).longValue() : 0;
            long correct = row[3] != null ? ((Number) row[3]).longValue() : 0;
            String lastAt = row[4] != null ? String.valueOf(row[4]) : null;
            long total = questionTotal(eid, section);

            Map<String, Object> sectionProgress = sectionProgressMap(answered, correct, total, lastAt);

            examMap.computeIfAbsent(eid, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("examId", eid);
                m.put("listening", emptySectionProgress());
                m.put("reading", emptySectionProgress());
                return m;
            });

            if ("listening".equals(section)) {
                examMap.get(eid).put("listening", sectionProgress);
            } else if ("reading".equals(section)) {
                examMap.get(eid).put("reading", sectionProgress);
            }

            Map<String, Object> session = new LinkedHashMap<>();
            session.put("examId", eid);
            session.put("section", section);
            session.put("answered", answered);
            session.put("correct", correct);
            session.put("total", total);
            session.put("lastAt", lastAt);
            recentSessions.add(session);
        }

        return Map.of(
                "success", true,
                "exams", new ArrayList<>(examMap.values()),
                "recentSessions", recentSessions.stream().limit(20).toList()
        );
    }

    private long questionTotal(String examId, String section) {
        if (examId.isBlank() || section.isBlank()) return 50;
        long count = questionRepository.countByExamIdAndSection(examId, section);
        return count > 0 ? count : 50;
    }

    private static Map<String, Object> emptySectionProgress() {
        return sectionProgressMap(0, 0, 50, null);
    }

    private static Map<String, Object> sectionProgressMap(long answered, long correct, long total, String lastAt) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("answered", answered);
        m.put("correct", correct);
        m.put("total", total);
        m.put("lastAt", lastAt);
        return m;
    }

    private Map<String, Object> toQuestionDto(ExamQuestion q) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", q.getId());
        m.put("exam_id", q.getExamId());
        m.put("section", q.getSection());
        m.put("question_no", q.getQuestionNo());
        m.put("correct_ans", q.getCorrectAns());
        m.put("tier", q.getTier());
        try {
            m.put("content_json", objectMapper.readValue(q.getContentJson(), new TypeReference<Map<String, Object>>() {}));
        } catch (Exception e) {
            m.put("content_json", Map.of());
        }
        return m;
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private static Long longVal(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(o));
        } catch (Exception e) {
            return null;
        }
    }
}
