package com.topik.topikai.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "learner_goals")
@Getter
@Setter
public class LearnerGoals {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "exam_date")
    private LocalDate examDate;

    @Column(name = "target_level", length = 20)
    private String targetLevel;

    @Column(name = "weekly_target_per_type")
    private Integer weeklyTargetPerType = 3;

    @Column(name = "onboarding_completed")
    private Boolean onboardingCompleted = false;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    @PrePersist
    void touchUpdatedAt() {
        updatedAt = LocalDateTime.now();
    }
}
