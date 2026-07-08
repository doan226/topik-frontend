package com.topik.topikai.repository;

import com.topik.topikai.entity.LearnerGoals;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LearnerGoalsRepository extends JpaRepository<LearnerGoals, Long> {
}
