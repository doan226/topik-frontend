package com.topik.topikai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.entity.FsrsCard;
import com.topik.topikai.entity.FsrsReview;
import com.topik.topikai.entity.Role;
import com.topik.topikai.entity.User;
import com.topik.topikai.repository.FsrsCardRepository;
import com.topik.topikai.repository.FsrsReviewRepository;
import com.topik.topikai.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class HanjaSrsService {

    @Autowired
    private FsrsCardRepository cardRepository;

    @Autowired
    private FsrsReviewRepository reviewRepository;

    @Autowired
    private EntitlementService entitlementService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FsrsSchedulerService scheduler;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public boolean isPremium(Long userId) {
        return entitlementService.hasHanja(userId) || entitlementService.hasWriting(userId);
    }

    public boolean hasHanjaEntitlement(Long userId) {
        return entitlementService.hasHanja(userId);
    }

    public Map<String, Object> checkVocabLimit(Long userId, boolean isPro, String source, String specialty) {
        long limit;
        long count;
        if ("hanja".equals(source)) {
            limit = isPro ? 100 : 50;
            count = cardRepository.countByUserIdAndSource(userId, "hanja");
        } else if ("specialized".equals(source)) {
            limit = isPro ? 250 : 50;
            count = cardRepository.countByUserIdAndSourceAndSpecialty(userId, "specialized", specialty != null ? specialty : "");
        } else if ("passage".equals(source)) {
            limit = isPro ? 500 : 100;
            count = cardRepository.countByUserIdAndSource(userId, "passage");
        } else {
            return Map.of("allowed", true, "count", 0L, "limit", 9999L);
        }
        if (count >= limit) {
            return Map.of(
                    "allowed", false,
                    "count", count,
                    "limit", limit,
                    "message", "Giới hạn từ vựng đã đạt tối đa " + limit + " (" + count + "/" + limit + ")."
            );
        }
        return Map.of("allowed", true, "count", count, "limit", limit);
    }

    @Transactional
    public Map<String, Object> createCard(Long userId, Map<String, Object> body) {
        boolean isPro = isPremium(userId);
        String word = str(body.get("word"));
        String meaning = str(body.get("meaning"));
        String source = str(body.get("source"));
        String specialty = str(body.get("specialty"));

        if (word.isBlank() || meaning.isBlank() || source.isBlank()) {
            return Map.of("success", false, "message", "Thiếu word, meaning hoặc source.");
        }

        if ("hanja".equals(source) || "specialized".equals(source) || "passage".equals(source)) {
            Map<String, Object> limit = checkVocabLimit(userId, isPro, source, specialty);
            if (Boolean.FALSE.equals(limit.get("allowed"))) {
                return Map.of("success", false, "message", limit.get("message"));
            }
        }

        FsrsCard card = new FsrsCard();
        card.setUserId(userId);
        card.setWord(word);
        card.setMeaning(meaning);
        card.setSource(source);
        card.setSpecialty(specialty.isBlank() ? null : specialty);
        card.setExternalRef(str(body.get("externalRef")));
        card.setHanjaRootsJson(toJsonArray(body.get("hanja_roots")));
        long now = System.currentTimeMillis();
        card.setDue(now);
        card.setStability(0.0);
        card.setDifficulty(0.0);
        cardRepository.save(card);

        return Map.of("success", true, "card", toCardDto(card));
    }

    public Map<String, Object> getCards(Long userId, String filter) {
        long now = System.currentTimeMillis();
        List<FsrsCard> cards;
        if ("due".equals(filter)) {
            cards = cardRepository.findByUserIdAndDueLessThanEqualOrderByDueAsc(userId, now);
        } else {
            cards = cardRepository.findByUserIdOrderByDueAsc(userId);
        }
        List<Map<String, Object>> dtos = cards.stream().map(this::toCardDto).toList();
        return Map.of("success", true, "count", dtos.size(), "cards", dtos);
    }

    @Transactional
    public Map<String, Object> submitReview(Long userId, Map<String, Object> body) {
        Long cardId = longVal(body.get("card_id"));
        Integer rating = intVal(body.get("rating"));
        if (cardId == null || rating == null || rating < 1 || rating > 4) {
            return Map.of("success", false, "message", "Dữ liệu card_id hoặc rating không hợp lệ.");
        }

        Optional<FsrsCard> opt = cardRepository.findByIdAndUserId(cardId, userId);
        if (opt.isEmpty()) {
            return Map.of("success", false, "message", "Không tìm thấy thẻ từ vựng.");
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
                "next_review_at", java.time.Instant.ofEpochMilli(next.dueMs()).toString(),
                "state", next.state(),
                "stability", next.stability(),
                "difficulty", next.difficulty()
        );
    }

    @Transactional
    public Map<String, Object> migrateFromLocal(Long userId, List<Map<String, Object>> entries) {
        int migrated = 0;
        int skipped = 0;
        long now = System.currentTimeMillis();

        for (Map<String, Object> entry : entries) {
            String externalRef = str(entry.get("charId"));
            if (externalRef.isBlank()) {
                skipped++;
                continue;
            }
            if (cardRepository.findByUserIdAndExternalRef(userId, externalRef).isPresent()) {
                skipped++;
                continue;
            }

            int repetitions = intVal(entry.get("repetitions")) != null ? intVal(entry.get("repetitions")) : 0;
            int interval = intVal(entry.get("interval")) != null ? intVal(entry.get("interval")) : 0;
            double easeFactor = doubleVal(entry.get("easeFactor"), 2.5);
            String nextReview = str(entry.get("nextReview"));

            FsrsSchedulerService.ScheduleResult mapped = scheduler.fromSm2(repetitions, interval, easeFactor, nextReview, now);

            FsrsCard card = new FsrsCard();
            card.setUserId(userId);
            card.setWord(str(entry.get("word")));
            card.setMeaning(str(entry.get("meaning")));
            if (card.getWord().isBlank()) card.setWord(externalRef);
            if (card.getMeaning().isBlank()) card.setMeaning("Hán Hàn");
            card.setSource("hanja");
            card.setExternalRef(externalRef);
            card.setStability(mapped.stability());
            card.setDifficulty(mapped.difficulty());
            card.setDue(mapped.dueMs());
            cardRepository.save(card);
            migrated++;
        }

        return Map.of("success", true, "migrated", migrated, "skipped", skipped);
    }

    private static String passageExternalRef(String word) {
        return "passage:" + word.trim();
    }

    private static String passageContext(String examId, String section, String questionNo) {
        return examId + "|" + section + "|" + questionNo;
    }

    @Transactional
    public Map<String, Object> ensurePassageCard(
            Long userId, String word, String meaning, String examId, String section, String questionNo) {
        if (word.isBlank() || meaning.isBlank()) {
            return Map.of("success", false, "message", "Thiếu từ hoặc nghĩa.");
        }
        String externalRef = passageExternalRef(word);
        String context = passageContext(
                examId != null ? examId : "",
                section != null ? section : "",
                questionNo != null ? questionNo : "");

        Optional<FsrsCard> existing = cardRepository.findByUserIdAndExternalRef(userId, externalRef);
        if (existing.isPresent()) {
            FsrsCard card = existing.get();
            if (!context.isBlank() && !context.equals("||")) {
                card.setSpecialty(context);
                card.setMeaning(meaning);
                cardRepository.save(card);
            }
            return Map.of("success", true, "card", toCardDto(card), "created", false);
        }

        boolean isPro = isPremium(userId);
        Map<String, Object> limit = checkVocabLimit(userId, isPro, "passage", null);
        if (Boolean.FALSE.equals(limit.get("allowed"))) {
            return Map.of("success", false, "message", limit.get("message"));
        }

        FsrsCard card = new FsrsCard();
        card.setUserId(userId);
        card.setWord(word);
        card.setMeaning(meaning);
        card.setSource("passage");
        card.setExternalRef(externalRef);
        card.setSpecialty(context.isBlank() || context.equals("||") ? null : context);
        card.setDue(System.currentTimeMillis());
        cardRepository.save(card);
        return Map.of("success", true, "card", toCardDto(card), "created", true);
    }

    @Transactional
    public Map<String, Object> ensureHanjaCard(Long userId, String externalRef, String word, String meaning) {
        Optional<FsrsCard> existing = cardRepository.findByUserIdAndExternalRef(userId, externalRef);
        if (existing.isPresent()) {
            return Map.of("success", true, "card", toCardDto(existing.get()), "created", false);
        }
        boolean isPro = isPremium(userId);
        Map<String, Object> limit = checkVocabLimit(userId, isPro, "hanja", null);
        if (Boolean.FALSE.equals(limit.get("allowed"))) {
            return Map.of("success", false, "message", limit.get("message"));
        }
        FsrsCard card = new FsrsCard();
        card.setUserId(userId);
        card.setWord(word);
        card.setMeaning(meaning);
        card.setSource("hanja");
        card.setExternalRef(externalRef);
        card.setDue(System.currentTimeMillis());
        cardRepository.save(card);
        return Map.of("success", true, "card", toCardDto(card), "created", true);
    }

    private Map<String, Object> toCardDto(FsrsCard card) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", card.getId());
        m.put("word", card.getWord());
        m.put("meaning", card.getMeaning());
        m.put("source", card.getSource());
        m.put("specialty", card.getSpecialty());
        m.put("externalRef", card.getExternalRef());
        m.put("stability", card.getStability());
        m.put("difficulty", card.getDifficulty());
        m.put("due", card.getDue());
        try {
            m.put("hanja_roots", objectMapper.readValue(
                    card.getHanjaRootsJson() != null ? card.getHanjaRootsJson() : "[]",
                    new TypeReference<List<String>>() {}));
        } catch (Exception e) {
            m.put("hanja_roots", List.of());
        }
        return m;
    }

    private String toJsonArray(Object raw) {
        if (raw == null) return "[]";
        try {
            return objectMapper.writeValueAsString(raw);
        } catch (Exception e) {
            return "[]";
        }
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

    private static Integer intVal(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(o));
        } catch (Exception e) {
            return null;
        }
    }

    private static double doubleVal(Object o, double def) {
        if (o == null) return def;
        if (o instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(String.valueOf(o));
        } catch (Exception e) {
            return def;
        }
    }
}
