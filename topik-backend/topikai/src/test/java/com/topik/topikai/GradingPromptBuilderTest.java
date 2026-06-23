package com.topik.topikai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.dto.GradingContext;
import com.topik.topikai.service.GradingPromptBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class GradingPromptBuilderTest {

    private GradingPromptBuilder builder;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        builder = new GradingPromptBuilder();
        objectMapper = new ObjectMapper();
    }

    @Test
    void q51PromptIncludesQuestionAndReferenceAnswer() {
        GradingContext ctx = new GradingContext(
                51,
                "㉠ 테스트입니다.",
                "그래서 지금 저는 ( ㉠ ).",
                "㉠ 제가 쓰던 물건들을 정리하고 있습니다.",
                10,
                3551,
                35
        );
        String prompt = builder.build(ctx);
        assertTrue(prompt.contains("Câu 51"));
        assertTrue(prompt.contains("습니다체"));
        assertTrue(prompt.contains("그래서 지금 저는 ( ㉠ )"));
        assertTrue(prompt.contains("제가 쓰던 물건들을 정리하고 있습니다"));
        assertTrue(prompt.contains("content_issues"));
        assertTrue(prompt.contains("score_justification"));
        assertTrue(prompt.contains("rewrite_tasks"));
        assertTrue(prompt.contains("structure_map"));
    }

    @Test
    void q53UsesReferenceAnswerWhenPromptEmpty() {
        GradingContext ctx = new GradingContext(
                53,
                "30대는 40%였다.",
                "",
                "30대의 경우 공연장이 40%였다.",
                30,
                3553,
                35
        );
        String prompt = builder.build(ctx);
        assertTrue(prompt.contains("GROUND TRUTH"));
        assertTrue(prompt.contains("30대의 경우 공연장이 40%였다"));
        assertTrue(prompt.contains("biểu đồ trên màn hình"));
    }

    @Test
    void q54IncludesCharCount() {
        String essay = "가".repeat(120);
        GradingContext ctx = new GradingContext(54, essay, "주제", "모범", 50, 3554, 35);
        String prompt = builder.build(ctx);
        assertTrue(prompt.contains("120 ký tự"));
        assertTrue(prompt.contains("25–35/50"));
    }

    @ParameterizedTest
    @MethodSource("goldenCases")
    void goldenCasePromptsContainExpectedMarkers(JsonNode testCase) throws Exception {
        GradingContext ctx = new GradingContext(
                testCase.get("questionType").asInt(),
                testCase.get("studentText").asText(),
                testCase.path("questionPrompt").asText(""),
                testCase.get("referenceAnswer").asText(),
                defaultMax(testCase.get("questionType").asInt()),
                null,
                null
        );
        String prompt = builder.build(ctx);
        JsonNode markers = testCase.get("promptMustContain");
        if (markers != null && markers.isArray()) {
            for (JsonNode marker : markers) {
                assertTrue(
                        prompt.contains(marker.asText()),
                        "Case " + testCase.get("id").asText() + " missing: " + marker.asText()
                );
            }
        }
    }

    static Stream<JsonNode> goldenCases() throws Exception {
        return loadGoldenCases().stream();
    }

    static List<JsonNode> loadGoldenCases() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        InputStream in = GradingPromptBuilderTest.class.getResourceAsStream("/grading-golden-cases.json");
        assertNotNull(in, "grading-golden-cases.json not found");
        JsonNode root = mapper.readTree(in);
        List<JsonNode> cases = new ArrayList<>();
        root.forEach(cases::add);
        return cases;
    }

    private static int defaultMax(int type) {
        return switch (type) {
            case 53 -> 30;
            case 54 -> 50;
            default -> 10;
        };
    }
}
