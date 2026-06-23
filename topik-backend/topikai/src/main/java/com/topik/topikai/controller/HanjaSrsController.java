package com.topik.topikai.controller;

import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.service.HanjaSrsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/hanja/srs")
public class HanjaSrsController {

    @Autowired
    private HanjaSrsService hanjaSrsService;

    @GetMapping("/cards")
    public ResponseEntity<Map<String, Object>> getCards(
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "due") String filter) {
        Long resolvedUserId = SecurityUtils.requireCurrentUserId();
        if (userId != null) {
            SecurityUtils.assertUserAccess(userId);
        }
        return ResponseEntity.ok(hanjaSrsService.getCards(resolvedUserId, filter));
    }

    @PostMapping("/cards")
    public ResponseEntity<Map<String, Object>> createCard(
            @RequestParam(required = false) Long userId,
            @RequestBody Map<String, Object> body) {
        Long resolvedUserId = SecurityUtils.requireCurrentUserId();
        if (userId != null) {
            SecurityUtils.assertUserAccess(userId);
        }
        Map<String, Object> result = hanjaSrsService.createCard(resolvedUserId, body);
        boolean ok = Boolean.TRUE.equals(result.get("success"));
        return ResponseEntity.status(ok ? 201 : 400).body(result);
    }

    @PostMapping("/reviews")
    public ResponseEntity<Map<String, Object>> review(
            @RequestParam(required = false) Long userId,
            @RequestBody Map<String, Object> body) {
        Long resolvedUserId = SecurityUtils.requireCurrentUserId();
        if (userId != null) {
            SecurityUtils.assertUserAccess(userId);
        }
        Map<String, Object> result = hanjaSrsService.submitReview(resolvedUserId, body);
        boolean ok = Boolean.TRUE.equals(result.get("success"));
        return ResponseEntity.status(ok ? 200 : 400).body(result);
    }

    @PostMapping("/migrate")
    public ResponseEntity<Map<String, Object>> migrate(
            @RequestParam(required = false) Long userId,
            @RequestBody List<Map<String, Object>> entries) {
        Long resolvedUserId = SecurityUtils.requireCurrentUserId();
        if (userId != null) {
            SecurityUtils.assertUserAccess(userId);
        }
        return ResponseEntity.ok(hanjaSrsService.migrateFromLocal(resolvedUserId, entries));
    }

    @PostMapping("/ensure-hanja")
    public ResponseEntity<Map<String, Object>> ensureHanja(
            @RequestParam(required = false) Long userId,
            @RequestBody Map<String, Object> body) {
        Long resolvedUserId = SecurityUtils.requireCurrentUserId();
        if (userId != null) {
            SecurityUtils.assertUserAccess(userId);
        }
        Map<String, Object> result = hanjaSrsService.ensureHanjaCard(
                resolvedUserId,
                String.valueOf(body.getOrDefault("externalRef", "")),
                String.valueOf(body.getOrDefault("word", "")),
                String.valueOf(body.getOrDefault("meaning", ""))
        );
        boolean ok = Boolean.TRUE.equals(result.get("success"));
        return ResponseEntity.status(ok ? 200 : 403).body(result);
    }

    @PostMapping("/ensure-passage")
    public ResponseEntity<Map<String, Object>> ensurePassage(
            @RequestParam(required = false) Long userId,
            @RequestBody Map<String, Object> body) {
        Long resolvedUserId = SecurityUtils.requireCurrentUserId();
        if (userId != null) {
            SecurityUtils.assertUserAccess(userId);
        }
        Map<String, Object> result = hanjaSrsService.ensurePassageCard(
                resolvedUserId,
                String.valueOf(body.getOrDefault("word", "")),
                String.valueOf(body.getOrDefault("meaning", "")),
                String.valueOf(body.getOrDefault("examId", "")),
                String.valueOf(body.getOrDefault("section", "")),
                String.valueOf(body.getOrDefault("questionNo", ""))
        );
        boolean ok = Boolean.TRUE.equals(result.get("success"));
        return ResponseEntity.status(ok ? 200 : 403).body(result);
    }
}
