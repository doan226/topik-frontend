package com.topik.topikai.repository;

import com.topik.topikai.entity.ProjectTask;
import com.topik.topikai.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectTaskRepository extends JpaRepository<ProjectTask, Long> {

    Optional<ProjectTask> findByTaskKey(String taskKey);

    boolean existsByTaskKey(String taskKey);

    List<ProjectTask> findByPhase(String phase);

    List<ProjectTask> findByStatus(TaskStatus status);

    List<ProjectTask> findByPhaseAndStatus(String phase, TaskStatus status);
}
