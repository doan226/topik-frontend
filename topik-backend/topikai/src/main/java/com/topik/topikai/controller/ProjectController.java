package com.topik.topikai.controller;

import com.topik.topikai.entity.TaskStatus;
import com.topik.topikai.service.ProjectTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/project")
public class ProjectController {

    @Autowired
    private ProjectTaskService projectTaskService;

    @GetMapping("/tasks")
    public ResponseEntity<List<Map<String, Object>>> listTasks(
            @RequestParam(required = false) String phase,
            @RequestParam(required = false) String status
    ) {
        TaskStatus taskStatus = parseStatus(status);
        return ResponseEntity.ok(projectTaskService.listTasks(phase, taskStatus));
    }

    @GetMapping("/tasks/{taskKey}")
    public ResponseEntity<?> getTask(@PathVariable String taskKey) {
        return projectTaskService.getByTaskKey(taskKey)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/tasks/{taskKey}")
    public ResponseEntity<?> updateTask(
            @PathVariable String taskKey,
            @RequestBody UpdateTaskRequest request
    ) {
        TaskStatus status = parseStatus(request.getStatus());
        return projectTaskService.updateTask(taskKey, status, request.getNotes())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/export-status")
    public ResponseEntity<Map<String, Object>> exportStatus() {
        List<Map<String, Object>> all = projectTaskService.listTasks(null, null);

        Map<String, List<Map<String, Object>>> grouped = all.stream()
                .collect(Collectors.groupingBy(
                        t -> (String) t.get("status"),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        String generatedAt = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        String markdown = buildMarkdown(all, grouped, generatedAt);

        Map<String, Object> body = new HashMap<>();
        body.put("generatedAt", generatedAt);
        body.put("taskCount", all.size());
        body.put("tasks", all);
        body.put("markdown", markdown);
        return ResponseEntity.ok(body);
    }

    private String buildMarkdown(
            List<Map<String, Object>> all,
            Map<String, List<Map<String, Object>>> grouped,
            String generatedAt
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("# Implementation Status (auto-generated ").append(generatedAt).append(")\n\n");
        sb.append("> Doc file nay TRUOC khi implement. Source: MySQL project_task.\n\n");

        appendSection(sb, "Done (khong lam lai)", grouped.get("done"));
        appendSection(sb, "In Progress", grouped.get("in_progress"));
        appendSection(sb, "Pending Phase 1", filterByPhase(grouped.get("pending"), "phase1"));
        appendSection(sb, "Blocked", grouped.get("blocked"));
        appendSection(sb, "Deferred Phase 2", filterDeferred(all));

        sb.append("\n## Summary\n\n");
        sb.append("- Total tasks: ").append(all.size()).append("\n");
        sb.append("- Done: ").append(countStatus(all, "done")).append("\n");
        sb.append("- Pending: ").append(countStatus(all, "pending")).append("\n");
        sb.append("- In progress: ").append(countStatus(all, "in_progress")).append("\n");

        return sb.toString();
    }

    private void appendSection(StringBuilder sb, String title, List<Map<String, Object>> tasks) {
        sb.append("## ").append(title).append("\n\n");
        if (tasks == null || tasks.isEmpty()) {
            sb.append("_None_\n\n");
            return;
        }
        for (Map<String, Object> task : tasks) {
            sb.append("- [");
            sb.append("done".equals(task.get("status")) ? "x" : " ");
            sb.append("] **").append(task.get("taskKey")).append("** — ");
            sb.append(task.get("title"));
            if (task.get("notes") != null && !String.valueOf(task.get("notes")).isBlank()) {
                sb.append(" _(notes: ").append(task.get("notes")).append(")_");
            }
            sb.append("\n");
        }
        sb.append("\n");
    }

    private List<Map<String, Object>> filterByPhase(List<Map<String, Object>> tasks, String phasePrefix) {
        if (tasks == null) {
            return List.of();
        }
        return tasks.stream()
                .filter(t -> {
                    String phase = String.valueOf(t.get("phase"));
                    return phase.startsWith(phasePrefix);
                })
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> filterDeferred(List<Map<String, Object>> all) {
        return all.stream()
                .filter(t -> {
                    String status = String.valueOf(t.get("status"));
                    String phase = String.valueOf(t.get("phase"));
                    return "deferred".equals(status) || phase.startsWith("phase2");
                })
                .collect(Collectors.toList());
    }

    private long countStatus(List<Map<String, Object>> all, String status) {
        return all.stream().filter(t -> status.equals(t.get("status"))).count();
    }

    private TaskStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return TaskStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public static class UpdateTaskRequest {
        private String status;
        private String notes;

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes;
        }
    }
}
