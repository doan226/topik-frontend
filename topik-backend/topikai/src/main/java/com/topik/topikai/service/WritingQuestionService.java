package com.topik.topikai.service;

import com.topik.topikai.dto.GradingContext;
import com.topik.topikai.dto.SubmitRequest;
import com.topik.topikai.dto.WritingQuestionDto;
import com.topik.topikai.entity.WritingQuestion;
import com.topik.topikai.repository.WritingQuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.HashSet;
import java.util.Set;

@Service
public class WritingQuestionService {

    @Autowired
    private WritingQuestionRepository repository;

    @Transactional
    public Map<String, Object> upsertAll(List<WritingQuestionDto> dtos) {
        int inserted = 0;
        int updated = 0;
        int deleted = 0;
        Set<Integer> keepIds = new HashSet<>();
        List<Map<String, Object>> saved = new ArrayList<>();

        for (WritingQuestionDto dto : dtos) {
            int externalId = dto.resolveExternalId();
            keepIds.add(externalId);
            Optional<WritingQuestion> existing = repository.findByExternalId(externalId);
            WritingQuestion q = existing.orElseGet(WritingQuestion::new);
            if (existing.isPresent()) {
                updated++;
            } else {
                inserted++;
            }
            applyDto(q, dto, externalId);
            repository.save(q);
            saved.add(toDto(q));
        }

        for (WritingQuestion row : repository.findAll()) {
            if (row.getExternalId() != null && !keepIds.contains(row.getExternalId())) {
                repository.delete(row);
                deleted++;
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("inserted", inserted);
        result.put("updated", updated);
        result.put("deleted", deleted);
        result.put("total", saved.size());
        result.put("questions", saved);
        return result;
    }

    @Transactional
    public List<Map<String, Object>> upsertGenerated(List<WritingQuestionDto> dtos) {
        Map<String, Object> result = upsertAll(dtos);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> questions = (List<Map<String, Object>>) result.get("questions");
        return questions;
    }

    private void applyDto(WritingQuestion q, WritingQuestionDto dto, int externalId) {
        q.setExternalId(externalId);
        q.setTopik(dto.getTopik());
        q.setType(dto.getType());
        q.setTimeLimit(dto.getTimeLimit() > 0 ? dto.getTimeLimit() : defaultTimeLimit(dto.getType()));
        q.setMaxScore(dto.getMaxScore() > 0 ? dto.getMaxScore() : defaultMaxScore(dto.getType()));
        q.setPrompt(dto.getPrompt());
        q.setAnswer(dto.getAnswer());
        q.setImageUrl(dto.getImageUrl());
        if (dto.getSource() != null && !dto.getSource().isBlank()) {
            q.setSource(dto.getSource());
        } else if (dto.getExpansionSet() != null && dto.getExpansionSet() > 0) {
            q.setSource("expansion");
        } else {
            q.setSource("official");
        }
        q.setExpansionSet(dto.getExpansionSet());
    }

    private int defaultTimeLimit(int type) {
        return switch (type) {
            case 53 -> 900;
            case 54 -> 3000;
            default -> 150;
        };
    }

    private int defaultMaxScore(int type) {
        return switch (type) {
            case 53 -> 30;
            case 54 -> 50;
            default -> 10;
        };
    }

    public GradingContext resolveGradingContext(SubmitRequest request) {
        String prompt = blankToNull(request.getQuestionPrompt());
        String answer = blankToNull(request.getReferenceAnswer());
        int maxScore = defaultMaxScore(request.getQuestionNumber());

        Optional<WritingQuestion> fromDb = Optional.empty();
        if (request.getQuestionId() != null) {
            fromDb = repository.findByExternalId(request.getQuestionId());
        }
        if (fromDb.isEmpty() && request.getTopikSession() != null) {
            int externalId = request.getTopikSession() * 100 + request.getQuestionNumber();
            fromDb = repository.findByExternalId(externalId);
        }

        if (fromDb.isPresent()) {
            WritingQuestion q = fromDb.get();
            if (prompt == null) {
                prompt = blankToNull(q.getPrompt());
            }
            if (answer == null) {
                answer = blankToNull(q.getAnswer());
            }
            if (q.getMaxScore() > 0) {
                maxScore = q.getMaxScore();
            }
        }

        return new GradingContext(
                request.getQuestionNumber(),
                request.getContent(),
                prompt != null ? prompt : "",
                answer != null ? answer : "",
                maxScore,
                request.getQuestionId(),
                request.getTopikSession()
        );
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    public Map<String, Object> toDto(WritingQuestion q) {
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
