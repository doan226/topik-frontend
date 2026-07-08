package com.topik.topikai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.entity.LearnerGoals;
import com.topik.topikai.entity.User;
import com.topik.topikai.entity.UserAnswer;
import com.topik.topikai.entity.UserMilestone;
import com.topik.topikai.repository.LearnerGoalsRepository;
import com.topik.topikai.repository.UserAnswerRepository;
import com.topik.topikai.repository.UserMilestoneRepository;
import com.topik.topikai.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LearnerProfileService {

    private static final int[] QUESTION_TYPES = {51, 52, 53, 54};
    private static final Map<Integer, Integer> MAX_SCORES = Map.of(51, 10, 52, 10, 53, 30, 54, 50);
    private static final List<String> CRITERIA_KEYS = List.of("ngu_phap", "tu_vung", "cau_truc", "noi_dung");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserAnswerRepository userAnswerRepository;

    @Autowired
    private LearnerGoalsRepository learnerGoalsRepository;

    @Autowired
    private UserMilestoneRepository userMilestoneRepository;

    @Autowired
    private MistakeSrsService mistakeSrsService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final ConcurrentHashMap<Long, CacheEntry> profileCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 60_000;

    private record CacheEntry(Map<String, Object> profile, long expiresAt) {}

    public void invalidateCache(Long userId) {
        if (userId != null) {
            profileCache.remove(userId);
        }
    }

    public Map<String, Object> getProfile(Long userId) {
        long now = System.currentTimeMillis();
        CacheEntry cached = profileCache.get(userId);
        if (cached != null && cached.expiresAt > now) {
            return cached.profile;
        }
        Map<String, Object> profile = buildProfile(userId);
        profileCache.put(userId, new CacheEntry(profile, now + CACHE_TTL_MS));
        return profile;
    }

    public Map<String, Object> getLearningPath(Long userId) {
        Map<String, Object> profile = getProfile(userId);
        Map<String, Object> path = new LinkedHashMap<>();
        path.put("weakestQuestion", profile.get("weakestQuestion"));
        path.put("weakestReason", profile.get("weakestReason"));
        path.put("recommendation", profile.get("recommendation"));
        path.put("weeklyGoal", profile.get("weeklyGoal"));
        path.put("totalSubmissions", profile.get("totalSubmissions"));
        path.put("progress", profile.get("weeklyProgress"));
        return path;
    }

    public Optional<LearnerGoals> getGoals(Long userId) {
        return learnerGoalsRepository.findById(userId);
    }

    @Transactional
    public LearnerGoals saveGoals(Long userId, Map<String, Object> body) {
        LearnerGoals goals = learnerGoalsRepository.findById(userId).orElseGet(() -> {
            LearnerGoals g = new LearnerGoals();
            g.setUserId(userId);
            return g;
        });
        if (body.containsKey("examDate")) {
            Object v = body.get("examDate");
            goals.setExamDate(v == null || String.valueOf(v).isBlank() ? null : LocalDate.parse(String.valueOf(v)));
        }
        if (body.containsKey("targetLevel")) {
            Object v = body.get("targetLevel");
            goals.setTargetLevel(v == null ? null : String.valueOf(v));
        }
        if (body.containsKey("weeklyTargetPerType")) {
            goals.setWeeklyTargetPerType(intVal(body.get("weeklyTargetPerType"), 3));
        }
        if (body.containsKey("onboardingCompleted")) {
            goals.setOnboardingCompleted(Boolean.TRUE.equals(body.get("onboardingCompleted")));
        }
        learnerGoalsRepository.save(goals);
        invalidateCache(userId);
        return goals;
    }

    public Map<String, Object> goalsToMap(LearnerGoals goals) {
        if (goals == null) {
            return Map.of();
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("examDate", goals.getExamDate() != null ? goals.getExamDate().toString() : null);
        m.put("targetLevel", goals.getTargetLevel());
        m.put("weeklyTargetPerType", goals.getWeeklyTargetPerType() != null ? goals.getWeeklyTargetPerType() : 3);
        m.put("onboardingCompleted", Boolean.TRUE.equals(goals.getOnboardingCompleted()));
        return m;
    }

    private Map<String, Object> buildProfile(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        LearnerGoals goals = learnerGoalsRepository.findById(userId).orElse(null);
        List<UserAnswer> answers = userAnswerRepository.findByUserIdOrderByCreatedAtDesc(userId);

        int weeklyTarget = goals != null && goals.getWeeklyTargetPerType() != null
                ? goals.getWeeklyTargetPerType() : 3;

        Map<String, Object> weeklyProgress = buildWeeklyProgress(answers, weeklyTarget);
        WeakestResult weakest = computeWeakest(answers);
        Map<String, List<Integer>> recentScores = buildRecentScores(answers);
        Map<String, List<Double>> criteriaTrends = buildCriteriaTrends(answers);
        int pendingRewrites = countPendingRewrites(answers);
        long dueMistakes = mistakeSrsService.countDueMistakes(userId);
        Map<String, Object> writingStreak = computeWritingStreak(answers);
        int daysSinceLastActivity = computeDaysSinceLastActivity(answers);
        List<Map<String, Object>> milestones = detectAndPersistMilestones(userId, answers, writingStreak, pendingRewrites);
        Map<String, Object> nextBestAction = computeNextBestAction(
                weakest.question, dueMistakes, pendingRewrites, weeklyProgress, weakest.question);

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("displayName", user != null ? user.getUsername() : "Hoc vien");
        profile.put("writingStreak", writingStreak);
        profile.put("weakestQuestion", weakest.question);
        profile.put("weakestReason", weakest.reason);
        profile.put("weeklyProgress", weeklyProgress);
        profile.put("criteriaTrends", criteriaTrends);
        profile.put("dueMistakes", dueMistakes);
        profile.put("pendingRewrites", pendingRewrites);
        profile.put("recentScores", recentScores);
        profile.put("nextBestAction", nextBestAction);
        profile.put("milestones", milestones);
        profile.put("daysSinceLastActivity", daysSinceLastActivity);
        profile.put("totalSubmissions", answers.size());
        profile.put("weeklyGoal", buildWeeklyGoalText(goals));
        profile.put("recommendation", "Tuần này nên ôn Câu " + weakest.question + " — "
                + reasonLabel(weakest.reason) + ".");
        profile.put("goals", goalsToMap(goals));
        profile.put("criteriaHeatmap", buildCriteriaHeatmap(answers));
        return profile;
    }

    private Map<String, Object> buildWeeklyProgress(List<UserAnswer> answers, int target) {
        LocalDate weekStart = LocalDate.now().minusDays(6);
        Map<Integer, Integer> counts = new HashMap<>();
        for (int q : QUESTION_TYPES) {
            counts.put(q, 0);
        }
        for (UserAnswer a : answers) {
            if (a.getCreatedAt() != null && !a.getCreatedAt().isBefore(weekStart)) {
                counts.merge(a.getQuestionNumber(), 1, Integer::sum);
            }
        }
        Map<String, Object> progress = new LinkedHashMap<>();
        for (int q : QUESTION_TYPES) {
            int done = counts.getOrDefault(q, 0);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("done", done);
            item.put("target", target);
            item.put("percent", Math.min(100, (done * 100) / Math.max(1, target)));
            progress.put("q" + q, item);
        }
        return progress;
    }

    private record WeakestResult(int question, String reason) {}

    private WeakestResult computeWeakest(List<UserAnswer> answers) {
        double lowestRatio = Double.MAX_VALUE;
        int weakest = 51;
        String reason = "avg_score_lowest";
        Map<Integer, List<UserAnswer>> byType = groupByQuestion(answers);

        boolean any = false;
        for (int q : QUESTION_TYPES) {
            List<UserAnswer> items = byType.getOrDefault(q, List.of());
            if (items.isEmpty()) {
                continue;
            }
            any = true;
            double avg = items.stream().mapToInt(UserAnswer::getScore).average().orElse(0);
            int max = MAX_SCORES.getOrDefault(q, 10);
            double ratio = avg / max;
            if (ratio < lowestRatio) {
                lowestRatio = ratio;
                weakest = q;
                reason = "avg_score_lowest";
            } else if (Math.abs(ratio - lowestRatio) < 0.001 && items.size() < byType.getOrDefault(weakest, List.of()).size()) {
                weakest = q;
                reason = "fewest_submissions";
            }
        }
        if (!any) {
            return new WeakestResult(51, "not_started");
        }
        return new WeakestResult(weakest, reason);
    }

    private Map<String, List<Integer>> buildRecentScores(List<UserAnswer> answers) {
        Map<String, List<Integer>> result = new LinkedHashMap<>();
        Map<Integer, List<UserAnswer>> byType = groupByQuestion(answers);
        for (int q : QUESTION_TYPES) {
            List<UserAnswer> items = byType.getOrDefault(q, List.of());
            List<Integer> scores = new ArrayList<>();
            int limit = Math.min(10, items.size());
            for (int i = items.size() - limit; i < items.size(); i++) {
                scores.add(items.get(i).getScore());
            }
            result.put(String.valueOf(q), scores);
        }
        return result;
    }

    private Map<String, List<Double>> buildCriteriaTrends(List<UserAnswer> answers) {
        Map<String, List<Double>> trends = new LinkedHashMap<>();
        for (String key : CRITERIA_KEYS) {
            trends.put(key, new ArrayList<>());
        }
        List<UserAnswer> recent = new ArrayList<>(answers.stream().limit(10).toList());
        Collections.reverse(recent);
        for (UserAnswer a : recent) {
            Map<String, Double> scores = parseCriteriaScores(a.getAiFeedbackJson());
            for (String key : CRITERIA_KEYS) {
                trends.get(key).add(scores.getOrDefault(key, 0.0));
            }
        }
        return trends;
    }

    private Map<String, Map<String, Double>> buildCriteriaHeatmap(List<UserAnswer> answers) {
        Map<String, Map<String, Double>> heatmap = new LinkedHashMap<>();
        Map<Integer, List<UserAnswer>> byType = groupByQuestion(answers);
        for (int q : QUESTION_TYPES) {
            Map<String, Double> avgCriteria = new LinkedHashMap<>();
            List<UserAnswer> items = byType.getOrDefault(q, List.of());
            for (String key : CRITERIA_KEYS) {
                double sum = 0;
                int count = 0;
                for (UserAnswer a : items) {
                    Map<String, Double> scores = parseCriteriaScores(a.getAiFeedbackJson());
                    if (scores.containsKey(key)) {
                        sum += scores.get(key);
                        count++;
                    }
                }
                avgCriteria.put(key, count > 0 ? sum / count : 0);
            }
            heatmap.put("q" + q, avgCriteria);
        }
        return heatmap;
    }

    private int countPendingRewrites(List<UserAnswer> answers) {
        Map<String, Set<Integer>> versionsByQuestion = new HashMap<>();
        for (UserAnswer a : answers) {
            String qid = a.getExternalQuestionId();
            if (qid == null || qid.isBlank()) {
                continue;
            }
            int ver = a.getRewriteVersion() != null ? a.getRewriteVersion() : 1;
            versionsByQuestion.computeIfAbsent(qid, k -> new HashSet<>()).add(ver);
        }
        int pending = 0;
        for (Set<Integer> versions : versionsByQuestion.values()) {
            if (versions.contains(1) && !versions.contains(2)) {
                pending++;
            }
        }
        return pending;
    }

    private Map<String, Object> computeWritingStreak(List<UserAnswer> answers) {
        Set<LocalDate> activeDays = new TreeSet<>();
        for (UserAnswer a : answers) {
            if (a.getCreatedAt() != null) {
                activeDays.add(a.getCreatedAt());
            }
        }
        LocalDate today = LocalDate.now();
        int streak = 0;
        LocalDate cursor = today;
        while (activeDays.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        if (streak == 0 && activeDays.contains(today.minusDays(1))) {
            cursor = today.minusDays(1);
            while (activeDays.contains(cursor)) {
                streak++;
                cursor = cursor.minusDays(1);
            }
        }
        String lastDate = null;
        if (!activeDays.isEmpty()) {
            lastDate = activeDays.stream().max(LocalDate::compareTo).orElse(null).toString();
        }
        return Map.of("count", streak, "lastDate", lastDate != null ? lastDate : "");
    }

    private int computeDaysSinceLastActivity(List<UserAnswer> answers) {
        if (answers.isEmpty()) {
            return Integer.MAX_VALUE;
        }
        LocalDate last = answers.get(0).getCreatedAt();
        if (last == null) {
            return Integer.MAX_VALUE;
        }
        return (int) ChronoUnit.DAYS.between(last, LocalDate.now());
    }

    private Map<String, Object> computeNextBestAction(
            int weakestQuestion, long dueMistakes, int pendingRewrites,
            Map<String, Object> weeklyProgress, int fallbackQuestion) {
        if (dueMistakes > 0) {
            return action("review_mistakes",
                    dueMistakes + " lỗi cần ôn hôm nay",
                    "dashboard", null, weakestQuestion);
        }
        if (pendingRewrites > 0) {
            String tab = writingTab(fallbackQuestion);
            return action("rewrite",
                    pendingRewrites + " bài cần viết lại",
                    tab, "omr", fallbackQuestion);
        }
        for (int q : QUESTION_TYPES) {
            @SuppressWarnings("unchecked")
            Map<String, Object> p = (Map<String, Object>) weeklyProgress.get("q" + q);
            if (p != null) {
                int done = intVal(p.get("done"), 0);
                int target = intVal(p.get("target"), 3);
                if (done < target) {
                    return action("omr",
                            "Còn " + (target - done) + " bài Câu " + q + " tuần này",
                            writingTab(q), "omr", q);
                }
            }
        }
        return action("omr",
                "Luyện Câu " + weakestQuestion + " — điểm TB thấp nhất",
                writingTab(weakestQuestion), "omr", weakestQuestion);
    }

    private Map<String, Object> action(String type, String label, String tab, String writingMode, int question) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", type);
        m.put("label", label);
        m.put("tab", tab);
        m.put("writingMode", writingMode);
        m.put("question", question);
        return m;
    }

    private String writingTab(int question) {
        return switch (question) {
            case 52 -> "writing52";
            case 53 -> "writing53";
            case 54 -> "writing54";
            default -> "writing51";
        };
    }

    private String buildWeeklyGoalText(LearnerGoals goals) {
        if (goals == null || goals.getExamDate() == null) {
            return "Hoàn thành 3 bài mỗi dạng câu trước kỳ thi";
        }
        long days = ChronoUnit.DAYS.between(LocalDate.now(), goals.getExamDate());
        if (days < 0) {
            return "Kỳ thi đã qua — tiếp tục luyện để giữ phong độ";
        }
        if (days < 30) {
            return "Còn " + days + " ngày — 1 bài mỗi dạng mỗi ngày, ưu tiên câu 53–54";
        }
        if (days <= 60) {
            return "Còn " + days + " ngày — 4 bài/tuần, ưu tiên câu 53–54";
        }
        return "Còn " + days + " ngày đến kỳ thi — 3 bài mỗi dạng/tuần";
    }

    @Transactional
    protected List<Map<String, Object>> detectAndPersistMilestones(
            Long userId, List<UserAnswer> answers,
            Map<String, Object> writingStreak, int pendingRewrites) {
        List<Map<String, Object>> newMilestones = new ArrayList<>();
        long total = answers.size();
        if (total >= 10) {
            newMilestones.add(awardMilestone(userId, "submissions_10", "Đã nộp 10 bài OMR"));
        }
        for (UserAnswer a : answers) {
            if (a.getQuestionNumber() == 53 && a.getScore() >= 25) {
                newMilestones.add(awardMilestone(userId, "q53_score_25", "Lần đầu ≥ 25/30 câu 53"));
                break;
            }
        }
        int streak = intVal(writingStreak.get("count"), 0);
        if (streak >= 7) {
            newMilestones.add(awardMilestone(userId, "streak_7", "Streak 7 ngày luyện viết"));
        }
        Map<String, Set<Integer>> versionsByQuestion = new HashMap<>();
        Map<String, Integer> scoreV1 = new HashMap<>();
        Map<String, Integer> scoreV2 = new HashMap<>();
        for (UserAnswer a : answers) {
            String qid = a.getExternalQuestionId();
            if (qid == null) continue;
            int ver = a.getRewriteVersion() != null ? a.getRewriteVersion() : 1;
            if (ver == 1) scoreV1.put(qid, a.getScore());
            if (ver == 2) scoreV2.put(qid, a.getScore());
            versionsByQuestion.computeIfAbsent(qid, k -> new HashSet<>()).add(ver);
        }
        for (String qid : scoreV1.keySet()) {
            if (scoreV2.containsKey(qid) && scoreV2.get(qid) - scoreV1.get(qid) >= 5) {
                newMilestones.add(awardMilestone(userId, "rewrite_improved_5", "Viết lại cải thiện +5 điểm"));
                break;
            }
        }

        List<UserMilestone> existing = userMilestoneRepository.findByUserIdOrderByAchievedAtDesc(userId);
        List<Map<String, Object>> all = new ArrayList<>();
        for (UserMilestone m : existing) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", m.getMilestoneId());
            item.put("label", m.getLabel());
            item.put("achievedAt", m.getAchievedAt().toString());
            item.put("isNew", false);
            all.add(item);
        }
        for (Map<String, Object> nm : newMilestones) {
            boolean already = all.stream().anyMatch(x -> nm.get("id").equals(x.get("id")));
            if (!already) {
                nm.put("isNew", true);
                all.add(0, nm);
            }
        }
        return all;
    }

    private Map<String, Object> awardMilestone(Long userId, String id, String label) {
        if (!userMilestoneRepository.existsByUserIdAndMilestoneId(userId, id)) {
            UserMilestone m = new UserMilestone();
            m.setUserId(userId);
            m.setMilestoneId(id);
            m.setLabel(label);
            userMilestoneRepository.save(m);
        }
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", id);
        item.put("label", label);
        return item;
    }

    private Map<Integer, List<UserAnswer>> groupByQuestion(List<UserAnswer> answers) {
        Map<Integer, List<UserAnswer>> map = new HashMap<>();
        List<UserAnswer> asc = new ArrayList<>(answers);
        Collections.reverse(asc);
        for (UserAnswer a : asc) {
            map.computeIfAbsent(a.getQuestionNumber(), k -> new ArrayList<>()).add(a);
        }
        return map;
    }

    private Map<String, Double> parseCriteriaScores(String json) {
        Map<String, Double> out = new HashMap<>();
        if (json == null || json.isBlank()) {
            return out;
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode criteria = root.path("criteria_scores");
            if (criteria.isMissingNode()) {
                return out;
            }
            for (String key : CRITERIA_KEYS) {
                if (criteria.has(key)) {
                    out.put(key, criteria.path(key).asDouble(0));
                }
            }
            Map<String, String> legacy = Map.of(
                    "ngôn_ngữ", "ngu_phap",
                    "nội_dung", "noi_dung",
                    "tổ_chức", "cau_truc"
            );
            legacy.forEach((legacyKey, canonical) -> {
                if (!out.containsKey(canonical) && criteria.has(legacyKey)) {
                    out.put(canonical, criteria.path(legacyKey).asDouble(0));
                }
            });
        } catch (Exception ignored) {
        }
        return out;
    }

    private String reasonLabel(String reason) {
        return switch (reason) {
            case "not_started" -> "chưa bắt đầu";
            case "fewest_submissions" -> "ít bài nhất";
            default -> "điểm TB thấp nhất";
        };
    }

    private static int intVal(Object o, int defaultVal) {
        if (o == null) return defaultVal;
        if (o instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(o));
        } catch (Exception e) {
            return defaultVal;
        }
    }
}
