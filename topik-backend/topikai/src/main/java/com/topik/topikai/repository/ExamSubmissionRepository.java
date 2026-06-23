package com.topik.topikai.repository;

import com.topik.topikai.entity.ExamSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamSubmissionRepository extends JpaRepository<ExamSubmission, Long> {

    @Query(value = """
            SELECT q.exam_id, q.section,
                   COUNT(DISTINCT s.question_id),
                   COUNT(DISTINCT CASE WHEN s.is_correct = 1 THEN s.question_id END),
                   MAX(s.submitted_at)
            FROM exam_submissions s
            JOIN exam_questions q ON q.id = s.question_id
            WHERE s.user_id = :userId
            GROUP BY q.exam_id, q.section
            ORDER BY MAX(s.submitted_at) DESC
            """, nativeQuery = true)
    List<Object[]> aggregateProgressByUser(@Param("userId") Long userId);

    @Query(value = """
            SELECT q.exam_id, q.section,
                   COUNT(DISTINCT s.question_id),
                   COUNT(DISTINCT CASE WHEN s.is_correct = 1 THEN s.question_id END),
                   MAX(s.submitted_at)
            FROM exam_submissions s
            JOIN exam_questions q ON q.id = s.question_id
            WHERE s.user_id = :userId AND q.exam_id = :examId
            GROUP BY q.exam_id, q.section
            ORDER BY MAX(s.submitted_at) DESC
            """, nativeQuery = true)
    List<Object[]> aggregateProgressByUserAndExam(
            @Param("userId") Long userId,
            @Param("examId") String examId);
}
