package com.topik.topikai.repository;

import com.topik.topikai.entity.UserAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserAnswerRepository extends JpaRepository<UserAnswer, Long> {
    List<UserAnswer> findTop10ByUserIdAndQuestionNumberOrderByCreatedAtDesc(Long userId, int questionNumber);
    // Lấy lịch sử bài làm của User sắp xếp theo thời gian tăng dần (từ cũ đến mới) để vẽ biểu đồ
    List<UserAnswer> findByUserIdOrderByCreatedAtAsc(Long userId);
}