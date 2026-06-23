package com.topik.topikai.dto;

import lombok.Data;

@Data
public class WritingQuestionDto {
    private Integer id;
    private Integer externalId;
    private int topik;
    private int type;
    private int timeLimit;
    private int maxScore;
    private String prompt;
    private String answer;
    private String imageUrl;
    private String source;
    private Integer expansionSet;

    public int resolveExternalId() {
        if (externalId != null) return externalId;
        if (id != null) return id;
        return topik * 100 + type;
    }
}
