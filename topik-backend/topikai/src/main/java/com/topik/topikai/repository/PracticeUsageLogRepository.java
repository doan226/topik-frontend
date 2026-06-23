package com.topik.topikai.repository;

import com.topik.topikai.entity.PracticeUsageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface PracticeUsageLogRepository extends JpaRepository<PracticeUsageLog, Long> {

    Optional<PracticeUsageLog> findByUserIdAndFeatureKeyAndUsedAt(
            Long userId, String featureKey, LocalDate usedAt
    );
}
