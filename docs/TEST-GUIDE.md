# Hướng dẫn test — TOPIK App (sau wire data)

## Khởi động

```bat
CHAY-TOPIK.bat
```

Hoặc thủ công:
- Backend: `C:\Users\01666\Downloads\topikai\topikai\run-backend.cmd`
- Frontend: `cd C:\topik-frontend && npm run dev`
- Mở: http://localhost:5173

## Tab mới / cập nhật

| Tab | Test gì |
|-----|---------|
| **Ôn 51–52** | Flashcard pattern + bài luyện điền câu (data/patterns-51-52.json) |
| **Luyện đọc** | 3 câu từ data/listen-read-bank.json |
| **Luyện viết OMR** | Câu **54** → panel gợi ý vocab + rubric luận |
| **Bảng điều khiển** | **Sổ lỗi cá nhân** sau khi chấm AI |

## Checklist test nhanh

1. **Ôn 51–52** → Câu 51 → Bài luyện → chọn bài có đề → điền ㉠ → Kiểm tra
2. **Luyện viết OMR** → Câu 54 → mở các mục gợi ý (Từ vựng, Mở/Thân/Kết bài)
3. **Luyện viết OMR** → viết vài câu Hàn → **Chấm AI** (cần backend + API key)
4. **Bảng điều khiển** → xem **Sổ lỗi** có thẻ từ lỗi grammar_errors
5. Bài official đã gắn: ex51-016 (36회), ex51-021 (52회), ex51-022 (47회), ex52-007, ex52-009

## Checklist chấm AI (sau cải tiến rubric)

Chấm thử **5 bài/câu** (51–54) và kiểm tra:

| Câu | Kỳ vọng điểm (bài trung bình) | Kiểm tra phản hồi |
|-----|------------------------------|-------------------|
| 51 | 5–7 / 10 | Có `score_justification`, lỗi ㉠/㉡ trong `grammar_errors` |
| 52 | 4–6 / 10 | Nhắc 한다체 / mạch luận khi sai logic |
| 53 | 15–22 / 30 | `content_issues` khi sai/thiếu số liệu so với đáp án mẫu |
| 54 | 25–35 / 50 | Trừ điểm khi thiếu 1 trong 3 ý hoặc quá ngắn |

**Regression backend** (không cần API key):

```bat
cd topik-backend\topikai
mvnw.cmd test -Dtest=GradingPromptBuilderTest,GradingScoreValidatorTest
```

**Calibration thủ công** (cần `GEMINI_API_KEY`):

1. Tab **Luyện viết OMR** → chọn Kỳ 35 → Câu 51 → dán đáp án mẫu → Chấm AI → điểm nên ≥8
2. Câu 53 Kỳ 35 → viết bài sai số liệu cố ý → điểm ≤15, có `content_issues`
3. Câu 54 (PREMIUM) → bài 2–3 câu → điểm ≤15
4. Gây lỗi API (tắt backend) → toast **lỗi**, không toast thành công
5. FREE user chọn Câu 54 → bị chặn trước khi chấm

## Data pipeline

```bash
npm run data:build      # sync JSON + báo cáo thiếu
npm run data:report     # MISSING-DATA-REPORT.md
```

## Lưu ý

- Đáp án bài luyện: `suggested` hoặc `true` (5 bài từ đề official) — team chuẩn hóa sau
- Sổ lỗi lưu **localStorage** (chưa backend DB)
- Chunk JS ~540KB do embed JSON data — bình thường cho dev
