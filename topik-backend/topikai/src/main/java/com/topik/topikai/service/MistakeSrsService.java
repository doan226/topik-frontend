package com.topik.topikai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.entity.FsrsCard;
import com.topik.topikai.entity.FsrsReview;
import com.topik.topikai.repository.FsrsCardRepository;
import com.topik.topikai.repository.FsrsReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
public class MistakeSrsService {

    public static final String SOURCE_WRITING_MISTAKE = "writing_mistake";

    @Autowired
    private FsrsCardRepository cardRepository;

    @Autowired
    private FsrsReviewRepository reviewRepository;

    @Autowired
    private FsrsSchedulerService scheduler;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public void ensureMistakeCardsFromJson(Long userId, String aiFeedbackJson, int questionType) {
        if (userId == null || aiFeedbackJson == null || aiFeedbackJson.isBlank()) {
            return;
        }
        try {
            Map<String, Object> ai = objectMapper.readValue(aiFeedbackJson, new TypeReference<>() {});
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> errors = (List<Map<String, Object>>) ai.get("grammar_errors");
            if (errors == null || errors.isEmpty()) {
                return;
            }
            ensureMistakeCards(userId, errors, questionType);
        } catch (Exception e) {
            System.err.println("MistakeSrsService: failed to parse grammar_errors: " + e.getMessage());
        }
    }

    @Transactional
    public void ensureMistakeCards(Long userId, List<Map<String, Object>> grammarErrors, int questionType) {
        if (userId == null || grammarErrors == null) {
            return;
        }
        long now = System.currentTimeMillis();
        for (Map<String, Object> err : grammarErrors) {
            String wrong = str(err.get("sai"));
            String correct = str(err.get("đúng"));
            if (wrong.isBlank() || correct.isBlank()) {
                continue;
            }
            String reasonVi = str(err.get("lý_do"));
            String patternId = str(err.get("patternId"));
            String externalRef = mistakeExternalRef(wrong, correct);

            Optional<FsrsCard> existing = cardRepository.findByUserIdAndExternalRef(userId, externalRef);
            if (existing.isPresent()) {
                FsrsCard card = existing.get();
                card.setMeaning(buildMeaningJson(correct, reasonVi));
                if (!patternId.isBlank()) {
                    card.setSpecialty(buildSpecialty(questionType, patternId));
                }
                cardRepository.save(card);
                continue;
            }

            FsrsCard card = new FsrsCard();
            card.setUserId(userId);
            card.setWord(wrong);
            card.setMeaning(buildMeaningJson(correct, reasonVi));
            card.setSource(SOURCE_WRITING_MISTAKE);
            card.setExternalRef(externalRef);
            card.setSpecialty(buildSpecialty(questionType, patternId));
            card.setDue(now);
            card.setStability(0.0);
            card.setDifficulty(0.0);
            cardRepository.save(card);
        }
    }

    public List<Map<String, Object>> listMistakeCards(Long userId, boolean dueOnly) {
        long now = System.currentTimeMillis();
        List<FsrsCard> cards = dueOnly
                ? cardRepository.findByUserIdAndSourceAndDueLessThanEqualOrderByDueAsc(userId, SOURCE_WRITING_MISTAKE, now)
                : cardRepository.findByUserIdAndSourceOrderByDueAsc(userId, SOURCE_WRITING_MISTAKE);
        return cards.stream().map(this::toMistakeDto).toList();
    }

    public long countDueMistakes(Long userId) {
        return cardRepository.countByUserIdAndSourceAndDueLessThanEqual(
                userId, SOURCE_WRITING_MISTAKE, System.currentTimeMillis());
    }

    @Transactional
    public Map<String, Object> submitReview(Long userId, Long cardId, int rating) {
        if (rating < 1 || rating > 4) {
            return Map.of("success", false, "message", "Rating phải từ 1 đến 4.");
        }
        Optional<FsrsCard> opt = cardRepository.findByIdAndUserId(cardId, userId);
        if (opt.isEmpty() || !SOURCE_WRITING_MISTAKE.equals(opt.get().getSource())) {
            return Map.of("success", false, "message", "Không tìm thấy thẻ lỗi.");
        }

        FsrsCard card = opt.get();
        long now = System.currentTimeMillis();
        int prevState = reviewRepository.findFirstByCardIdOrderByReviewTimeDesc(cardId)
                .map(r -> r.getReviewState() != null ? r.getReviewState() : FsrsSchedulerService.STATE_NEW)
                .orElse(FsrsSchedulerService.STATE_NEW);

        FsrsSchedulerService.ScheduleResult next = scheduler.scheduleReview(
                card.getStability() != null ? card.getStability() : 0,
                card.getDifficulty() != null ? card.getDifficulty() : 0,
                card.getDue() != null ? card.getDue() : now,
                prevState,
                rating,
                now
        );

        FsrsReview review = new FsrsReview();
        review.setCardId(cardId);
        review.setReviewTime(now);
        review.setReviewRating(rating);
        review.setReviewState(next.state());
        review.setStability(next.stability());
        review.setDifficulty(next.difficulty());
        review.setDue(next.dueMs());
        reviewRepository.save(review);

        card.setStability(next.stability());
        card.setDifficulty(next.difficulty());
        card.setDue(next.dueMs());
        cardRepository.save(card);

        return Map.of(
                "success", true,
                "next_review_at", java.time.Instant.ofEpochMilli(next.dueMs()).toString()
        );
    }

