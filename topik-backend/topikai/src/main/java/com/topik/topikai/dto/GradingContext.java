package com.topik.topikai.dto;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public class GradingContext {
    private final int questionType;
    private final String studentText;
    private final String questionPrompt;
    private final String referenceAnswer;
    private final int maxScore;
    private final Integer questionId;
    private final Integer topikSession;
    private final Map<String, Object> preValidation;

    public GradingContext(
            int questionType,
            String studentText,
            String questionPrompt,
            String referenceAnswer,
            int maxScore,
            Integer questionId,
            Integer topikSession
    ) {
        this(questionType, studentText, questionPrompt, referenceAnswer, maxScore, questionId, topikSession, null);
    }

    public GradingContext(
            int questionType,
            String studentText,
            String questionPrompt,
            String referenceAnswer,
            int maxScore,
            Integer questionId,
            Integer topikSession,
            Map<String, Object> preValidation
    ) {
        this.questionType = questionType;
        this.studentText = studentText != null ? studentText : "";
        this.questionPrompt = questionPrompt != null ? questionPrompt : "";
        this.referenceAnswer = referenceAnswer != null ? referenceAnswer : "";
        this.maxScore = maxScore > 0 ? maxScore : defaultMaxScore(questionType);
        this.questionId = questionId;
        this.topikSession = topikSession;
        this.preValidation = preValidation == null
                ? Collections.emptyMap()
                : Collections.unmodifiableMap(new LinkedHashMap<>(preValidation));
    }

    public GradingContext withPreValidation(Map<String, Object> preValidation) {
        return new GradingContext(
                questionType,
                studentText,
                questionPrompt,
                referenceAnswer,
                maxScore,
                questionId,
                topikSession,
                preValidation
        );
    }

    public int getQuestionType() {
        return questionType;
    }

    public String getStudentText() {
        return studentText;
    }

    public String getQuestionPrompt() {
        return questionPrompt;
    }

    public String getReferenceAnswer() {
        return referenceAnswer;
    }

    public int getMaxScore() {
        return maxScore;
    }

    public Integer getQuestionId() {
        return questionId;
    }

    public Integer getTopikSession() {
        return topikSession;
    }

    public Map<String, Object> getPreValidation() {
        return preValidation;
    }

    private static int defaultMaxScore(int type) {
        return switch (type) {
            case 53 -> 30;
            case 54 -> 50;
            default -> 10;
        };
    }
}
