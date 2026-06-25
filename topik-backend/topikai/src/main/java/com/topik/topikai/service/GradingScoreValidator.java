package com.topik.topikai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class GradingScoreValidator {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String validateAndNormalize(String rawJson, int maxScore) {
        return validateAndNormalize(rawJson, maxScore, Map.of());
    }

    public String validateAndNormalize(String rawJson, int maxScore, Map<String, Object> preValidation) {
        try {
            String clean = extractJsonObject(rawJson);
            JsonNode root = objectMapper.readTree(clean);
            if (!root.isObject()) {
                return fallbackParseError();
            }

            ObjectNode obj = (ObjectNode) root;
            if (obj.path("apiError").asBoolean(false)) {
                return objectMapper.writeValueAsString(obj);
            }

            int totalScore = obj.path("total_score").asInt(0);
            int criteriaSum = sumCriteriaScores(obj.path("criteria_scores"));
            int grammarCount = countArray(obj.path("grammar_errors"));

            totalScore = Math.max(0, Math.min(maxScore, totalScore));

            if (criteriaSum > 0 && totalScore > criteriaSum + 1) {
                totalScore = criteriaSum;
            }

            double highThreshold = maxScore * 0.8;
            if (totalScore > highThreshold && grammarCount >= 3) {
                int reduction = Math.max(1, (int) Math.round(totalScore * 0.15));
                totalScore = Math.max(0, totalScore - reduction);
                appendJustification(obj,
                        "Đã giảm " + reduction + " điểm vì bài có ≥3 lỗi ngữ pháp nhưng điểm ban đầu quá cao.");
            }

            totalScore = applyPreValidationDeductions(totalScore, maxScore, preValidation, obj);

            obj.put("total_score", totalScore);
            attachPreValidation(obj, preValidation);
            ensureExtendedFields(obj);
            ensureArrays(obj);
            obj.put("grade_letter", computeGradeLetter(totalScore, maxScore));
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            System.err.println("GradingScoreValidator: " + e.getMessage());
            return fallbackParseError();
        }
    }

    private int applyPreValidationDeductions(
            int totalScore,
            int maxScore,
            Map<String, Object> preValidation,
            ObjectNode obj
    ) {
        if (preValidation == null || preValidation.isEmpty()) {
            return totalScore;
        }

        int adjusted = totalScore;

        if (isFlag(preValidation, "charCountOutOfRange")) {
            int deduction = maxScore >= 30 ? 4 : 2;
            adjusted = Math.max(0, adjusted - deduction);
            appendJustification(obj, "Đã trừ " + deduction + " điểm vì độ dài ký tự Hàn ngoài yêu cầu.");
        }

        if (isFlag(preValidation, "wrongSpeechLevel")) {
            int deduction = maxScore >= 30 ? 4 : 3;
            adjusted = Math.max(0, adjusted - deduction);
            appendJustification(obj, "Đã trừ " + deduction + " điểm vì dùng 해요체 thay vì thể trang trọng.");
        }

        if (isFlag(preValidation, "chartDataMismatch")) {
            int cap = Math.min(maxScore, 15);
            if (adjusted > cap) {
                adjusted = cap;
                appendJustification(obj, "Đã giới hạn điểm ≤15 vì sai/thiếu nhiều số liệu biểu đồ.");
            }
        }

        if (isFlag(preValidation, "q54MissingPoints")) {
            int missingCount = countMissingQ54Points(preValidation);
            int deduction = Math.max(3, missingCount * 4);
            adjusted = Math.max(0, adjusted - deduction);
            appendJustification(obj, "Đã trừ " + deduction + " điểm vì thiếu " + missingCount + " ý gợi ý câu 54.");
        }

        return adjusted;
    }

    private int countMissingQ54Points(Map<String, Object> preValidation) {
        Object details = preValidation.get("q54MissingPointDetails");
        if (details instanceof List<?> list && !list.isEmpty()) {
            return list.size();
        }
        return 1;
    }

    private boolean isFlag(Map<String, Object> preValidation, String key) {
        Object value = preValidation.get(key);
        return value instanceof Boolean bool && bool;
    }

    private void attachPreValidation(ObjectNode obj, Map<String, Object> preValidation) {
        if (preValidation == null || preValidation.isEmpty()) {
            return;
        }
        obj.set("pre_validation", objectMapper.valueToTree(preValidation));
    }

    public String extractJsonObject(String raw) {
        if (raw == null) {
            return "{}";
        }
        String trimmed = raw.trim();
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start != -1 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }

    private int sumCriteriaScores(JsonNode criteria) {
        if (criteria == null || !criteria.isObject()) {
            return 0;
        }
        int sum = 0;
        var fields = criteria.fields();
        while (fields.hasNext()) {
            var entry = fields.next();
            sum += entry.getValue().asInt(0);
        }
        return sum;
    }

    private int countArray(JsonNode node) {
        return node != null && node.isArray() ? node.size() : 0;
    }

    private void ensureArrays(ObjectNode obj) {
        if (!obj.has("grammar_errors") || !obj.get("grammar_errors").isArray()) {
            obj.set("grammar_errors", objectMapper.createArrayNode());
        }
        if (!obj.has("content_issues") || !obj.get("content_issues").isArray()) {
            obj.set("content_issues", objectMapper.createArrayNode());
        }
        if (!obj.has("criteria_scores") || !obj.get("criteria_scores").isObject()) {
            obj.set("criteria_scores", objectMapper.createObjectNode());
        }
    }

    private void ensureExtendedFields(ObjectNode obj) {
        if (!obj.has("rewrite_tasks") || !obj.get("rewrite_tasks").isArray()) {
            obj.set("rewrite_tasks", objectMapper.createArrayNode());
        }
        if (!obj.has("structure_map") || !obj.get("structure_map").isObject()) {
            obj.set("structure_map", objectMapper.createObjectNode());
        }
        if (!obj.has("model_phrases_to_learn") || !obj.get("model_phrases_to_learn").isArray()) {
            obj.set("model_phrases_to_learn", objectMapper.createArrayNode());
        }
        if (!obj.has("estimated_level")) {
            obj.put("estimated_level", "");
        }
        if (!obj.has("detailed_criteria") || !obj.get("detailed_criteria").isArray()) {
            obj.set("detailed_criteria", objectMapper.createArrayNode());
        }
        if (!obj.has("paragraph_analysis") || !obj.get("paragraph_analysis").isArray()) {
            obj.set("paragraph_analysis", objectMapper.createArrayNode());
        }
        if (!obj.has("roadmap") || !obj.get("roadmap").isArray()) {
            obj.set("roadmap", objectMapper.createArrayNode());
        }
        if (!obj.has("similar_questions") || !obj.get("similar_questions").isArray()) {
            obj.set("similar_questions", objectMapper.createArrayNode());
        }
        if (!obj.has("swot") || !obj.get("swot").isObject()) {
            ObjectNode swot = objectMapper.createObjectNode();
            swot.set("S", objectMapper.createArrayNode());
            swot.set("W", objectMapper.createArrayNode());
            swot.set("O", objectMapper.createArrayNode());
            swot.set("T", objectMapper.createArrayNode());
            obj.set("swot", swot);
        }
        if (!obj.has("level_diagnosis") || !obj.get("level_diagnosis").isObject()) {
            obj.set("level_diagnosis", objectMapper.createObjectNode());
        }
        if (!obj.has("sample_answers") || !obj.get("sample_answers").isObject()) {
            ObjectNode sample = objectMapper.createObjectNode();
            String fallback = obj.path("native_suggestion").asText("");
            sample.put("co_ban", fallback);
            sample.put("nang_cao", "");
            obj.set("sample_answers", sample);
        }
    }

    private String computeGradeLetter(int totalScore, int maxScore) {
        if (maxScore <= 0) {
            return "";
        }
        double ratio = (double) totalScore / maxScore;
        if (ratio >= 0.9) return "A+";
        if (ratio >= 0.8) return "A";
        if (ratio >= 0.7) return "B+";
        if (ratio >= 0.6) return "B";
        if (ratio >= 0.5) return "C+";
        if (ratio >= 0.4) return "C";
        return "D";
    }

    private void appendJustification(ObjectNode obj, String note) {
        String existing = obj.path("score_justification").asText("");
        if (existing.isBlank()) {
            obj.put("score_justification", note);
        } else if (!existing.contains(note)) {
            obj.put("score_justification", existing + " " + note);
        }
    }

    private String fallbackParseError() {
        try {
            ObjectNode obj = objectMapper.createObjectNode();
            obj.put("total_score", 0);
            obj.set("criteria_scores", objectMapper.createObjectNode());
            obj.set("grammar_errors", objectMapper.createArrayNode());
            obj.set("content_issues", objectMapper.createArrayNode());
            obj.set("rewrite_tasks", objectMapper.createArrayNode());
            obj.set("structure_map", objectMapper.createObjectNode());
            obj.set("model_phrases_to_learn", objectMapper.createArrayNode());
            obj.put("estimated_level", "");
            obj.set("detailed_criteria", objectMapper.createArrayNode());
            obj.set("paragraph_analysis", objectMapper.createArrayNode());
            obj.set("roadmap", objectMapper.createArrayNode());
            obj.set("similar_questions", objectMapper.createArrayNode());
            ObjectNode swot = objectMapper.createObjectNode();
            swot.set("S", objectMapper.createArrayNode());
            swot.set("W", objectMapper.createArrayNode());
            swot.set("O", objectMapper.createArrayNode());
            swot.set("T", objectMapper.createArrayNode());
            obj.set("swot", swot);
            obj.set("level_diagnosis", objectMapper.createObjectNode());
            ObjectNode sample = objectMapper.createObjectNode();
            sample.put("co_ban", "");
            sample.put("nang_cao", "");
            obj.set("sample_answers", sample);
            obj.put("grade_letter", "");
            obj.put("native_suggestion", "Lỗi bóc tách điểm.");
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{\"total_score\": 0, \"criteria_scores\": {}, \"grammar_errors\": [], \"content_issues\": [], \"rewrite_tasks\": [], \"structure_map\": {}, \"model_phrases_to_learn\": [], \"estimated_level\": \"\", \"detailed_criteria\": [], \"paragraph_analysis\": [], \"roadmap\": [], \"similar_questions\": [], \"swot\": {\"S\":[],\"W\":[],\"O\":[],\"T\":[]}, \"level_diagnosis\": {}, \"sample_answers\": {\"co_ban\":\"\",\"nang_cao\":\"\"}, \"grade_letter\": \"\", \"native_suggestion\": \"Lỗi bóc tách điểm.\"}";
        }
    }
}
