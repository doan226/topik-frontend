package com.topik.topikai.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "writing_question")
@Data
public class WritingQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private int topik;

    @Column(nullable = false)
    private int type;

    private int timeLimit = 150;
    private int maxScore = 10;

    @Column(columnDefinition = "TEXT")
    private String prompt;

    @Column(columnDefinition = "TEXT")
    private String answer;

    private String imageUrl;

    /** Stable id matching frontend QuestionBank (e.g. 3551, 90151) */
    @Column(unique = true)
    private Integer externalId;

    /** official | expansion */
    private String source = "official";

    /** Premium expansion set number (1, 2, 3...) */
    private Integer expansionSet;
}
