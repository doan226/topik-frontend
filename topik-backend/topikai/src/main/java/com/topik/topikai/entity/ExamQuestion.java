package com.topik.topikai.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "exam_questions")
@Getter
@Setter
public class ExamQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exam_id", nullable = false)
    private String examId;

    @Column(nullable = false)
    private String section;

    @Column(name = "question_no", nullable = false)
    private String questionNo;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(name = "content_json", nullable = false, columnDefinition = "JSON")
    private String contentJson;

    @Column(name = "correct_ans", nullable = false)
    private String correctAns;

    @Column(nullable = false)
    private String tier = "free";
}
