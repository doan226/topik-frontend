package com.topik.topikai.service;

import com.topik.topikai.dto.GradingContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.concurrent.ThreadLocalRandom;
import java.util.HashMap;
import java.util.Map;

@Service
public class GeminiService {

    @Autowired
    private GradingPromptBuilder gradingPromptBuilder;

    private static final String API_BASE =
            "https://generativelanguage.googleapis.com/v1beta/models/";

    private static final String[] FALLBACK_MODELS = {
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash",
            "gemini-2.0-flash-lite",
            "gemini-flash-latest"
    };

    private static final int MAX_RETRIES = 5;
    private static final long INITIAL_RETRY_MS = 2000;
    private static final long MAX_RETRY_MS = 20000;

    @Value("${gemini.api.key:}")
    private String geminiApiKeyFromProps;

    @Value("${gemini.api.model:gemini-2.5-flash-lite}")
    private String geminiModel;

    private String resolveApiKey() {
        if (geminiApiKeyFromProps != null && !geminiApiKeyFromProps.isBlank()) {
            return geminiApiKeyFromProps.trim();
        }
        String env = System.getenv("GEMINI_API_KEY");
        return env != null ? env.trim() : "";
    }

    private String buildApiUrl(String model) {
        return API_BASE + model + ":generateContent?key=" + resolveApiKey();
    }

    /** @deprecated use {@link #gradeTopikWriting(GradingContext)} — kept for aiExplain shortcut */
    public String gradeTopikWriting(String studentText, int questionType) {
        int maxScore = (questionType == 51 || questionType == 52) ? 10 : (questionType == 53 ? 30 : 50);
        return gradeTopikWriting(new GradingContext(
                questionType, studentText, "", "", maxScore, null, null));
    }

    public String gradeTopikWriting(GradingContext context) {
        String key = resolveApiKey();
        if (key.isEmpty()) {
            return apiErrorJson(true,
                    "⚠️ Chưa cấu hình GEMINI_API_KEY. Thêm biến môi trường hoặc gemini.api.key trong application.properties.");
        }

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String systemPrompt = gradingPromptBuilder.build(context);
        return callRealGeminiApi(restTemplate, headers, systemPrompt, true);
    }

    public String generateWritingQuestionSet(int topikSession, String excludeTopics) {
        String key = resolveApiKey();
        if (key.isEmpty()) {
            return "{\"error\":\"Chưa cấu hình GEMINI_API_KEY.\"}";
        }

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String exclude = excludeTopics != null && !excludeTopics.isBlank()
                ? excludeTopics
                : "취업, 1인 가구, 스마트폰, 교사, 외국인 유학생, 인구, 지도자, 직업, 대중문화, 역사, 과정, 의사소통, 제주도, 스트레스";

        String systemPrompt = "Bạn là chuyên gia biên soạn đề thi TOPIK II (쓰기). "
                + "Sinh BỘ 4 CÂU HỎI VIẾT cho kỳ thi TOPIK số " + topikSession + ".\n"
                + "CHỈ TRẢ VỀ JSON, KHÔNG MARKDOWN, KHÔNG GIẢI THÍCH.\n"
                + "Tránh trùng chủ đề với các đề sau: " + exclude + ".\n\n"
                + "Quy tắc:\n"
                + "- Câu 51: hoàn thành câu ngắn, có ( ㉠ ) và ( ㉡ ), timeLimit=150, maxScore=10\n"
                + "- Câu 52: hoàn thành đoạn văn logic, có ( ㉠ ) và ( ㉡ ), timeLimit=150, maxScore=10\n"
                + "- Câu 53: mô tả biểu đồ/số liệu 200~300 chữ, kèm số liệu trong prompt, timeLimit=900, maxScore=30, imageUrl=null\n"
                + "- Câu 54: nghị luận 600~700 chữ với 3 gợi ý con, timeLimit=3000, maxScore=50\n"
                + "- prompt và answer bằng tiếng Hàn (answer câu 54 có thể thêm 1 dòng ghi chú tiếng Việt ngắn)\n"
                + "- externalId = topik * 100 + type\n\n"
                + "JSON BẮT BUỘC:\n"
                + "{\n  \"questions\": [\n    {\n      \"externalId\": " + (topikSession * 100 + 51) + ",\n"
                + "      \"topik\": " + topikSession + ",\n      \"type\": 51,\n"
                + "      \"timeLimit\": 150,\n      \"maxScore\": 10,\n"
                + "      \"prompt\": \"...\",\n      \"answer\": \"...\",\n      \"imageUrl\": null\n    }\n  ]\n}";

        return callRealGeminiApi(restTemplate, headers, systemPrompt, false);
    }

