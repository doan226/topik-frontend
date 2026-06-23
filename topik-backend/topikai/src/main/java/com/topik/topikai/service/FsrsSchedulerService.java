package com.topik.topikai.service;

import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Simplified FSRS-style scheduler (server source of truth).
 * Maps ratings 1=Again, 2=Hard, 3=Good, 4=Easy to next stability/difficulty/due.
 */
@Service
public class FsrsSchedulerService {

    public static final int STATE_NEW = 0;
    public static final int STATE_LEARNING = 1;
    public static final int STATE_REVIEW = 2;
    public static final int STATE_RELEARNING = 3;

    public record ScheduleResult(double stability, double difficulty, long dueMs, int state) {}

    public ScheduleResult scheduleReview(double stability, double difficulty, long dueMs, int state, int rating, long nowMs) {
        double s = stability <= 0 ? 0.4 : stability;
        double d = difficulty <= 0 ? 5.0 : difficulty;
        int nextState = state <= 0 ? STATE_LEARNING : state;

        switch (rating) {
            case 1 -> {
                s = Math.max(0.2, s * 0.5);
                d = Math.min(10, d + 1.2);
                nextState = STATE_RELEARNING;
                return new ScheduleResult(s, d, nowMs + 10 * 60 * 1000L, nextState);
            }
            case 2 -> {
                s = s * 1.2;
                d = Math.min(10, d + 0.5);
                nextState = s >= 2.5 ? STATE_REVIEW : STATE_LEARNING;
                return new ScheduleResult(s, d, nowMs + daysToMs(intervalDays(s, 0.85)), nextState);
            }
            case 3 -> {
                s = s * 1.8 + 0.5;
                d = Math.max(1, d - 0.2);
                nextState = STATE_REVIEW;
                return new ScheduleResult(s, d, nowMs + daysToMs(intervalDays(s, 0.9)), nextState);
            }
            case 4 -> {
                s = s * 2.4 + 1.0;
                d = Math.max(1, d - 0.5);
                nextState = STATE_REVIEW;
                return new ScheduleResult(s, d, nowMs + daysToMs(intervalDays(s, 0.95)), nextState);
            }
            default -> {
                return new ScheduleResult(s, d, dueMs > 0 ? dueMs : nowMs, nextState);
            }
        }
    }

    /** Best-effort SM-2 → FSRS migration */
    public ScheduleResult fromSm2(int repetitions, int intervalDays, double easeFactor, String nextReviewYmd, long nowMs) {
        double s = Math.max(0.4, intervalDays * Math.max(1.3, easeFactor) * 0.35 + repetitions * 0.2);
        double d = Math.max(1.0, Math.min(10.0, 11.0 - easeFactor * 2.0));
        int state = repetitions >= 3 ? STATE_REVIEW : (repetitions > 0 ? STATE_LEARNING : STATE_NEW);
        long due = parseDateMs(nextReviewYmd, nowMs);
        if (due < nowMs && repetitions > 0) {
            due = nowMs;
        }
        return new ScheduleResult(s, d, due, state);
    }

    public boolean isLearned(int state, double stability) {
        return state == STATE_REVIEW && stability >= 2.5;
    }

    private static long daysToMs(double days) {
        return (long) (Math.max(0.5, days) * 24 * 60 * 60 * 1000);
    }

    private static double intervalDays(double stability, double retention) {
        return Math.max(1, stability * retention);
    }

    private static long parseDateMs(String ymd, long fallback) {
        if (ymd == null || ymd.isBlank()) return fallback;
        try {
            return java.time.LocalDate.parse(ymd).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
        } catch (Exception e) {
            return fallback;
        }
    }
}
