package com.topik.topikai.service;

import com.topik.topikai.entity.ProjectTask;
import com.topik.topikai.entity.TaskStatus;
import com.topik.topikai.repository.ProjectTaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ProjectTaskService {

    @Autowired
    private ProjectTaskRepository repository;

    public List<Map<String, Object>> listTasks(String phase, TaskStatus status) {
        List<ProjectTask> tasks;
        if (phase != null && !phase.isBlank() && status != null) {
            tasks = repository.findByPhaseAndStatus(phase, status);
        } else if (phase != null && !phase.isBlank()) {
            tasks = repository.findByPhase(phase);
        } else if (status != null) {
            tasks = repository.findByStatus(status);
        } else {
            tasks = repository.findAll();
        }
        return tasks.stream().map(this::toMap).collect(Collectors.toList());
    }

    public Optional<Map<String, Object>> getByTaskKey(String taskKey) {
        return repository.findByTaskKey(taskKey).map(this::toMap);
    }

    @Transactional
    public Optional<Map<String, Object>> updateTask(String taskKey, TaskStatus status, String notes) {
        Optional<ProjectTask> existing = repository.findByTaskKey(taskKey);
        if (existing.isEmpty()) {
            return Optional.empty();
        }

        ProjectTask task = existing.get();
        if (status != null) {
            task.setStatus(status);
            if (status == TaskStatus.done) {
                task.setCompletedAt(LocalDateTime.now());
            }
        }
        if (notes != null) {
            task.setNotes(notes);
        }
        return Optional.of(toMap(repository.save(task)));
    }

    public Map<String, Object> toMap(ProjectTask task) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", task.getId());
        m.put("taskKey", task.getTaskKey());
        m.put("phase", task.getPhase());
        m.put("title", task.getTitle());
        m.put("description", task.getDescription());
        m.put("status", task.getStatus().name());
        m.put("dependsOn", task.getDependsOn());
        m.put("completedAt", task.getCompletedAt());
        m.put("notes", task.getNotes());
        m.put("updatedAt", task.getUpdatedAt());
        return m;
    }
}
