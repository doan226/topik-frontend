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
              "criteria_scores": { "ngu_phap": <số>, "tu_vung": <số>, "cau_truc": <số>, "noi_dung": <số> },
              "detailed_criteria": [
                {"ten":"Hoàn thành nhiệm vụ", "ten_ko":"과제 완성도", "diem":<0-5>, "toi_da":5},
                {"ten":"Triển khai logic", "ten_ko":"논리적 전개", "diem":<0-5>, "toi_da":5},
                {"ten":"Đa dạng biểu đạt", "ten_ko":"표현 다양성", "diem":<0-5>, "toi_da":5},
                {"ten":"Phù hợp chủ đề", "ten_ko":"주제 적합성", "diem":<0-5>, "toi_da":5},
                {"ten":"Chính tả", "ten_ko":"맞춤법 정확도", "diem":<0-5>, "toi_da":5},
                {"ten":"Kính ngữ / thể văn", "ten_ko":"경어법 사용", "diem":<0-5>, "toi_da":5},
                {"ten":"Bố cục đoạn", "ten_ko":"문단 구성", "diem":<0-5>, "toi_da":5}
              ],
              "grammar_errors": [{"sai":"...", "đúng":"...", "lý_do":"...", "mức_độ":"nặng|nhẹ"}],
              "content_issues": [{"vấn_đề":"...", "gợi_ý":"..."}],
              "score_justification": "<giải thích ngắn tại sao cho điểm này (tiếng Việt)>",
              "native_suggestion": "<bài mẫu hoặc gợi ý cải thiện>",
              "sample_answers": { "co_ban": "<bài mẫu trình độ cơ bản (5급) tiếng Hàn>", "nang_cao": "<bài mẫu trình độ nâng cao (6급) tiếng Hàn>" },
              "rewrite_tasks": ["<câu/đoạn cần viết lại>"],
              "structure_map": { "서론": "có|thiếu", "본론1": "có|thiếu", "본론2": "có|thiếu", "결론": "có|thiếu" },
              "paragraph_analysis": [
                {"phan":"Mở bài (서론)", "diem":<số>, "toi_da":<số>, "nhan_xet":"<nhận xét BẮT BUỘC bằng tiếng Việt>", "trich_dan":"<trích câu mở đầu đoạn (tiếng Hàn)>"}
              ],
              "swot": { "S": ["<điểm mạnh>"], "W": ["<điểm yếu>"], "O": ["<cơ hội cải thiện>"], "T": ["<rủi ro>"] },
              "level_diagnosis": { "hien_tai": "<vd 5급>", "muc_tieu": "<vd 6급>", "mo_ta": "<chẩn đoán tiếng Việt>" },
              "roadmap": ["<bước cải thiện 1>", "<bước cải thiện 2>"],
              "model_phrases_to_learn": [{"ko":"<cụm từ mẫu tiếng Hàn>", "vi":"<nghĩa tiếng Việt>"}],
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

                RUBRIC CHẤM CHẶT (tổng 10 điểm) — quy đổi sang 4 trục criteria_scores (tổng = total_score):
                - ngu_phap + tu_vung: đúng ngữ pháp, đúng từ vựng ở cả hai chỗ trống
                - cau_truc + noi_dung: ý phù hợp ngữ cảnh thông báo/email

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

                RUBRIC CHẤM CHẶT (tổng 10 điểm) — quy đổi sang 4 trục criteria_scores (tổng = total_score):
                - ngu_phap + tu_vung: ngữ pháp, liên từ logic (왜냐하면, 따라서, 반면…)
                - cau_truc + noi_dung: mạch luận nhất quán, không phá vỡ logic đoạn văn

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
                LOẠI BÀI: Câu 53 — mô tả biểu đồ/số liệu (200~300 ký tự Hàn). Đây là bài BÁO CÁO DỮ LIỆU.
                GROUND TRUTH SỐ LIỆU: dùng đáp án mẫu bên dưới làm chuẩn kiểm tra.

                3 TRỤ CỘT CHẤM (tổng 30 điểm, chia đều) — quy đổi sang 4 trục criteria_scores (tổng = total_score):
                A. NỘI DUNG & THỰC HIỆN (noi_dung): đưa ĐỦ TẤT CẢ tiêu chí/số liệu của đề vào bài
                   (thiếu 1 gạch đầu dòng/mục trong đề = trừ NẶNG); đọc ĐÚNG số liệu, không bịa.
                B. CẤU TRÚC & MẠCH LẠC (cau_truc): mở bài (gom cơ quan+đối tượng+chủ đề) → thân (xu hướng/so sánh)
                   → kết (tổng hợp xu hướng); từ nối (하지만/따라서/반면에…) chính xác, tự nhiên.
                C. NGÔN NGỮ (ngu_phap + tu_vung): thể -다/-이다 khách quan; từ vựng-ngữ pháp trung/cao cấp,
                   đa dạng; đúng 맞춤법 (chính tả) và 띄어쓰기 (giãn cách).

                QUY TẮC "MẤT ĐIỂM OAN" CÂU 53 (kiểm RẤT kỹ):
                - TUYỆT ĐỐI KHÔNG bê nguyên văn câu dẫn của đề (vd 다음 그래프를 보고…). Phải tự gom
                  "Cơ quan + Đối tượng + Chủ đề" thành 1 câu mở bằng từ ngữ của mình → nếu chép câu dẫn: trừ NẶNG.
                - SAI ĐƠN VỊ đo lường (đề cho % mà viết 명; đề cho 원 mà viết 건…) = lỗi HIỂU SAI DỮ LIỆU,
                  trừ RẤT NẶNG. Bắt buộc đối chiếu đơn vị trong ngoặc của biểu đồ.
                - KHÔNG viết kết luận/ý kiến cá nhân (저는…생각한다), không đề xuất giải pháp xã hội/môi trường
                  nếu biểu đồ không có dữ liệu đó → có là trừ điểm và ghi vào content_issues.
                - Toàn bài chỉ 1 ĐOẠN DUY NHẤT, KHÔNG xuống dòng/sang đoạn mới.

                QUY TẮC CHẤM:
                - Trừ 3–5 điểm mỗi số liệu sai hoặc thiếu nhóm so sánh/tiêu chí quan trọng
                - Tổng điểm ≤ 15 nếu bịa số, sai đơn vị, hoặc sai >2 số liệu chính
                - Trừ 2–4 điểm nếu <180 hoặc >320 ký tự Hàn
                - Liệt kê mọi lỗi số liệu/đơn vị/ý kiến cá nhân trong content_issues
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
                LOẠI BÀI: Câu 54 — nghị luận 600~700 ký tự Hàn, trả lời 3 gợi ý con. Thể bắt buộc: 한다체.

                3 TRỤ CỘT CHẤM (tổng 50 điểm, chia đều) — quy đổi sang 4 trục criteria_scores (tổng = total_score):
                A. NỘI DUNG & THỰC HIỆN (noi_dung): trả lời TRỰC DIỆN và ĐẦY ĐỦ cả 3 câu hỏi gợi ý;
                   luận điểm có chiều sâu, có luận cứ/ví dụ hỗ trợ (thiếu hoặc trả lời lệch 1 ý = trừ nặng).
                B. CẤU TRÚC & MẠCH LẠC (cau_truc): 서론–본론–결론, liên kết câu/đoạn rõ;
                   từ nối (하지만/따라서/반면에…) chính xác; chia đoạn hợp lý.
                C. NGÔN NGỮ (ngu_phap + tu_vung): độ chính xác ngữ pháp, đúng thể 한다체;
                   từ vựng-ngữ pháp trung/cao cấp & đa dạng (dùng ngữ pháp sơ cấp = điểm thấp);
                   đúng 맞춤법 (chính tả) và 띄어쓰기 (giãn cách).

                QUY TẮC KHẮT KHE CÂU 54 (trừ điểm nếu vi phạm):
                - KHÔNG viết tiêu đề (제목) → vào thẳng bài.
                - KHÔNG gạch đầu dòng/đánh số (1., 2., 3., -, +) để liệt kê → phải viết thành văn xuôi.
                - TRÁNH lạm dụng 저는/나 (xưng "tôi"); ưu tiên ẩn chủ ngữ hoặc chủ ngữ chung (우리는/현대인들은).
                - PHÂN BỔ DUNG LƯỢNG ĐỀU cho 3 luận điểm; không dồn 1 ý quá dài rồi bỏ qua 2 ý còn lại.

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
                - Điền paragraph_analysis cho từng đoạn 서론/본론1/본론2/결론 kèm điểm và nhận xét (nhan_xet bằng tiếng Việt)

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
        int maxScore = ctx.getMaxScore();
        int axisMax = Math.round(maxScore / 4f);
        return "Bạn là giám khảo TOPIK II chuyên nghiệp, chấm NGHIÊM và CÔNG BẰNG.\n"
                + "CHỈ TRẢ VỀ JSON, KHÔNG CÓ MARKDOWN VĂN BẢN THỪA.\n"
                + "Đang chấm Câu " + questionType + ". Điểm tối đa: " + maxScore + ".\n\n"
                + "QUY TẮC TỬ HUYỆT — CHẤM 0 ĐIỂM NGAY (total_score=0, cả 4 trục=0):\n"
                + "- Lạc đề hoàn toàn: nội dung không liên quan yêu cầu đề bài.\n"
                + "- Chép y nguyên đề bài: chỉ copy lại câu hỏi/thông tin đề mà không thêm ngữ pháp/cấu trúc riêng.\n"
                + "- Viết bằng ngôn ngữ khác: có câu viết bằng tiếng Việt/tiếng Anh hoặc phiên âm (trừ khi đề yêu cầu).\n"
                + "Nếu dính 1 trong các lỗi trên: total_score=0 và ghi RÕ lý do trong score_justification.\n\n"
                + "NGUYÊN TẮC CHẤM (BẮT BUỘC):\n"
                + "- CHỈ chấm dựa trên đúng nội dung 'BÀI LÀM HỌC VIÊN' bên dưới. KHÔNG suy đoán, KHÔNG cho điểm/cấp độ mặc định.\n"
                + "- Mọi nhận xét, lỗi (grammar_errors/content_issues), trích dẫn PHẢI lấy từ chính câu chữ học viên viết.\n"
                + "- Nếu bài TRỐNG, quá ngắn, sai đề, sai thể hoặc chép lại đề → điểm THẤP và cấp độ THẤP tương ứng (không nương tay).\n"
                + "- criteria_scores gồm đúng 4 trục: ngu_phap, tu_vung, cau_truc, noi_dung; mỗi trục ~" + axisMax
                + " và TỔNG 4 trục PHẢI BẰNG total_score.\n"
                + "- detailed_criteria (7 mục) phải nhất quán với 4 trục: bài kém thì các mục cũng phải điểm thấp.\n\n"
                + levelMappingBlock(maxScore)
                + "Phản hồi SONG NGỮ Việt-Hàn: TẤT CẢ nhận xét/giải thích/chẩn đoán (gồm paragraph_analysis.nhan_xet) bằng tiếng Việt; chỉ ví dụ/câu mẫu/trích dẫn bằng tiếng Hàn.\n"
                + "Bắt buộc điền: detailed_criteria (7 mục), paragraph_analysis, swot, level_diagnosis, roadmap,\n"
                + "sample_answers (co_ban + nang_cao), rewrite_tasks, structure_map,\n"
                + "model_phrases_to_learn, estimated_level.\n\n";
    }

    private String levelMappingBlock(int maxScore) {
        int t40 = (int) Math.round(maxScore * 0.40);
        int t55 = (int) Math.round(maxScore * 0.55);
        int t70 = (int) Math.round(maxScore * 0.70);
        int t85 = (int) Math.round(maxScore * 0.85);
        return "BẢNG QUY ĐỔI CẤP ĐỘ theo total_score (trên thang " + maxScore + ") — "
                + "level_diagnosis.hien_tai VÀ estimated_level PHẢI khớp đúng bảng này, "
                + "TUYỆT ĐỐI không tự gán 5급/6급 nếu điểm chưa đạt ngưỡng:\n"
                + "- ≥ " + t85 + " điểm → 6급\n"
                + "- " + t70 + "–" + (t85 - 1) + " điểm → 5급\n"
                + "- " + t55 + "–" + (t70 - 1) + " điểm → 4급\n"
                + "- " + t40 + "–" + (t55 - 1) + " điểm → 3급\n"
                + "- < " + t40 + " điểm → Dưới 3급 (chưa đạt trung cấp)\n"
                + "level_diagnosis.muc_tieu = cấp kế trên của hien_tai (6급 thì giữ 6급).\n\n";
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

        if (Boolean.TRUE.equals(preValidation.get("q53HasLineBreaks"))) {
            block.append("- q53HasLineBreaks: true (Câu 53 phải viết 1 đoạn duy nhất — bài có xuống dòng/nhiều đoạn → trừ điểm cấu trúc)\n");
        }
        if (Boolean.TRUE.equals(preValidation.get("q53PersonalOpinion"))) {
            block.append("- q53PersonalOpinion: true (Câu 53 báo cáo dữ liệu — phát hiện ý kiến cá nhân (저는/생각…) → trừ điểm)\n");
        }
        if (Boolean.TRUE.equals(preValidation.get("q54HasBulletList"))) {
            block.append("- q54HasBulletList: true (Câu 54 phải viết văn xuôi — phát hiện gạch đầu dòng/đánh số → trừ điểm định dạng)\n");
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
