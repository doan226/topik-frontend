package com.topik.topikai.service;

import com.topik.topikai.entity.PracticeUsageLog;
import com.topik.topikai.repository.PracticeUsageLogRepository;
import com.topik.topikai.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Service
public class UsageQuotaService {

    /** @deprecated use EntitlementService.FREE_DAILY_GRADING */
    public static final int FREE_DAILY_GRADING = EntitlementService.FREE_DAILY_GRADING;
    public static final int FREE_WEEKLY_MINITEST = 1;

    public static final int FREE_WEEKLY_EXERCISE_51 = 5;
    public static final int FREE_WEEKLY_EXERCISE_52 = 5;
    public static final int FREE_WEEKLY_CHART53 = 1;
    public static final int FREE_DAILY_QUIZ_54 = 10;
    public static final int FREE_DAILY_HANJA_QUIZ = 5;
    public static final int FREE_DAILY_HANJA_SRS = 5;
    public static final int FREE_DAILY_PASSAGE_SRS = 3;
    public static final int FREE_SAVED_ITEMS_LIMIT = 20;

    public static final String FEATURE_EXERCISE_51 = "exercise_51";
    public static final String FEATURE_EXERCISE_52 = "exercise_52";
    public static final String FEATURE_CHART53_EXAM = "chart53_exam";
    public static final String FEATURE_QUIZ_54 = "quiz_54";
    public static final String FEATURE_HANJA_QUIZ = "hanja_quiz";
    public static final String FEATURE_HANJA_SRS = "hanja_srs";
    public static final String FEATURE_PASSAGE_SRS = "passage_srs";
    public static final String FEATURE_AI_EXPLAIN = "ai_explain";

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final Set<String> WEEKLY_FEATURES = Set.of(
            FEATURE_EXERCISE_51, FEATURE_EXERCISE_52, FEATURE_CHART53_EXAM
    );

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PracticeUsageLogRepository practiceUsageLogRepository;

    @Autowired
    private EntitlementService entitlementService;

    public boolean isPremium(Long userId) {
        return entitlementService.hasWriting(userId);
    }

    public int countGradingToday(Long userId) {
        String sql = "SELECT COUNT(*) FROM user_answer WHERE user_id = ? AND created_at = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, userId, LocalDate.now());
        return count != null ? count : 0;
    }

    public boolean canGrade(Long userId) {
        int limit = entitlementService.getDailyGradingLimit(userId);
        if (limit < 0) return true;
        return countGradingToday(userId) < limit;
    }

