package com.topik.topikai.controller;

import com.topik.topikai.dto.WritingQuestionDto;
import com.topik.topikai.service.GeminiService;
import com.topik.topikai.service.WritingQuestionService;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/questions")
public class AdminQuestionController {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private WritingQuestionService writingQuestionService;

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestParam int topik,
                                      @RequestParam(required = false) String excludeTopics) {
        try {
            String raw = geminiService.generateWritingQuestionSet(topik, excludeTopics);
            JSONObject parsed = new JSONObject(raw);
            if (parsed.has("error")) {
                return ResponseEntity.badRequest().body(parsed.toMap());
            }

            JSONArray arr = parsed.getJSONArray("questions");
            List<WritingQuestionDto> dtos = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject q = arr.getJSONObject(i);
                WritingQuestionDto dto = new WritingQuestionDto();
                dto.setTopik(q.getInt("topik"));
                dto.setType(q.getInt("type"));
                dto.setTimeLimit(q.optInt("timeLimit", 0));
                dto.setMaxScore(q.optInt("maxScore", 0));
                dto.setPrompt(q.getString("prompt"));
                dto.setAnswer(q.getString("answer"));
                dto.setExternalId(q.optInt("externalId", topik * 100 + q.getInt("type")));
                if (q.has("imageUrl") && !q.isNull("imageUrl")) {
                    dto.setImageUrl(q.getString("imageUrl"));
                }
                dtos.add(dto);
            }

            List<Map<String, Object>> saved = writingQuestionService.upsertGenerated(dtos);
            Map<String, Object> body = new HashMap<>();
            body.put("topik", topik);
            body.put("count", saved.size());
            body.put("questions", saved);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(err);
        }
    }

    @PostMapping("/upsert")
    public ResponseEntity<?> upsert(@RequestBody List<WritingQuestionDto> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Danh sách câu hỏi trống."));
        }
        return ResponseEntity.ok(writingQuestionService.upsertAll(dtos));
    }
}
