package com.topik.topikai.repository;

import com.topik.topikai.entity.ExamQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ExamQuestionRepository extends JpaRepository<ExamQuestion, Long> {

    List<ExamQuestion> findBySectionOrderBySortOrderAsc(String section);

    List<ExamQuestion> findByExamIdAndSectionOrderBySortOrderAsc(String examId, String section);

    @Modifying
    @Transactional
    long deleteByExamId(String examId);

    long count();

    long countByExamIdAndSection(String examId, String section);
}
