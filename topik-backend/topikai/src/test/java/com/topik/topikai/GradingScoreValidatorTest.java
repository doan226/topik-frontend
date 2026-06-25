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

    @Test
    void defaultsExtendedReportFieldsWhenMissing() throws Exception {
        String raw = "{\"total_score\": 40, \"criteria_scores\": {\"ngu_phap\":10,\"tu_vung\":10,\"cau_truc\":10,\"noi_dung\":10}}";
        String result = validator.validateAndNormalize(raw, 50);
        JsonNode node = new ObjectMapper().readTree(result);
        assertTrue(node.get("detailed_criteria").isArray());
        assertTrue(node.get("paragraph_analysis").isArray());
        assertTrue(node.get("roadmap").isArray());
        assertTrue(node.get("similar_questions").isArray());
        assertTrue(node.get("swot").isObject());
        assertTrue(node.get("swot").get("S").isArray());
        assertTrue(node.get("level_diagnosis").isObject());
        assertTrue(node.get("sample_answers").isObject());
        assertTrue(node.get("sample_answers").has("co_ban"));
        assertTrue(node.get("sample_answers").has("nang_cao"));
    }

    @Test
    void sampleAnswersFallBackToNativeSuggestion() throws Exception {
        String raw = "{\"total_score\": 20, \"criteria_scores\": {}, \"native_suggestion\": \"고쳐 보세요\"}";
        String result = validator.validateAndNormalize(raw, 50);
        JsonNode node = new ObjectMapper().readTree(result);
        assertEquals("고쳐 보세요", node.get("sample_answers").get("co_ban").asText());
    }

    @Test
    void computesGradeLetterFromRatio() throws Exception {
        String raw = "{\"total_score\": 42, \"criteria_scores\": {\"ngu_phap\":11,\"tu_vung\":11,\"cau_truc\":10,\"noi_dung\":10}}";
        JsonNode node = new ObjectMapper().readTree(validator.validateAndNormalize(raw, 50));
        assertEquals(42, node.get("total_score").asInt());
        assertEquals("A", node.get("grade_letter").asText());
    }

    @Test
    void keepsFourAxisCriteriaSumEqualToTotal() throws Exception {
        String raw = "{\"total_score\": 80, \"criteria_scores\": {\"ngu_phap\":20,\"tu_vung\":18,\"cau_truc\":21,\"noi_dung\":21}}";
        JsonNode node = new ObjectMapper().readTree(validator.validateAndNormalize(raw, 100));
        assertEquals(80, node.get("total_score").asInt());
        assertEquals("A", node.get("grade_letter").asText());
    }
}
