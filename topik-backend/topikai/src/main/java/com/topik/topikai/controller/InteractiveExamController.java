package com.topik.topikai.controller;

import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.service.InteractiveExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/exams/interactive")
public class InteractiveExamController {

    @Autowired
    private InteractiveExamService interactiveExamService;

    @GetMapping("/questions")
    public ResponseEntity<Map<String, Object>> questions(
            @RequestParam String section,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false, defaultValue = "topik2-91") String examId) {
        Long resolvedUserId = SecurityUtils.requireCurrentUserId();
        if (userId != null) {
            SecurityUtils.assertUserAccess(userId);
        }
        List<Map<String, Object>> items = interactiveExamService.listQuestions(section, examId, resolvedUserId);
        return ResponseEntity.ok(Map.of("success", true, "questions", items));
    }

    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submit(
            @RequestParam(required = false) Long userId,
            @RequestBody Map<String, Object> body) {
        Long resolvedUserId = SecurityUtils.requireCurrentUserId();
        if (userId != null) {
            SecurityUtils.assertUserAccess(userId);
        }
        return ResponseEntity.ok(interactiveExamService.submit(resolvedUserId, body));
    }

    @PostMapping("/ai-explain")
    public ResponseEntity<Map<String, Object>> aiExplain(@RequestBody Map<String, Object> body) {
        Long userId = SecurityUtils.requireCurrentUserId();
        return ResponseEntity.ok(interactiveExamService.aiExplain(userId, body));
    }

    @GetMapping("/progress")
    public ResponseEntity<Map<String, Object>> progress(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String examId) {
        Long resolvedUserId = SecurityUtils.requireCurrentUserId();
        if (userId != null) {
            SecurityUtils.assertUserAccess(userId);
        }
        return ResponseEntity.ok(interactiveExamService.getProgress(resolvedUserId, examId));
    }
}
