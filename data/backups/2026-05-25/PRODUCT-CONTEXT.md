# TOPIK App — Product & Content Context

> Tóm tắt chiến lược sản phẩm và nguồn nội dung. Dùng `@docs/PRODUCT-CONTEXT.md` khi mở chat mới thay vì paste lại cả cuộc hội thoại.

## Mục tiêu

- Thu hút user trước, bán premium sau (freemium).
- Điểm mạnh app: **AI chấm viết TOPIK 51–54** + OMR số.
- Không cạnh tranh flashcard 6000 từ generic (NhaiTopik và các site khác đã có).

## Chiến lược tính năng (ưu tiên)

1. **Flashcard / SRS từ lỗi AI chấm** (`grammar_errors`) — nguồn độc quyền, gắn với hành vi thực tế.
2. **Pattern ngữ pháp câu 51–52** + mini luyện tập (từ PDF nguồn).
3. **Free quota AI chấm viết** (1–3 bài/ngày) + streak cá nhân.
4. **Sau khi có user:** sổ tay từ, leaderboard, luyện đề full.
5. **Chưa làm sớm:** copy sách Yonsei/KIIP, scrape web, list 6000 từ chung chưa verify.

## Freemium funnel

| Free (thu hút) | Premium (bán sau) |
|---|---|
| Flashcard / ôn pattern giới hạn | Full pattern + SRS không giới hạn |
| 1–3 bài AI chấm viết/ngày | Unlimited + lịch sử chi tiết |
| Luyện đọc vài câu/ngày | Full ngân hàng đề |
| Streak, dashboard cơ bản | Phân tích lỗi theo tuần |

## Nguồn nội dung chính

### PDF — Quyển Viết hoàn chỉnh (Tiếng Hàn Thu Huế)

Đã copy vào `data/`:

| File | Trang sách | Nội dung |
|---|---|---|
| `quyen-viet-part1.pdf` | 1–44 | Câu **51**: từ vựng chủ đề + ~17 mẫu ngữ pháp + ~13 bài tập |
| `quyen-viet-part2.pdf` | 45–104 | Câu **52**: 17 mẫu ngữ pháp + ~20 bài luyện + **câu 53** (biểu đồ) |
| `quyen-viet-part3.pdf` | 100–169 | Câu **53–54**: mẫu biểu đồ, 6 dạng câu hỏi luận, công thức Mở–Thân–Kết, **20 chủ đề từ vựng câu 54** |

### Code hiện có

- `src/officialQuestionBank.js`, backend `question-bank.json` — đề viết công bố.
- `GradingResultPanel.jsx` — `grammar_errors` với `sai`, `đúng`, `lý_do`.
- Live: `ExamRoom`, `OMRGrid`, `ListenReadPractice`, `ProgressDashboard`, `UpgradeModal`.

### Không làm

- Scrape NhaiTopik / blog / site dạy tiếng Hàn để đưa vào app.
- Copy nguyên văn tài liệu Thu Huế vào sản phẩm thương mại — **paraphrase + biên soạn lại**.

## Schema dữ liệu (JSON)

### Pattern câu 51–52 → `data/patterns-51-52.json`

```json
{
  "type": "pattern",
  "questionType": 51,
  "prompt": "다음 주 월요일은 도서관 내부 공사를 ( ㉠ ).",
  "correct": "할 예정입니다",
  "commonWrong": ["할 것입니다", "했습니다"],
  "reasonVi": "Thông báo kế hoạch tương lai → (으)ㄹ 예정이다",
  "topic": "announcement",
  "source": "제36회 51번"
}
```

### Từ vựng chủ đề câu 54 → `data/vocab-54-topics.json`

```json
{
  "topicId": "climate-change",
  "topicKo": "지구 온난화",
  "topicVi": "Sự nóng lên của trái đất",
  "terms": [
    { "ko": "산업화", "vi": "Công nghiệp hóa" }
  ]
}
```

### Lỗi cá nhân user (tương lai)

```json
{
  "userId": 1,
  "wrong": "...",
  "correct": "...",
  "reasonVi": "...",
  "nextReviewDate": "2026-05-28",
  "source": "ai-grading"
}
```

## Roadmap import nội dung

| Phase | Việc | Trạng thái |
|---|---|---|
| 1 | Trích pattern + bài tập 51–52 → `data/patterns-51-52.json` | **Done** (2026-05-25) |
| 2 | Trích 20 chủ đề từ vựng câu 54 | Chờ làm |
| 3 | UserMistakeCard + SRS từ AI chấm | `grammar_errors` |
| 4 | Mẫu câu 53 (biểu đồ) | part2/part3 — nhiều trang là ảnh, cần xem PDF |

## Cách dùng trong chat mới

```text
@docs/PRODUCT-CONTEXT.md @data/patterns-51-52.json — Import pattern câu 51 từ part1
```

## App hiện trạng (cập nhật khi thay đổi)

- **Live:** luyện viết OMR + AI, luyện đọc beta, dashboard, premium.
- **Chưa có data thật:** flashcard 6000+ từ (landing claim — placeholder).
- **Thiếu tính năng:** SRS, sổ tay, shadowing, leaderboard.

## Tham chiếu đối thủ (ý tưởng, không copy nội dung)

- [NhaiTopik](https://nhaitopik.com/) — flashcard SRS, sách giáo khoa, shadowing.
- Lợi thế của app mình: **AI chấm viết 51–54** + **sổ lỗi cá nhân**.
