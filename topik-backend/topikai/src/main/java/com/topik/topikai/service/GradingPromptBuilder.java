package com.topik.topikai.service;

import com.topik.topikai.dto.GradingContext;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class GradingPromptBuilder {

    private static final String JSON_SCHEMA = """
            {
              "total_score": <tổng điểm>,
              "criteria_scores": { <tiêu chí theo rubric> },
              "grammar_errors": [{"sai":"...", "đúng":"...", "lý_do":"...", "mức_độ":"nặng|nhẹ"}],
              "content_issues": [{"vấn_đề":"...", "gợi_ý":"..."}],
              "score_justification": "<giải thích ngắn tại sao cho điểm này>",
              "native_suggestion": "<bài mẫu hoặc gợi ý cải thiện>",
              "rewrite_tasks": ["<câu/đoạn cần viết lại>"],
              "structure_map": { "서론": "có|thiếu", "본론1": "có|thiếu", "본론2": "có|thiếu", "결론": "có|thiếu" },
              "model_phrases_to_learn": ["<cụm từ mẫu tiếng Hàn>"],
              "estimated_level": "<mức TOPIK dự đoán, ví dụ 4-5>"
            }""";

    public String build(GradingContext ctx) {
        return switch (ctx.getQuestionType()) {
            case 51 -> buildQ51(ctx);
            case 52 -> buildQ52(ctx);
            case 53 -> buildQ53(ctx);
            case 54 -> buildQ54(ctx);
            default -> buildGeneric(ctx);
        };
    }

    private String buildQ51(GradingContext ctx) {
        return baseHeader(ctx, 51) + """
                LOẠI BÀI: Câu 51 — hoàn thành câu ngắn, điền ( ㉠ ) và ( ㉡ ).
                THỂ BẮT BUỘC: 습니다체 / formal written style.

                RUBRIC CHẤM CHẶT (tổng 10 điểm):
                - "ngữ_pháp_và_từ_vựng" (5): mỗi chỗ trống 2.5 điểm — đúng ngữ pháp, đúng từ vựng
                - "ý_nghĩa_ngữ_cảnh" (5): mỗi chỗ trống 2.5 điểm — ý phù hợp ngữ cảnh thông báo/email

                QUY TẮC CHẤM:
                - So sánh với đáp án mẫu; cho phép cách diễn đạt khác nếu ngữ pháp và ý đúng
                - Trừ 2–3 điểm mỗi chỗ trống sai ngữ pháp cốt lõi hoặc sai thể
                - Không cho >8 điểm nếu có lỗi ngữ pháp rõ ràng
                - Không cho 10 điểm trừ khi cả hai chỗ trống hoàn hảo
                - Điểm trung bình bài học viên: 5–7/10

                ĐỀ BÀI:
                """ + safeBlock(ctx.getQuestionPrompt()) + """

                ĐÁP ÁN MẪU (tham chiếu):
                """ + safeBlock(ctx.getReferenceAnswer()) + """

                BÀI LÀM HỌC VIÊN:
                """ + safeBlock(ctx.getStudentText()) + preValidationBlock(ctx) + jsonFooter();
    }

    private String buildQ52(GradingContext ctx) {
        return baseHeader(ctx, 52) + """
                LOẠI BÀI: Câu 52 — hoàn thành đoạn luận logic, điền ( ㉠ ) và ( ㉡ ).
                THỂ BẮT BUỘC: 한다체 / academic written style.

                RUBRIC CHẤM CHẶT (tổng 10 điểm):
                - "ngữ_pháp_và_từ_vựng" (5): ngữ pháp, liên từ logic (왜냐하면, 따라서, 반면…)
                - "ý_nghĩa_ngữ_cảnh" (5): mạch luận nhất quán, không phá vỡ logic đoạn văn

                QUY TẮC CHẤM:
                - So sánh với đáp án mẫu; ưu tiên logic hơn từ ngữ y hệt
                - Trừ điểm nếu phá vỡ mối quan hệ nhân–quả hoặc dùng sai thể
                - Không cho >8 điểm nếu một trong hai chỗ trống sai logic
                - Điểm trung bình bài học viên: 4–6/10

                ĐỀ BÀI:
                """ + safeBlock(ctx.getQuestionPrompt()) + """

                ĐÁP ÁN MẪU (tham chiếu):
                """ + safeBlock(ctx.getReferenceAnswer()) + """

                BÀI LÀM HỌC VIÊN:
                """ + safeBlock(ctx.getStudentText()) + preValidationBlock(ctx) + jsonFooter();
    }

    private String buildQ53(GradingContext ctx) {
        String promptBlock = ctx.getQuestionPrompt().isBlank()
                ? "(Học viên xem biểu đồ trên màn hình — không có text đề riêng)"
                : ctx.getQuestionPrompt();

        return baseHeader(ctx, 53) + """
                LOẠI BÀI: Câu 53 — mô tả biểu đồ/số liệu (200~300 ký tự Hàn).
                GROUND TRUTH SỐ LIỆU: dùng đáp án mẫu bên dưới làm chuẩn kiểm tra.

                RUBRIC CHẤM CHẶT (tổng 30 điểm):
                - "nội_dung" (10): số liệu chính xác, không bịa, đủ các nhóm so sánh chính
                - "tổ_chức" (10): mở bài (giới thiệu khảo sát) → thân (xu hướng/so sánh) → kết luận
                - "ngôn_ngữ" (10): -다/-이다, khách quan, không tiêu đề, không ý kiến cá nhân

                QUY TẮC CHẤM:
                - Trừ 3–5 điểm mỗi số liệu sai hoặc thiếu nhóm so sánh quan trọng
                - Tổng điểm ≤ 15 nếu bịa số hoặc sai >2 số liệu chính
                - Trừ 2–4 điểm nếu <180 hoặc >320 ký tự Hàn
                - Liệt kê lỗi số liệu trong content_issues
                - Điểm trung bình bài học viên: 15–22/30

                ĐỀ BÀI / GHI CHÚ:
                """ + safeBlock(promptBlock) + """

                ĐÁP ÁN MẪU (ground truth số liệu):
                """ + safeBlock(ctx.getReferenceAnswer()) + """

                BÀI LÀM HỌC VIÊN:
                """ + safeBlock(ctx.getStudentText()) + preValidationBlock(ctx) + jsonFooter();
    }

    private String buildQ54(GradingContext ctx) {
        int charCount = resolveKoreanCharCount(ctx);
        List<String> subPrompts = resolveQ54SubPrompts(ctx);

        StringBuilder prompt = new StringBuilder();
        prompt.append(baseHeader(ctx, 54));
        prompt.append("""
                LOẠI BÀI: Câu 54 — nghị luận 600~700 ký tự Hàn, trả lời 3 gợi ý con.

                RUBRIC CHẤM CHẶT (tổng 50 điểm):
                - "nội_dung" (10): trả lời đủ 3 ý trong đề, có ví dụ cụ thể
                - "tổ_chức" (10): 서론–본론–결론, mạch logic rõ
                - "ngôn_ngữ" (10): ngữ pháp, từ vựng trung cấp trở lên

                QUY TẮC CHẤM:
                - Chấm như giám khảo TOPIK thật — điểm trung bình học viên: 25–35/50
                - Chỉ cho >40 khi bài xuất sắc, gần như không lỗi
                - Trừ 3–5 điểm nếu thiếu 1 trong 3 ý gợi ý
                - Trừ 3–5 điểm nếu độ dài <500 hoặc >800 ký tự Hàn (bài hiện tại: """);
        prompt.append(charCount);
        prompt.append("""
                 ký tự)
                - Mỗi lỗi ngữ pháp nặng trừ 1–2 điểm tổng
                - Điền structure_map theo 서론/본론1/본론2/결론; mỗi ý gợi ý con tương ứng 본론

                3 GỢI Ý CON CẦN CHẤM RIÊNG:
                """);
        if (subPrompts.isEmpty()) {
            prompt.append("(không parse được — đọc từ đề bài)\n");
        } else {
            for (int i = 0; i < subPrompts.size(); i++) {
                prompt.append(i + 1).append(". ").append(subPrompts.get(i)).append('\n');
            }
        }
        prompt.append("""

                ĐỀ BÀI:
                """);
        prompt.append(safeBlock(ctx.getQuestionPrompt()));
        prompt.append("""

                ĐÁP ÁN MẪU (tham chiếu cấu trúc):
                """);
        prompt.append(safeBlock(ctx.getReferenceAnswer()));
        prompt.append("""

                BÀI LÀM HỌC VIÊN:
                """);
        prompt.append(safeBlock(ctx.getStudentText()));
        prompt.append(preValidationBlock(ctx));
        prompt.append(jsonFooter());
        return prompt.toString();
    }

    private String buildGeneric(GradingContext ctx) {
        return baseHeader(ctx, ctx.getQuestionType()) + """
                ĐỀ BÀI:
                """ + safeBlock(ctx.getQuestionPrompt()) + """

                ĐÁP ÁN MẪU:
                """ + safeBlock(ctx.getReferenceAnswer()) + """

                BÀI LÀM:
                """ + safeBlock(ctx.getStudentText()) + preValidationBlock(ctx) + jsonFooter();
    }

    private String baseHeader(GradingContext ctx, int questionType) {
        return "Bạn là giám khảo TOPIK II chuyên nghiệp, chấm NGHIÊM và CÔNG BẰNG.\n"
                + "CHỈ TRẢ VỀ JSON, KHÔNG CÓ MARKDOWN VĂN BẢN THỪA.\n"
                + "Đang chấm Câu " + questionType + ". Điểm tối đa: " + ctx.getMaxScore() + ".\n"
                + "Phản hồi bằng tiếng Việt trong grammar_errors, content_issues, score_justification.\n"
                + "Bắt buộc điền rewrite_tasks, structure_map, model_phrases_to_learn, estimated_level.\n\n";
    }

    private String preValidationBlock(GradingContext ctx) {
        Map<String, Object> preValidation = ctx.getPreValidation();
        if (preValidation == null || preValidation.isEmpty()) {
            return "";
        }

        StringBuilder block = new StringBuilder("\n\nKIỂM TRA TRƯỚC CHẤM (rule-based — ưu tiên khi chấm):\n");
        block.append("- Số ký tự Hàn: ").append(preValidation.getOrDefault("koreanCharCount", 0)).append('\n');
        block.append("- charCountOutOfRange: ").append(preValidation.getOrDefault("charCountOutOfRange", false)).append('\n');
        block.append("- wrongSpeechLevel (해요체): ").append(preValidation.getOrDefault("wrongSpeechLevel", false)).append('\n');
        block.append("- chartDataMismatch: ").append(preValidation.getOrDefault("chartDataMismatch", false)).append('\n');

        Object missingFigures = preValidation.get("chartMissingFigures");
        if (missingFigures instanceof List<?> list && !list.isEmpty()) {
            block.append("- Số liệu thiếu/sai khả năng cao: ").append(list).append('\n');
        }

        block.append("- q54MissingPoints: ").append(preValidation.getOrDefault("q54MissingPoints", false)).append('\n');
        Object missingPointDetails = preValidation.get("q54MissingPointDetails");
        if (missingPointDetails instanceof List<?> list && !list.isEmpty()) {
            block.append("- Các ý Q54 có thể thiếu: ").append(list).append('\n');
        }

        block.append("Nếu các flag trên là true, phải trừ điểm tương ứng và ghi rõ trong content_issues/score_justification.\n");
        return block.toString();
    }

    private String jsonFooter() {
        return "\n\nĐịnh dạng JSON BẮT BUỘC:\n" + JSON_SCHEMA;
    }

    private String safeBlock(String text) {
        if (text == null || text.isBlank()) {
            return "(không có)";
        }
        return text.trim();
    }

    private int resolveKoreanCharCount(GradingContext ctx) {
        Object count = ctx.getPreValidation().get("koreanCharCount");
        if (count instanceof Number number) {
            return number.intValue();
        }
        return PreGradingValidator.countCharsForQuestion(ctx.getQuestionType(), ctx.getStudentText());
    }

    @SuppressWarnings("unchecked")
    private List<String> resolveQ54SubPrompts(GradingContext ctx) {
        Object prompts = ctx.getPreValidation().get("q54SubPrompts");
        if (prompts instanceof List<?> list) {
            return (List<String>) list;
        }
        return PreGradingValidator.parseQ54SubPrompts(ctx.getQuestionPrompt());
    }
}
