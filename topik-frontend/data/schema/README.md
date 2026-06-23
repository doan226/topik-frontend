# Data schema contracts

Single contract cho tất cả file JSON trong `data/`. UI/backend phase sau import trực tiếp.

## Field chung

| Field | Type | Mô tả |
|---|---|---|
| `id` | string | Stable slug, unique trong file |
| `questionType` | 51 \| 52 \| 53 \| 54 | Loại câu TOPIK viết |
| `source` | string | `quyen-viet-partN`, `official-제XX회`, `expansion-N`, `ai-grading` |
| `verified` | `true` \| `false` \| `suggested` | Đáp án/nội dung đã review |

## patterns-51-52.json

`type` values:

| type | Mục đích |
|---|---|
| `pattern` | Ngữ pháp / cấu trúc câu |
| `vocab-group` | Nhóm từ theo chủ đề |
| `connector` | Liên từ / mắc xích câu 52 |
| `exercise` | Bài luyện điền câu |

Exercise fields:

- `prompt` — đề bài (null nếu `needsSource: true`)
- `answers[]` — `{ blank: "㉠"|"㉡", text, verified }`
- `patternIds[]` — link tới pattern id
- `officialQuestionId` — id đề official nếu trùng kỳ thi
- `examSession` — số kỳ (36, 47, 52, …)

## vocab-54-topics.json

```json
{
  "topics": [{
    "topicId": "youth",
    "topicKo": "...",
    "topicVi": "...",
    "terms": [{ "ko": "...", "vi": "..." }],
    "needsSource": false
  }]
}
```

## essay-54-templates.json

`type` values: `question-type`, `opening`, `body-formula`, `closing`

## chart-53-bank.json

`type` values: `chart` (có `dataPoints`, `labels`, `needsManualEntry`), `sample-essay`

## writing-question-bank.json

```json
{
  "official": [{ "id", "source", "topik", "type", "prompt", "answer", "imageUrl", ... }],
  "expansion": [{ "id", "source", "expansionSet", "type", ... }]
}
```

Backend flatten: `[...official, ...expansion]` → `question-bank.json`

## listen-read-bank.json

`items[]` với `type: "reading"|"listening"`, `passage`, `question`, `options`, `correct`, `explanation`

## pattern-mappings.json

`mappings[]`: `{ match, patternId, questionType }` — substring match trên lỗi AI chấm

## user-mistake-card (runtime, chưa DB)

Xem `user-mistake-card.example.json` — map từ `grammar_errors[]` + `UserAnswer.aiFeedbackJson`

## hanja-bank.json

Ngân hàng chữ Hán Hàn — data-driven, quiz/SRS tự sinh runtime.

```json
{
  "meta": { "version": 1, "title": "...", "updated": "YYYY-MM-DD" },
  "packs": [{
    "packId": "beginner-100",
    "titleVi": "100 chữ cơ bản",
    "access": "free",
    "charIds": ["hanja-xue"]
  }],
  "characters": [{
    "id": "hanja-xue",
    "char": "學",
    "reading": "학",
    "meaningKo": "배울",
    "meaningVi": "Học",
    "compounds": [{ "ko": "학교", "hanja": "學校", "vi": "Trường học" }]
  }]
}
```

### Trường bắt buộc

| Field | Mô tả |
|---|---|
| `characters[].id` | Slug unique (vd. `hanja-xue`) |
| `characters[].char` | Chữ Hán |
| `characters[].reading` | Âm Hán Hàn |
| `characters[].meaningVi` | Nghĩa tiếng Việt |
| `packs[].packId` | Slug unique pack |
| `packs[].access` | `free` \| `premium` \| `pack:{sku}` |

### Trường optional (UI hiện khi có)

`radical`, `strokeCount`, `grade`, `topics[]`, `examples[]`, `mnemonicVi`, `meaningKo`, `packId`, `compounds[]`

### Quy ước access

| Giá trị | Ý nghĩa |
|---|---|
| `free` | Mọi user |
| `premium` | Cần PREMIUM_USER |
| `pack:kiip-hanja` | Mua SKU riêng (Phase 3) |

Validate: `npm run data:validate-hanja`
