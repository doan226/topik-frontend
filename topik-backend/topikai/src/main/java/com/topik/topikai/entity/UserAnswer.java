package com.topik.topikai.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;

@Entity
@Data
public class UserAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private int questionNumber;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String aiFeedbackJson;

    private int score;

    @Column(name = "external_question_id", length = 32)
    private String externalQuestionId;

    @Column(name = "rewrite_version")
    private Integer rewriteVersion = 1;

    @Column(name = "parent_answer_id")
    private Long parentAnswerId;

    @Column(name = "topik_session")
    private Integer topikSession;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDate createdAt;
}