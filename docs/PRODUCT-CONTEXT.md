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
5. **Không làm:** KIIP, scrape web, list 6000 từ chung chưa verify.

## Freemium & gói trả phí (2026 — multi-SKU)

> Chi tiết: `@docs/IMPLEMENTATION-HANDOFF.md` · `@docs/BUSINESS-PLAN.md`

| Free | Gói trả phí (tách lẻ hoặc All-in 189k) |
|---|---|
| 2 chấm AI viết/ngày | Viết 89k/90d (15/ngày) hoặc 129k lifetime (20/ngày) |
| Pattern 51–52, công thức 53 | Bài luyện 51–52, đề 53, quiz 54 unlimited |
| 4 chủ đề vocab 54 | 13 chủ đề + biểu hiện đầy đủ |
| Hán 120 từ free | Hán pack 79k: 90 từ + intermediate |
| 1 đề nghe–đọc demo | TOPIK I pack 99k (~20 bộ, khi có data) |
| 1 mini-test/tuần | Mini-test unlimited (cần gói Viết) |

Config: `src/config/practiceFreeTier.js` · Entitlements: `useEntitlements.js`

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
| 0 | Backup + `manifest.json` | **Done** (2026-05-25) |
| 1 | Schema + refactor `patterns-51-52.json` v2 | **Done** |
| 2a | `vocab-54-topics.json` (20 chủ đề) | **Done** (7 chủ đề chờ user) |
| 2b | `essay-54-templates.json` | **Done** |
| 2c–2d | Exercises placeholder + `chart-53-bank.json` partial | **Done** |
| 3 | `writing-question-bank.json` + sync script FE↔BE | **Done** |
| 4 | Link official, dedup patterns | **Done** (link khi có kỳ trong official bank) |
| 5–6 | `pattern-mappings.json`, mistake schema, listen-read placeholder | **Done** |
| UI | Wire `data/` vào app | **Done** (2026-05-25) — xem docs/TEST-GUIDE.md |
| User input | 4 mục — xem `data/USER-INPUT-CHECKLIST.md` | **Chờ user** |

## Cách dùng trong chat mới

```text
@docs/PRODUCT-CONTEXT.md @data/patterns-51-52.json — Import pattern câu 51 từ part1
```

## App hiện trạng (cập nhật khi thay đổi)

- **Live:** luyện viết OMR + AI, nghe–đọc TOPIK II, Hán Hàn, dashboard, multi-SKU pricing.
- **Đang bổ sung:** TOPIK I pack, SRS lỗi AI, feedback 4 tab, Q54 wizard.
- **Thiếu:** mobile app, video khóa, leaderboard.

## Tham chiếu đối thủ (ý tưởng, không copy nội dung)

- [NhaiTopik](https://nhaitopik.com/) — flashcard SRS, sách giáo khoa, shadowing.
- Lợi thế của app mình: **AI chấm viết 51–54** + **sổ lỗi cá nhân**.
