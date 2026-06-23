# Nguồn dữ liệu nội dung TOPIK

## PDF gốc (trong thư mục này)

| File | Kích thước gốc | Mô tả |
|---|---|---|
| `quyen-viet-part1.pdf` | ~4.5 MB | Câu 51 — trang 1–44 |
| `quyen-viet-part2.pdf` | ~7.7 MB | Câu 52–53 — trang 45–104 |
| `quyen-viet-part3.pdf` | ~6.7 MB | Câu 53–54 — trang 100–169 |

**Nguồn:** Tài liệu "Quyển Viết hoàn chỉnh" — Tiếng Hàn Thu Huế.

**Bản quyền:** Chỉ dùng để tham khảo và **biên soạn lại** (paraphrase giải thích, đổi ví dụ). Không copy nguyên văn vào app thương mại.

**Bản gốc trên máy (3 file = 3 part):**

| File Downloads | Part | Trong repo |
|---|---|---|
| `Quyển Viết hoàn chỉnh.pdf` | Part 1 — câu 51 | `data/quyen-viet-part1.pdf` |
| `Quyển Viết hoàn chỉnh (1).pdf` | Part 2 — câu 52–53 | `data/quyen-viet-part2.pdf` |
| `Quyển Viết hoàn chỉnh (2).pdf` | Part 3 — câu 53–54 | `data/quyen-viet-part3.pdf` |

**Trạng thái:** ✅ **Đủ 3 file** (2026-05-25) — không cần gửi thêm PDF.

**Đáp án bài tập 51–52:** PDF trống — **team tạo sau** khi hoàn thiện DB (`verified: suggested` → `true`).

**Backup trước khi tối ưu:** `data/backups/2026-05-25/` — snapshot patterns, vocab, FE/BE question bank, docs.

## File JSON (sau tối ưu 2026-05-25)

| File | Trạng thái | Mô tả |
|---|---|---|
| `manifest.json` | **Done** | Inventory + version, checksum item count |
| `patterns-51-52.json` | **v2 ready-review** | 36 pattern + 12 vocab + 6 connector + 49 exercise; `answers[]` + `verified`; placeholder `needsSource` |
| `vocab-54-topics.json` | **Done** (partial) | 20 chủ đề; 7 chủ đề PDF ảnh → `needsSource` |
| `essay-54-templates.json` | **Done** | 6 dạng câu hỏi + mở/thân/kết |
| `chart-53-bank.json` | **Partial** | 2 sample essay + skeleton charts `needsManualEntry` |
| `antonyms-52.json` | **Chờ user** | Trang 42 PDF là ảnh |
| `pattern-mappings.json` | **Done** | Substring lỗi → patternId |
| `writing-question-bank.json` | **Done** | Master FE/BE — 56 câu (28 official + 28 expansion) |
| `listen-read-bank.json` | **Placeholder** | 3 câu migrate từ `ListenReadPractice.jsx` |
| `USER-INPUT-CHECKLIST.md` | **Done** | 4 mục bắt buộc user cần gửi |
| `MISSING-DATA-REPORT.md` | **Auto** | Báo cáo thiếu — chạy `npm run data:report` |

Schema mô tả: `data/schema/README.md`

## Đồng bộ ngân hàng đề viết

**Master:** `data/writing-question-bank.json`

```bash
npm run data:sync      # master → backend question-bank.json + validate
npm run data:build     # static JSON + sync + patterns refactor
```

| Đích | File |
|---|---|
| Frontend (hiện tại) | `src/officialQuestionBank.js`, `src/expansionQuestionBank.js` |
| Backend seed | `topikai/src/main/resources/question-bank.json` |

**Lưu ý DB:** `QuestionDataInitializer` chỉ seed khi `repository.count() == 0`. Nếu DB đã có data cũ, cần migration hoặc admin upsert — không tự ghi đè.

## Nguồn trong codebase

- `src/officialQuestionBank.js` — đề viết TOPIK công bố (frontend).
- `src/expansionQuestionBank.js` — bộ mở rộng premium.
- `topikai/src/main/resources/question-bank.json` — seed backend (sync từ master).
- Kết quả AI chấm: `grammar_errors[]` → map qua `pattern-mappings.json`.

## Quy trình import tiếp theo

1. User gửi 4 mục trong `USER-INPUT-CHECKLIST.md`.
2. Import round 2 → cập nhật JSON tương ứng.
3. Chạy `npm run data:build`.
4. Phase UI: wire `data/*.json` vào tab Ôn 51–52 / Gợi ý 54.
