package com.topik.topikai.repository;

import com.topik.topikai.entity.UserMilestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserMilestoneRepository extends JpaRepository<UserMilestone, Long> {

    List<UserMilestone> findByUserIdOrderByAchievedAtDesc(Long userId);

    Optional<UserMilestone> findByUserIdAndMilestoneId(Long userId, String milestoneId);

    boolean existsByUserIdAndMilestoneId(Long userId, String milestoneId);
}
