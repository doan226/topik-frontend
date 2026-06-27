package com.topik.topikai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.topik.topikai.dto.GradingContext;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class PreGradingValidator {

    private static final Pattern HAYO_SPEECH_PATTERN = Pattern.compile(
            "(?:해요|했어요|할게요|거예요|어요|아요|예요|세요|니까요|가요|나요|지요|죠|해요\\.)"
    );
    private static final Pattern Q54_SUB_PROMPT_PATTERN = Pattern.compile(
            "(?m)^\\s*([1-3])\\.\\s*(.+)$"
    );
    private static final Pattern CHART_KEY_FIGURE_PATTERN = Pattern.compile(
            "\\d+(?:\\.\\d+)?%|\\d+대|\\d+만\\s*명|\\d+조"
    );
    private static final Pattern KOREAN_KEYWORD_PATTERN = Pattern.compile("[가-힣]{2,}");
    private static final Pattern PERSONAL_OPINION_PATTERN = Pattern.compile(
            "저는|제\\s*생각|내\\s*생각|생각한다|생각합니다|생각해|것\\s*같다|것\\s*같습니다"
    );
    private static final Pattern BULLET_LIST_PATTERN = Pattern.compile(
            "(?m)^\\s*(?:\\d+[.)]|[-+•·▪◦*])\\s+"
    );

    private final ObjectMapper objectMapper = new ObjectMapper();
    private JsonNode chartAnswersRoot;

    public Map<String, Object> validate(GradingContext ctx) {
        Map<String, Object> result = new LinkedHashMap<>();
        int questionType = ctx.getQuestionType();
        String studentText = ctx.getStudentText();
        int charCount = countCharsForQuestion(questionType, studentText);

        result.put("koreanCharCount", charCount);
        result.put("charCountOutOfRange", isCharCountOutOfRange(questionType, charCount));
        result.put("wrongSpeechLevel", isWrongSpeechLevel(questionType, studentText));

        if (questionType == 53) {
            ChartCheck chartCheck = checkChartData(ctx, studentText);
            result.put("chartDataMismatch", chartCheck.mismatch);
            result.put("chartMissingFigures", chartCheck.missingFigures);
            result.put("q53HasLineBreaks", hasMultipleParagraphs(studentText));
            result.put("q53PersonalOpinion", hasPersonalOpinion(studentText));
        } else {
            result.put("chartDataMismatch", false);
            result.put("chartMissingFigures", List.of());
            result.put("q53HasLineBreaks", false);
            result.put("q53PersonalOpinion", false);
        }

        if (questionType == 54) {
            List<String> subPrompts = parseQ54SubPrompts(ctx.getQuestionPrompt());
            List<String> missingPoints = findMissingQ54Points(studentText, subPrompts);
            result.put("q54SubPrompts", subPrompts);
            result.put("q54MissingPoints", !missingPoints.isEmpty());
            result.put("q54MissingPointDetails", missingPoints);
            result.put("q54HasBulletList", hasBulletList(studentText));
        } else {
            result.put("q54SubPrompts", List.of());
            result.put("q54MissingPoints", false);
            result.put("q54MissingPointDetails", List.of());
            result.put("q54HasBulletList", false);
        }

        return result;
    }

    public static int countKoreanChars(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        int count = 0;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (Character.isWhitespace(c)) {
                continue;
            }
            if (c >= 0xAC00 && c <= 0xD7A3) {
                count++;
            } else if (c >= 0x3130 && c <= 0x318F) {
                count++;
            } else if (c >= 0x1100 && c <= 0x11FF) {
                count++;
            }
        }
        return count;
    }

    /**
     * 원고지 (manuscript grid) count: every visible character — Korean, spaces,
     * punctuation, numbers, letters — fills one cell. Line breaks do not count.
     * Matches the official TOPIK 글자 수 (띄어쓰기 포함) used for câu 53/54.
     */
    public static int countWongojiChars(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        int count = 0;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '\n' || c == '\r') {
                continue;
            }
            count++;
        }
        return count;
    }

    /** Câu 53/54 are counted on the 원고지 grid; other types count Korean syllables. */
    public static int countCharsForQuestion(int questionType, String text) {
        if (questionType == 53 || questionType == 54) {
            return countWongojiChars(text);
        }
        return countKoreanChars(text);
    }

    private boolean isCharCountOutOfRange(int questionType, int koreanCharCount) {
        return switch (questionType) {
            case 53 -> koreanCharCount < 200 || koreanCharCount > 300;
            case 54 -> koreanCharCount < 600 || koreanCharCount > 700;
            default -> false;
        };
    }

    private boolean hasMultipleParagraphs(String studentText) {
        if (studentText == null || studentText.isBlank()) {
            return false;
        }
        String[] paragraphs = studentText.trim().split("\\R{1,}");
        int nonEmpty = 0;
        for (String p : paragraphs) {
            if (!p.isBlank()) {
                nonEmpty++;
            }
        }
        return nonEmpty > 1;
    }

    private boolean hasPersonalOpinion(String studentText) {
        if (studentText == null || studentText.isBlank()) {
            return false;
        }
        return PERSONAL_OPINION_PATTERN.matcher(studentText).find();
    }

    private boolean hasBulletList(String studentText) {
        if (studentText == null || studentText.isBlank()) {
            return false;
        }
        return BULLET_LIST_PATTERN.matcher(studentText).find();
    }

    private boolean isWrongSpeechLevel(int questionType, String studentText) {
        if (questionType != 51 && questionType != 54) {
            return false;
        }
        if (studentText == null || studentText.isBlank()) {
            return false;
        }
        return HAYO_SPEECH_PATTERN.matcher(studentText).find();
    }

    private ChartCheck checkChartData(GradingContext ctx, String studentText) {
        String answerKey = resolveChartAnswerKey(ctx);
        if (answerKey == null) {
            return new ChartCheck(false, List.of());
        }

        String officialAnswer = loadChartAnswer(answerKey);
        if (officialAnswer == null || officialAnswer.isBlank()) {
            return new ChartCheck(false, List.of());
        }

        List<String> keyFigures = extractChartKeyFigures(officialAnswer);
        if (keyFigures.isEmpty()) {
            return new ChartCheck(false, List.of());
        }

        List<String> missing = new ArrayList<>();
        for (String figure : keyFigures) {
            if (!studentText.contains(figure)) {
                missing.add(figure);
            }
        }

        int allowedMissing = Math.max(1, keyFigures.size() / 4);
        boolean mismatch = missing.size() > allowedMissing;
        return new ChartCheck(mismatch, missing);
    }

    private String resolveChartAnswerKey(GradingContext ctx) {
        if (ctx.getQuestionId() != null) {
            return String.valueOf(ctx.getQuestionId());
        }
        if (ctx.getTopikSession() != null) {
            return String.valueOf(ctx.getTopikSession() * 100 + 53);
        }
        return null;
    }

    private String loadChartAnswer(String answerKey) {
        JsonNode root = loadChartAnswersRoot();
        if (root == null) {
            return null;
        }
        JsonNode answers = root.path("answers");
        JsonNode answerNode = answers.path(answerKey);
        return answerNode.isMissingNode() ? null : answerNode.asText();
    }

    private JsonNode loadChartAnswersRoot() {
        if (chartAnswersRoot != null) {
            return chartAnswersRoot;
        }
        try (InputStream in = new ClassPathResource("chart-53-answers.json").getInputStream()) {
            chartAnswersRoot = objectMapper.readTree(in);
            return chartAnswersRoot;
        } catch (Exception e) {
            System.err.println("PreGradingValidator: cannot load chart-53-answers.json — " + e.getMessage());
            return null;
        }
    }

    static List<String> extractChartKeyFigures(String officialAnswer) {
        List<String> figures = new ArrayList<>();
        Matcher matcher = CHART_KEY_FIGURE_PATTERN.matcher(officialAnswer);
        while (matcher.find()) {
            String figure = matcher.group();
            if (!figures.contains(figure)) {
                figures.add(figure);
            }
        }
        return figures;
    }

    public static List<String> parseQ54SubPrompts(String questionPrompt) {
        List<String> prompts = new ArrayList<>();
        if (questionPrompt == null || questionPrompt.isBlank()) {
            return prompts;
        }
        Matcher matcher = Q54_SUB_PROMPT_PATTERN.matcher(questionPrompt);
        Map<Integer, String> ordered = new HashMap<>();
        while (matcher.find()) {
            int index = Integer.parseInt(matcher.group(1));
            ordered.put(index, matcher.group(2).trim());
        }
        for (int i = 1; i <= 3; i++) {
            if (ordered.containsKey(i)) {
                prompts.add(ordered.get(i));
            }
        }
        return prompts;
    }

    private List<String> findMissingQ54Points(String studentText, List<String> subPrompts) {
        List<String> missing = new ArrayList<>();
        if (subPrompts.isEmpty()) {
            return missing;
        }
        String normalizedStudent = studentText != null ? studentText : "";
        for (String subPrompt : subPrompts) {
            if (!coversSubPrompt(normalizedStudent, subPrompt)) {
                missing.add(subPrompt);
            }
        }
        return missing;
    }

    private boolean coversSubPrompt(String studentText, String subPrompt) {
        List<String> keywords = extractKeywords(subPrompt);
        if (keywords.isEmpty()) {
            return true;
        }
        int hits = 0;
        for (String keyword : keywords) {
            if (studentText.contains(keyword)) {
                hits++;
            }
        }
        int requiredHits = Math.max(1, (int) Math.ceil(keywords.size() * 0.34));
        return hits >= requiredHits;
    }

    private List<String> extractKeywords(String text) {
        List<String> keywords = new ArrayList<>();
        Matcher matcher = KOREAN_KEYWORD_PATTERN.matcher(text);
        while (matcher.find()) {
            String word = matcher.group();
            if (isStopWord(word)) {
                continue;
            }
            if (!keywords.contains(word)) {
                keywords.add(word);
            }
        }
        return keywords;
    }

    private boolean isStopWord(String word) {
        return switch (word) {
            case "무엇", "어떤", "그러한", "해야", "하는가", "있는가", "대해", "위해", "이유", "조건", "노력" -> true;
            default -> false;
        };
    }

    private record ChartCheck(boolean mismatch, List<String> missingFigures) {
    }
}