    public String analyzeErrorsAndGenerateTest(String errorHistory) {
        String key = resolveApiKey();
        if (key.isEmpty()) {
            return "{\"main_weakness\": \"Chưa cấu hình API\", \"analysis\": \"Thiếu GEMINI_API_KEY.\", \"mini_test\": []}";
        }

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String systemPrompt = "Bạn là chuyên gia giáo dục ngôn ngữ Hàn. TẠO 3 CÂU TRẮC NGHIỆM TỪ LỖI SAI SAU ĐÂY:\n" + errorHistory +
                "\nCHỈ TRẢ VỀ JSON, KHÔNG DÙNG MARKDOWN VĂN BẢN THỪA:\n" +
                "{\n  \"main_weakness\": \"...\",\n  \"analysis\": \"...\",\n  \"mini_test\": [\n    {\n      \"question\": \"...\",\n      \"options\": [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"],\n      \"correct_answer\": \"...\",\n      \"explanation\": \"...\"\n    }\n  ]\n}";

        return callRealGeminiApi(restTemplate, headers, systemPrompt, false);
    }

    private String callRealGeminiApi(RestTemplate restTemplate, HttpHeaders headers, String systemPrompt, boolean isGrading) {
        HttpEntity<String> request = buildRequest(headers, systemPrompt);
        HttpStatusCodeException lastError = null;

        for (String model : resolveModelCandidates()) {
            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    return executeCall(restTemplate, buildApiUrl(model), request);
                } catch (HttpStatusCodeException e) {
                    lastError = e;
                    int status = e.getStatusCode().value();
                    System.err.println("🔴 Google API [" + model + "] attempt " + attempt + ": " + e.getStatusCode());
                    System.err.println("🔴 CHI TIẾT: " + e.getResponseBodyAsString());

                    if (isRetryableStatus(status) && attempt < MAX_RETRIES) {
                        sleepBeforeRetry(attempt, e);
                        continue;
                    }
                    break;
                } catch (Exception e) {
                    e.printStackTrace();
                    if (isGrading) {
                        return apiErrorJson(true, "⚠️ Lỗi kết nối AI: " + e.getMessage());
                    }
                    return "{\"main_weakness\": \"Lỗi kết nối API\", \"analysis\": \"⚠️ " + e.getMessage() + "\", \"mini_test\": []}";
                }
            }
        }

        if (lastError != null) {
            return buildApiFailureResponse(lastError, isGrading);
        }
        return isGrading
                ? apiErrorJson(true, "⚠️ Không thể kết nối Google AI. Vui lòng thử lại sau.")
                : "{\"main_weakness\": \"Lỗi kết nối API\", \"analysis\": \"Không thể kết nối Google AI.\", \"mini_test\": []}";
    }

    private String[] resolveModelCandidates() {
        String primary = (geminiModel != null && !geminiModel.isBlank()) ? geminiModel.trim() : "gemini-2.5-flash-lite";
        String[] temp = new String[FALLBACK_MODELS.length + 1];
        temp[0] = primary;
        int idx = 1;
        for (String fallback : FALLBACK_MODELS) {
            if (!fallback.equals(primary)) {
                temp[idx++] = fallback;
            }
        }
        String[] result = new String[idx];
        System.arraycopy(temp, 0, result, 0, idx);
        return result;
    }

    private HttpEntity<String> buildRequest(HttpHeaders headers, String systemPrompt) {
        JSONObject jsonBody = new JSONObject();
        JSONArray contentsArray = new JSONArray();
        JSONObject partsObject = new JSONObject();
        JSONArray partsArray = new JSONArray();
        JSONObject textObject = new JSONObject();

        textObject.put("text", systemPrompt);
        partsArray.put(textObject);
        partsObject.put("parts", partsArray);
        contentsArray.put(partsObject);
        jsonBody.put("contents", contentsArray);

        return new HttpEntity<>(jsonBody.toString(), headers);
    }

    private String executeCall(RestTemplate restTemplate, String url, HttpEntity<String> request) {
        ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
        JSONObject jsonObj = new JSONObject(response.getBody());

        String rawText = jsonObj.getJSONArray("candidates")
                .getJSONObject(0)
                .getJSONObject("content")
                .getJSONArray("parts")
                .getJSONObject(0)
                .getString("text");

        return stripMarkdownFence(rawText);
    }

    private String stripMarkdownFence(String rawText) {
        if (rawText.contains("```json")) {
            rawText = rawText.substring(rawText.indexOf("```json") + 7);
            if (rawText.contains("```")) {
                rawText = rawText.substring(0, rawText.indexOf("```"));
            }
        } else if (rawText.contains("```")) {
            rawText = rawText.substring(rawText.indexOf("```") + 3);
            if (rawText.contains("```")) {
                rawText = rawText.substring(0, rawText.indexOf("```"));
            }
        }
        return rawText.trim();
    }

    private boolean isRetryableStatus(int status) {
        return status == 429 || status == 408 || status >= 500;
    }

    private void sleepBeforeRetry(int attempt, HttpStatusCodeException e) {
        long delay = Math.min(INITIAL_RETRY_MS * (1L << (attempt - 1)), MAX_RETRY_MS);
        delay += ThreadLocalRandom.current().nextLong(250, 750);

        HttpHeaders responseHeaders = e.getResponseHeaders();
        if (responseHeaders != null && responseHeaders.getFirst(HttpHeaders.RETRY_AFTER) != null) {
            try {
                long retryAfterSec = Long.parseLong(responseHeaders.getFirst(HttpHeaders.RETRY_AFTER));
                delay = Math.max(delay, retryAfterSec * 1000L);
            } catch (NumberFormatException ignored) {
                // ignore invalid Retry-After
            }
        }

        try {
            Thread.sleep(delay);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private String buildApiFailureResponse(HttpStatusCodeException e, boolean isGrading) {
        int status = e.getStatusCode().value();
        String message;
        if (status == 429) {
            message = "⚠️ Google AI đang quá tải (429). Hệ thống đã thử lại tự động — vui lòng đợi 1–2 phút rồi chấm lại. Lượt chấm hôm nay không bị trừ.";
        } else if (status == 401 || status == 403) {
            message = "⚠️ GEMINI_API_KEY không hợp lệ hoặc hết hạn. Kiểm tra lại key trên Google AI Studio.";
        } else {
            message = "⚠️ Google API lỗi (" + e.getStatusCode() + "). Vui lòng thử lại sau.";
        }

        if (isGrading) {
            return apiErrorJson(true, message);
        }
        return "{\"main_weakness\": \"Lỗi kết nối API\", \"analysis\": \"" + escapeJson(message) + "\", \"mini_test\": []}";
    }

    public Map<String, Object> checkConnectivity() {
        Map<String, Object> info = new HashMap<>();
        String key = resolveApiKey();
        info.put("configured", !key.isEmpty());
        info.put("primaryModel", geminiModel != null && !geminiModel.isBlank() ? geminiModel.trim() : "gemini-2.5-flash-lite");

        if (key.isEmpty()) {
            info.put("status", "missing_key");
            return info;
        }

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> request = buildRequest(headers, "Reply with exactly: OK");

        for (String model : resolveModelCandidates()) {
            try {
                String text = executeCall(restTemplate, buildApiUrl(model), request);
                info.put("status", "ok");
                info.put("model", model);
                info.put("sample", text.length() > 40 ? text.substring(0, 40) : text);
                return info;
            } catch (HttpStatusCodeException e) {
                info.put("lastError", e.getStatusCode().toString());
                info.put("lastModel", model);
            } catch (Exception e) {
                info.put("lastError", e.getMessage());
                info.put("lastModel", model);
            }
        }

        info.put("status", "error");
        return info;
    }

    private String apiErrorJson(boolean apiError, String message) {
        return "{\"total_score\": 0, \"apiError\": " + apiError + ", \"native_suggestion\": \"" + escapeJson(message) + "\"}";
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
