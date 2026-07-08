package com.topik.topikai.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "user_milestones", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "milestone_id"})
})
@Getter
@Setter
public class UserMilestone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "milestone_id", nullable = false, length = 64)
    private String milestoneId;

    @Column(name = "label", length = 255)
    private String label;

    @Column(name = "achieved_at", nullable = false)
    private Instant achievedAt = Instant.now();
}
