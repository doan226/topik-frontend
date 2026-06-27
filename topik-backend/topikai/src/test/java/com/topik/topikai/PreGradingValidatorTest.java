package com.topik.topikai;

import com.topik.topikai.dto.GradingContext;
import com.topik.topikai.service.GradingPromptBuilder;
import com.topik.topikai.service.GradingScoreValidator;
import com.topik.topikai.service.PreGradingValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class PreGradingValidatorTest {

    private PreGradingValidator validator;
    private GradingPromptBuilder promptBuilder;
    private GradingScoreValidator scoreValidator;

    @BeforeEach
    void setUp() {
        validator = new PreGradingValidator();
        promptBuilder = new GradingPromptBuilder();
        scoreValidator = new GradingScoreValidator();
    }

    @Test
    void countKoreanCharsIgnoresWhitespace() {
        assertEquals(3, PreGradingValidator.countKoreanChars("가 나 다"));
        assertEquals(0, PreGradingValidator.countKoreanChars("   "));
    }

    @Test
    void flagsQ53CharCountOutOfRange() {
        GradingContext ctx = new GradingContext(53, "가".repeat(150), "", "", 30, 3553, 35);
        Map<String, Object> result = validator.validate(ctx);
        assertTrue((Boolean) result.get("charCountOutOfRange"));
        assertEquals(150, result.get("koreanCharCount"));
    }

    @Test
    void flagsWrongSpeechLevelForQ51() {
        GradingContext ctx = new GradingContext(51, "저는 학교에 가요.", "prompt", "answer", 10, 3551, 35);
        Map<String, Object> result = validator.validate(ctx);
        assertTrue((Boolean) result.get("wrongSpeechLevel"));
    }

    @Test
    void flagsChartDataMismatchForQ53() {
        GradingContext ctx = new GradingContext(
                53,
                "30대는 공연장이 많았다.",
                "",
                "official",
                30,
                3553,
                35
        );
        Map<String, Object> result = validator.validate(ctx);
        assertTrue((Boolean) result.get("chartDataMismatch"));
        assertFalse(((java.util.List<?>) result.get("chartMissingFigures")).isEmpty());
    }

    @Test
    void parsesQ54SubPromptsAndDetectsMissingPoints() {
        String prompt = """
                주제에 대해 글을 쓰십시오.
                1. 훌륭한 지도자가 필요한 이유는 무엇인가?
                2. 훌륭한 지도자가 갖추어야 할 조건은 무엇인가?
                3. 그러한 조건을 갖추기 위해 어떤 노력을 해야 하는가?
                """;
        GradingContext ctx = new GradingContext(54, "지도자는 중요하다.", prompt, "answer", 50, 3554, 35);
        Map<String, Object> result = validator.validate(ctx);

        assertEquals(3, ((java.util.List<?>) result.get("q54SubPrompts")).size());
        assertTrue((Boolean) result.get("q54MissingPoints"));
    }

    @Test
    void flagsQ53LineBreaksAndPersonalOpinion() {
        GradingContext ctx = new GradingContext(
                53,
                "이 그래프는 변화를 보여 준다.\n저는 이것이 좋다고 생각한다.",
                "",
                "official",
                30,
                3553,
                35
        );
        Map<String, Object> result = validator.validate(ctx);
        assertTrue((Boolean) result.get("q53HasLineBreaks"));
        assertTrue((Boolean) result.get("q53PersonalOpinion"));
    }

    @Test
    void flagsQ54BulletList() {
        String essay = "1. 첫째 이유이다.\n2. 둘째 이유이다.\n3. 셋째 이유이다.";
        GradingContext ctx = new GradingContext(54, essay, "1. 이유?\n2. 조건?\n3. 노력?", "model", 50, 3554, 35);
        Map<String, Object> result = validator.validate(ctx);
        assertTrue((Boolean) result.get("q54HasBulletList"));
    }

    @Test
    void promptBuilderInjectsPreValidationAndQ54Hints() {
        String prompt = """
                1. 이유는?
                2. 조건은?
                3. 노력은?
                """;
        Map<String, Object> preValidation = Map.of(
                "koreanCharCount", 650,
                "charCountOutOfRange", false,
                "wrongSpeechLevel", false,
                "chartDataMismatch", false,
                "q54MissingPoints", false,
                "q54SubPrompts", PreGradingValidator.parseQ54SubPrompts(prompt),
                "q54MissingPointDetails", java.util.List.of(),
                "chartMissingFigures", java.util.List.of()
        );
        GradingContext ctx = new GradingContext(54, "essay", prompt, "model", 50, 3554, 35, preValidation);
        String built = promptBuilder.build(ctx);

        assertTrue(built.contains("KIỂM TRA TRƯỚC CHẤM"));
        assertTrue(built.contains("3 GỢI Ý CON CẦN CHẤM RIÊNG"));
        assertTrue(built.contains("rewrite_tasks"));
        assertTrue(built.contains("structure_map"));
        assertTrue(built.contains("1. 이유는?"));
    }

    @Test
    void scoreValidatorAppliesHardDeductions() throws Exception {
        String raw = """
                {"total_score": 28, "criteria_scores": {"nội_dung": 10, "tổ_chức": 9, "ngôn_ngữ": 9},
                 "grammar_errors": [], "content_issues": [], "native_suggestion": "ok"}""";
        Map<String, Object> preValidation = Map.of(
                "charCountOutOfRange", true,
                "wrongSpeechLevel", false,
                "chartDataMismatch", true,
                "q54MissingPoints", false
        );
        String result = scoreValidator.validateAndNormalize(raw, 30, preValidation);
        var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(result);
        assertTrue(node.get("total_score").asInt() <= 15);
        assertTrue(node.has("pre_validation"));
    }
}
