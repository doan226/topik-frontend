package com.topik.topikai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.service.GradingScoreValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GradingScoreValidatorTest {

    private GradingScoreValidator validator;

    @BeforeEach
    void setUp() {
        validator = new GradingScoreValidator();
    }

    @Test
    void clampsTotalScoreToMax() throws Exception {
        String raw = """
                {"total_score": 99, "criteria_scores": {"nội_dung": 10, "tổ_chức": 8, "ngôn_ngữ": 7},
                 "grammar_errors": [], "content_issues": [], "native_suggestion": "ok"}""";
        String result = validator.validateAndNormalize(raw, 30);
        JsonNode node = new ObjectMapper().readTree(result);
        assertEquals(25, node.get("total_score").asInt());
    }

    @Test
    void reducesHighScoreWhenManyGrammarErrors() throws Exception {
        String raw = """
                {"total_score": 9, "criteria_scores": {"ngữ_pháp_và_từ_vựng": 5, "ý_nghĩa_ngữ_cảnh": 4},
                 "grammar_errors": [
                   {"sai":"a","đúng":"b","lý_do":"1","mức_độ":"nặng"},
                   {"sai":"c","đúng":"d","lý_do":"2","mức_độ":"nặng"},
                   {"sai":"e","đúng":"f","lý_do":"3","mức_độ":"nhẹ"}
                 ],
                 "content_issues": [], "native_suggestion": "ok"}""";
        String result = validator.validateAndNormalize(raw, 10);
        JsonNode node = new ObjectMapper().readTree(result);
        assertTrue(node.get("total_score").asInt() <= 8);
        assertTrue(node.path("score_justification").asText().contains("giảm"));
    }

    @Test
    void preservesApiErrorResponses() throws Exception {
        String raw = "{\"total_score\": 0, \"apiError\": true, \"native_suggestion\": \"quota\"}";
        String result = validator.validateAndNormalize(raw, 10);
        JsonNode node = new ObjectMapper().readTree(result);
        assertTrue(node.get("apiError").asBoolean());
    }

    @Test
    void extractsJsonFromMarkdownWrappedResponse() {
        String wrapped = "Here is JSON:\n```json\n{\"total_score\": 5}\n```";
        String extracted = validator.extractJsonObject(wrapped);
        assertTrue(extracted.startsWith("{"));
        assertTrue(extracted.endsWith("}"));
    }

    @Test
    void ensuresMissingArraysAreCreated() throws Exception {
        String raw = "{\"total_score\": 3, \"criteria_scores\": {}}";
        String result = validator.validateAndNormalize(raw, 10);
        JsonNode node = new ObjectMapper().readTree(result);
        assertTrue(node.get("grammar_errors").isArray());
        assertTrue(node.get("content_issues").isArray());
    }
}
