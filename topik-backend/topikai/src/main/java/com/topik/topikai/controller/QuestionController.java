package com.topik.topikai.controller;

import com.topik.topikai.entity.WritingQuestion;
import com.topik.topikai.repository.WritingQuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/questions")
public class QuestionController {

    @Autowired
    private WritingQuestionRepository repository;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll(
            @RequestParam(required = false) Integer topik,
            @RequestParam(required = false) Integer type) {

        List<WritingQuestion> list = repository.findAllByOrderByTopikAscTypeAsc();

        return ResponseEntity.ok(
                list.stream()
                        .filter(q -> topik == null || q.getTopik() == topik)
                        .filter(q -> type == null || q.getType() == type)
                        .map(this::toDto)
                        .collect(Collectors.toList())
        );
    }

    private Map<String, Object> toDto(WritingQuestion q) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", q.getExternalId() != null ? q.getExternalId() : q.getId());
        m.put("topik", q.getTopik());
        m.put("type", q.getType());
        m.put("timeLimit", q.getTimeLimit());
        m.put("maxScore", q.getMaxScore());
        m.put("prompt", q.getPrompt());
        m.put("answer", q.getAnswer());
        m.put("imageUrl", q.getImageUrl());
        m.put("source", q.getSource());
        m.put("expansionSet", q.getExpansionSet());
        return m;
    }
}
