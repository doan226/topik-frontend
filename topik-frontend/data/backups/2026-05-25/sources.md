# Nguồn dữ liệu nội dung TOPIK

## PDF gốc (trong thư mục này)

| File | Kích thước gốc | Mô tả |
|---|---|---|
| `quyen-viet-part1.pdf` | ~4.5 MB | Câu 51 — trang 1–44 |
| `quyen-viet-part2.pdf` | ~7.7 MB | Câu 52–53 — trang 45–104 |
| `quyen-viet-part3.pdf` | ~6.7 MB | Câu 53–54 — trang 100–169 |

**Nguồn:** Tài liệu "Quyển Viết hoàn chỉnh" — Tiếng Hàn Thu Huế.

**Bản quyền:** Chỉ dùng để tham khảo và **biên soạn lại** (paraphrase giải thích, đổi ví dụ). Không copy nguyên văn vào app thương mại.

**Bản gốc trên máy:** `C:\Users\01666\Downloads\` — tên file có encoding Unicode đặc biệt (`Quyển Viết hoàn chỉnh*.pdf`).

## File JSON (output import)

| File | Trạng thái | Mô tả |
|---|---|---|
| `patterns-51-52.json` | **Phase 1 done** (2026-05-25) | 42 pattern + 12 nhóm từ + 7 connector + 38 bài tập |
| `vocab-54-topics.json` | Chờ import (Phase 2) | 20 chủ đề từ vựng câu 54 |

## Nguồn trong codebase

- `src/officialQuestionBank.js` — đề viết TOPIK công bố (frontend).
- `topikai/src/main/resources/question-bank.json` — đề viết (backend).
- Kết quả AI chấm: `grammar_errors[]` trong response chấm bài.

## Quy trình import đề xuất

1. Đọc PDF part → trích raw vào draft (markdown hoặc JSON tạm).
2. Human review / paraphrase `reasonVi`.
3. Ghi vào `patterns-51-52.json` hoặc `vocab-54-topics.json`.
4. Commit JSON — chat sau chỉ cần `@data/*.json`, không đọc lại PDF.
