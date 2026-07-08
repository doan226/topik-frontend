package com.topik.topikai.controller;

import com.topik.topikai.entity.LearnerGoals;
import com.topik.topikai.security.SecurityUtils;
import com.topik.topikai.service.LearnerProfileService;
import com.topik.topikai.service.MistakeSrsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/learner")
public class LearnerController {

    @Autowired
    private LearnerProfileService learnerProfileService;

    @Autowired
    private MistakeSrsService mistakeSrsService;

    @GetMapping("/profile/{userId}")
    public ResponseEntity<Map<String, Object>> getProfile(@PathVariable Long userId) {
        SecurityUtils.assertUserAccess(userId);
        return ResponseEntity.ok(learnerProfileService.getProfile(userId));
    }

    @GetMapping("/goals/{userId}")
    public ResponseEntity<Map<String, Object>> getGoals(@PathVariable Long userId) {
        SecurityUtils.assertUserAccess(userId);
        return ResponseEntity.ok(learnerProfileService.goalsToMap(
                learnerProfileService.getGoals(userId).orElse(null)));
    }

    @PutMapping("/goals/{userId}")
    public ResponseEntity<Map<String, Object>> putGoals(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> body) {
        SecurityUtils.assertUserAccess(userId);
        LearnerGoals saved = learnerProfileService.saveGoals(userId, body);
        return ResponseEntity.ok(learnerProfileService.goalsToMap(saved));
    }

    @GetMapping("/mistakes/{userId}")
    public ResponseEntity<Map<String, Object>> getMistakes(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "false") boolean dueOnly) {
        SecurityUtils.assertUserAccess(userId);
        List<Map<String, Object>> cards = mistakeSrsService.listMistakeCards(userId, dueOnly);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "count", cards.size(),
                "dueCount", mistakeSrsService.countDueMistakes(userId),
                "cards", cards
        ));
    }

    @PostMapping("/mistakes/sync")
    public ResponseEntity<Map<String, Object>> syncMistakes(
            @RequestParam(required = false) Long userId,
            @RequestBody List<Map<String, Object>> entries) {
        Long resolvedUserId = SecurityUtils.requireCurrentUserId();
        if (userId != null) {
            SecurityUtils.assertUserAccess(userId);
        }
        Map<String, Object> result = mistakeSrsService.syncFromLocal(resolvedUserId, entries);
        learnerProfileService.invalidateCache(resolvedUserId);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/mistakes/{cardId}/review")
    public ResponseEntity<Map<String, Object>> reviewMistake(
            @PathVariable Long cardId,
            @RequestBody Map<String, Object> body) {
        Long userId = SecurityUtils.requireCurrentUserId();
        Integer rating = body.get("rating") instanceof Number n ? n.intValue() : null;
        if (rating == null) {
            Boolean remembered = Boolean.TRUE.equals(body.get("remembered"));
            rating = remembered ? 3 : 1;
        }
        Map<String, Object> result = mistakeSrsService.submitReview(userId, cardId, rating);
        learnerProfileService.invalidateCache(userId);
        boolean ok = Boolean.TRUE.equals(result.get("success"));
        return ResponseEntity.status(ok ? 200 : 400).body(result);
    }
}
