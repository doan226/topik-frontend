package com.topik.topikai.dto;

public class SubmitRequest {
    private String content;
    private int questionNumber;
    private Long userId;
    private Integer topikSession;
    private Integer questionId;
    private String questionPrompt;
    private String referenceAnswer;

    public String getContent() {
        return content;
    }

    public int getQuestionNumber() {
        return questionNumber;
    }

    public Long getUserId() {
        return userId;
    }

    public Integer getTopikSession() {
        return topikSession;
    }

    public Integer getQuestionId() {
        return questionId;
    }

    public String getQuestionPrompt() {
        return questionPrompt;
    }

    public String getReferenceAnswer() {
        return referenceAnswer;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public void setQuestionNumber(int questionNumber) {
        this.questionNumber = questionNumber;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public void setTopikSession(Integer topikSession) {
        this.topikSession = topikSession;
    }

    public void setQuestionId(Integer questionId) {
        this.questionId = questionId;
    }

    public void setQuestionPrompt(String questionPrompt) {
        this.questionPrompt = questionPrompt;
    }

    public void setReferenceAnswer(String referenceAnswer) {
        this.referenceAnswer = referenceAnswer;
    }
}
