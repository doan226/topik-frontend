package com.topik.topikai.repository;

import com.topik.topikai.entity.FsrsReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FsrsReviewRepository extends JpaRepository<FsrsReview, Long> {

    Optional<FsrsReview> findFirstByCardIdOrderByReviewTimeDesc(Long cardId);
}
