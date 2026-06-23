package com.topik.topikai.repository;

import com.topik.topikai.entity.WritingQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WritingQuestionRepository extends JpaRepository<WritingQuestion, Long> {
    List<WritingQuestion> findAllByOrderByTopikAscTypeAsc();
    Optional<WritingQuestion> findByExternalId(Integer externalId);
    long count();
}
