package com.topik.topikai.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "fsrs_cards")
@Getter
@Setter
public class FsrsCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String word;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String meaning;

    @Column(name = "hanja_roots", columnDefinition = "JSON")
    private String hanjaRootsJson = "[]";

    @Column(nullable = false)
    private String source;

    private String specialty;

    private Double stability = 0.0;

    private Double difficulty = 0.0;

    /** Next review timestamp in milliseconds */
    private Long due = 0L;

    @Column(name = "external_ref")
    private String externalRef;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
}
