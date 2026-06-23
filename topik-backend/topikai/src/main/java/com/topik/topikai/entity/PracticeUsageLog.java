package com.topik.topikai.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

@Entity
@Data
@Table(
        name = "practice_usage_log",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "feature_key", "used_at"})
)
public class PracticeUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "feature_key", nullable = false, length = 60)
    private String featureKey;

    @Column(name = "used_at", nullable = false)
    private LocalDate usedAt;

    @Column(nullable = false)
    private int count = 0;
}
