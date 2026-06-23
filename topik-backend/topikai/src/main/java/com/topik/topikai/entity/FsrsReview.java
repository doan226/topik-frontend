package com.topik.topikai.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "fsrs_reviews")
@Getter
@Setter
public class FsrsReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "card_id", nullable = false)
    private Long cardId;

    @Column(name = "review_time", nullable = false)
    private Long reviewTime;

    @Column(name = "review_rating", nullable = false)
    private Integer reviewRating;

    @Column(name = "review_state", nullable = false)
    private Integer reviewState;

    private Double stability;

    private Double difficulty;

    private Long due;
}