    @Transactional
    public Map<String, Object> syncFromLocal(Long userId, List<Map<String, Object>> entries) {
        int synced = 0;
        if (entries == null) {
            return Map.of("success", true, "synced", 0);
        }
        for (Map<String, Object> entry : entries) {
            String wrong = str(entry.get("wrong"));
            if (wrong.isBlank()) {
                wrong = str(entry.get("sai"));
            }
            String correct = str(entry.get("correct"));
            if (correct.isBlank()) {
                correct = str(entry.get("đúng"));
            }
            if (wrong.isBlank() || correct.isBlank()) {
                continue;
            }
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("sai", wrong);
            err.put("đúng", correct);
            err.put("lý_do", str(entry.get("reasonVi")));
            err.put("patternId", str(entry.get("patternId")));
            Integer qType = intVal(entry.get("questionType"));
            ensureMistakeCards(userId, List.of(err), qType != null ? qType : 51);
            synced++;
        }
        return Map.of("success", true, "synced", synced);
    }

    public static String mistakeExternalRef(String wrong, String correct) {
        return "mistake:" + sha1Hex(wrong + "\u2192" + correct);
    }

    private Map<String, Object> toMistakeDto(FsrsCard card) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", card.getId());
        m.put("wrong", card.getWord());
        parseMeaning(card.getMeaning()).forEach(m::putIfAbsent);
        m.put("questionType", parseQuestionType(card.getSpecialty()));
        m.put("patternId", parsePatternId(card.getSpecialty()));
        m.put("due", card.getDue());
        m.put("isDue", card.getDue() != null && card.getDue() <= System.currentTimeMillis());
        m.put("externalRef", card.getExternalRef());
        return m;
    }

    private Map<String, Object> parseMeaning(String meaningJson) {
        Map<String, Object> out = new LinkedHashMap<>();
        try {
            Map<String, Object> parsed = objectMapper.readValue(meaningJson, new TypeReference<>() {});
            out.put("correct", parsed.getOrDefault("correct", ""));
            out.put("reasonVi", parsed.getOrDefault("reasonVi", ""));
        } catch (Exception e) {
            out.put("correct", meaningJson != null ? meaningJson : "");
            out.put("reasonVi", "");
        }
        return out;
    }

    private String buildMeaningJson(String correct, String reasonVi) {
        try {
            Map<String, String> m = Map.of(
                    "correct", correct != null ? correct : "",
                    "reasonVi", reasonVi != null ? reasonVi : ""
            );
            return objectMapper.writeValueAsString(m);
        } catch (Exception e) {
            return "{\"correct\":\"" + correct + "\",\"reasonVi\":\"" + reasonVi + "\"}";
        }
    }

    private String buildSpecialty(int questionType, String patternId) {
        if (patternId != null && !patternId.isBlank()) {
            return "q" + questionType + ":" + patternId;
        }
        return "q" + questionType;
    }

    private int parseQuestionType(String specialty) {
        if (specialty == null || !specialty.startsWith("q")) {
            return 51;
        }
        try {
            int colon = specialty.indexOf(':');
            String num = colon > 0 ? specialty.substring(1, colon) : specialty.substring(1);
            return Integer.parseInt(num);
        } catch (Exception e) {
            return 51;
        }
    }

    private String parsePatternId(String specialty) {
        if (specialty == null) {
            return null;
        }
        int colon = specialty.indexOf(':');
        return colon > 0 ? specialty.substring(colon + 1) : null;
    }

    private static String sha1Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return Integer.toHexString(input.hashCode());
        }
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private static Integer intVal(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(o));
        } catch (Exception e) {
            return null;
        }
    }
}