    public int countMiniTestThisWeek(Long userId) {
        try {
            String sql = "SELECT COUNT(*) FROM mini_test_log WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, userId);
            return count != null ? count : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    public boolean canGenerateMiniTest(Long userId) {
        if (isPremium(userId)) return true;
        return countMiniTestThisWeek(userId) < FREE_WEEKLY_MINITEST;
    }

    public void logMiniTest(Long userId) {
        try {
            jdbcTemplate.update(
                    "INSERT INTO mini_test_log (user_id, created_at) VALUES (?, CURDATE())",
                    userId
            );
        } catch (Exception e) {
            jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS mini_test_log (" +
                            "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                            "user_id BIGINT NOT NULL, " +
                            "created_at DATE NOT NULL)"
            );
            jdbcTemplate.update(
                    "INSERT INTO mini_test_log (user_id, created_at) VALUES (?, CURDATE())",
                    userId
            );
        }
    }

    public boolean isValidPracticeFeatureKey(String featureKey) {
        return FEATURE_EXERCISE_51.equals(featureKey)
                || FEATURE_EXERCISE_52.equals(featureKey)
                || FEATURE_CHART53_EXAM.equals(featureKey)
                || FEATURE_QUIZ_54.equals(featureKey)
                || FEATURE_HANJA_QUIZ.equals(featureKey)
                || FEATURE_HANJA_SRS.equals(featureKey)
                || FEATURE_PASSAGE_SRS.equals(featureKey)
                || FEATURE_AI_EXPLAIN.equals(featureKey);
    }

    public int getPracticeLimit(String featureKey, boolean hasWriting) {
        if (hasWriting) {
            return -1;
        }
        return switch (featureKey) {
            case FEATURE_EXERCISE_51 -> FREE_WEEKLY_EXERCISE_51;
            case FEATURE_EXERCISE_52 -> FREE_WEEKLY_EXERCISE_52;
            case FEATURE_CHART53_EXAM -> FREE_WEEKLY_CHART53;
            case FEATURE_QUIZ_54 -> FREE_DAILY_QUIZ_54;
            case FEATURE_HANJA_QUIZ -> FREE_DAILY_HANJA_QUIZ;
            case FEATURE_HANJA_SRS -> FREE_DAILY_HANJA_SRS;
            case FEATURE_PASSAGE_SRS -> FREE_DAILY_PASSAGE_SRS;
            case FEATURE_AI_EXPLAIN -> EntitlementService.FREE_DAILY_AI_EXPLAIN;
            default -> 0;
        };
    }

    public int getAiExplainLimit(Long userId) {
        return entitlementService.getDailyAiExplainLimit(userId);
    }

    public int countAiExplainToday(Long userId) {
        return countPracticeUsage(userId, FEATURE_AI_EXPLAIN);
    }

    public boolean canAiExplain(Long userId) {
        int limit = getAiExplainLimit(userId);
        if (limit < 0) return true;
        return countAiExplainToday(userId) < limit;
    }

    @Transactional
    public boolean consumeAiExplain(Long userId) {
        if (!canAiExplain(userId)) return false;
        if (getAiExplainLimit(userId) < 0) return true;
        return consumePractice(userId, FEATURE_AI_EXPLAIN);
    }

    public int getHanjaPracticeLimit(String featureKey, boolean hasHanja) {
        if (hasHanja) return -1;
        return getPracticeLimit(featureKey, false);
    }

    public LocalDate getPracticePeriodDate(String featureKey) {
        LocalDate todayKst = LocalDate.now(KST);
        if (WEEKLY_FEATURES.contains(featureKey)) {
            return todayKst.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        }
        return todayKst;
    }

    public int countPracticeUsage(Long userId, String featureKey) {
        if (!isValidPracticeFeatureKey(featureKey)) {
            return 0;
        }
        LocalDate periodDate = getPracticePeriodDate(featureKey);
        return practiceUsageLogRepository
                .findByUserIdAndFeatureKeyAndUsedAt(userId, featureKey, periodDate)
                .map(PracticeUsageLog::getCount)
                .orElse(0);
    }

    public boolean canUsePractice(Long userId, String featureKey) {
        if (!isValidPracticeFeatureKey(featureKey)) {
            return false;
        }
        boolean writing = isPremium(userId);
        boolean hanjaOnly = entitlementService.hasHanja(userId) && !writing;
        int limit;
        if (FEATURE_HANJA_QUIZ.equals(featureKey) || FEATURE_HANJA_SRS.equals(featureKey)) {
            limit = getHanjaPracticeLimit(featureKey, entitlementService.hasHanja(userId));
        } else {
            limit = getPracticeLimit(featureKey, writing);
        }
        if (limit < 0) return true;
        if (hanjaOnly && !FEATURE_HANJA_QUIZ.equals(featureKey) && !FEATURE_HANJA_SRS.equals(featureKey)) {
            return countPracticeUsage(userId, featureKey) < limit;
        }
        return countPracticeUsage(userId, featureKey) < limit;
    }

    @Transactional
    public boolean consumePractice(Long userId, String featureKey) {
        if (!isValidPracticeFeatureKey(featureKey)) {
            return false;
        }
        if (!canUsePractice(userId, featureKey)) {
            return false;
        }
        if (isPremium(userId) && !FEATURE_HANJA_QUIZ.equals(featureKey) && !FEATURE_HANJA_SRS.equals(featureKey)) {
            return true;
        }
        if (entitlementService.hasHanja(userId)
                && (FEATURE_HANJA_QUIZ.equals(featureKey) || FEATURE_HANJA_SRS.equals(featureKey))) {
            return true;
        }

        LocalDate periodDate = getPracticePeriodDate(featureKey);
        PracticeUsageLog log = practiceUsageLogRepository
                .findByUserIdAndFeatureKeyAndUsedAt(userId, featureKey, periodDate)
                .orElseGet(() -> {
                    PracticeUsageLog created = new PracticeUsageLog();
                    created.setUserId(userId);
                    created.setFeatureKey(featureKey);
                    created.setUsedAt(periodDate);
                    created.setCount(0);
                    return created;
                });
        log.setCount(log.getCount() + 1);
        practiceUsageLogRepository.save(log);
        return true;
    }

    public Map<String, Object> getPracticeQuotaInfo(Long userId) {
        boolean writing = isPremium(userId);
        boolean hanja = entitlementService.hasHanja(userId);
        Map<String, Object> practice = new HashMap<>();

        practice.put("exercise51", buildFeatureQuota(userId, FEATURE_EXERCISE_51, writing));
        practice.put("exercise52", buildFeatureQuota(userId, FEATURE_EXERCISE_52, writing));
        practice.put("chart53", buildFeatureQuota(userId, FEATURE_CHART53_EXAM, writing));
        practice.put("quiz54", buildFeatureQuota(userId, FEATURE_QUIZ_54, writing));
        practice.put("hanjaQuiz", buildHanjaFeatureQuota(userId, FEATURE_HANJA_QUIZ, hanja));
        practice.put("hanjaSrs", buildHanjaFeatureQuota(userId, FEATURE_HANJA_SRS, hanja));
        practice.put("passageSrs", buildFeatureQuota(userId, FEATURE_PASSAGE_SRS, writing));
        practice.put("savedLimit", writing ? -1 : FREE_SAVED_ITEMS_LIMIT);
        return practice;
    }

    private Map<String, Object> buildFeatureQuota(Long userId, String featureKey, boolean hasWriting) {
        int used = countPracticeUsage(userId, featureKey);
        int limit = getPracticeLimit(featureKey, hasWriting);
        Map<String, Object> item = new HashMap<>();
        item.put("used", used);
        item.put("limit", limit);
        item.put("canUse", limit < 0 || used < limit);
        item.put("featureKey", featureKey);
        item.put("periodDate", getPracticePeriodDate(featureKey).toString());
        return item;
    }

    private Map<String, Object> buildHanjaFeatureQuota(Long userId, String featureKey, boolean hasHanja) {
        int used = countPracticeUsage(userId, featureKey);
        int limit = getHanjaPracticeLimit(featureKey, hasHanja);
        Map<String, Object> item = new HashMap<>();
        item.put("used", used);
        item.put("limit", limit);
        item.put("canUse", limit < 0 || used < limit);
        item.put("featureKey", featureKey);
        item.put("periodDate", getPracticePeriodDate(featureKey).toString());
        return item;
    }

    public Map<String, Object> getQuotaInfo(Long userId) {
        int usedToday = countGradingToday(userId);
        Map<String, Object> info = entitlementService.buildEntitlementSnapshot(userId, usedToday);
        info.put("miniTestUsedWeek", countMiniTestThisWeek(userId));
        info.put("miniTestLimitWeekly", isPremium(userId) ? -1 : FREE_WEEKLY_MINITEST);
        info.put("canMiniTest", isPremium(userId) || countMiniTestThisWeek(userId) < FREE_WEEKLY_MINITEST);
        info.put("aiExplainUsedToday", countAiExplainToday(userId));
        info.put("aiExplainLimitDaily", getAiExplainLimit(userId));
        info.put("canAiExplain", canAiExplain(userId));
        info.put("practice", getPracticeQuotaInfo(userId));
        return info;
    }
}
