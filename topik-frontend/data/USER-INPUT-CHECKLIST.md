# Checklist — Trạng thái nguồn Quyển Viết

## PDF — đã đủ 3 part (2026-05-25)

| File Downloads | Part | Repo |
|---|---|---|
| `Quyển Viết hoàn chỉnh.pdf` | Part 1 — câu 51 | `data/quyen-viet-part1.pdf` |
| `Quyển Viết hoàn chỉnh (1).pdf` | Part 2 — câu 52–53 | `data/quyen-viet-part2.pdf` |
| `Quyển Viết hoàn chỉnh (2).pdf` | Part 3 — câu 53–54 | `data/quyen-viet-part3.pdf` |
| `Quyển Viết hoàn chỉnh (3).pdf` | **Bổ sung** — biểu đồ 53 + mẫu luận 54 | `data/quyen-viet-supplement-3.pdf` |

**Không cần gửi thêm PDF** trừ khi có bản scan chất lượng cao hơn hoặc trang vocab/biểu đồ dạng text.

---

## Chính sách đáp án (đã thống nhất)

**Đáp án chuẩn bài tập 51–52:** PDF sách **để trống** ô `답안 1/2` — **không chờ user gửi**.

- Hiện dùng `verified: "suggested"` trong `patterns-51-52.json`
- **Team sẽ tạo đáp án chuẩn sau** khi hoàn thiện kho database (review + gắn `verified: true`)
- Mini-test chấm đúng/sai sẽ bật khi có batch đáp án nội bộ

---

## Còn thiếu trong PDF (không extract được — chấp nhận hoặc bổ sung sau)

### A. Bài luyện thiếu đề trong sách (~10 bài)

PDF trống prompt — **không có trong 3 file**, không thể import tự động:

| ID | Câu | Kỳ | PDF |
|---|---|---|---|
| ex51-016 | 51 #16 | 36회 | part1 tr.26 |
| ex51-017, #20–22, #25 | 51 | — / 52회 / 47회 | part1 |
| ex52-007 | 52 #7 | 52회 | part2 tr.55 |
| ex52-009 | 52 #9 | 47회 | part2 tr.57 |
| ex52-016, #19 | 52 | — | part2 tr.62, 64 |

*Nếu sau này có đề từ kỳ thi official (36, 47, 52회…) có thể lấy từ `writing-question-bank.json`.*

### B. Biểu đồ câu 53 — ảnh (part2 tr.67–104, supplement-3 tr.88, 102–115, 122–123)

`chart-53-bank.json` có 4 skeleton (`needsManualEntry: true`). **Chưa thể auto-import** — PDF chỉ là ảnh biểu đồ.

**Quy trình phase sau (khi cần thêm đề sách):**
1. Mở `data/quyen-viet-supplement-3.pdf` — nhập `labels`, `dataPoints`, `unit` vào `chart-53-bank.json`
2. Sinh `prompt` tiếng Hàn → thêm entry `writing-question-bank.json` (id dạng `book53-xxx`)
3. Viết đáp án mẫu → `chart-53-answers.json` → sync `npm run data:sync`
4. Thêm chart render vào `chart-53-exam-visuals.json` nếu cần

**Tab Ôn 53 hiện tại:** Công thức viết + 14 đề luyện (official + expansion) có đáp án mẫu `verified: suggested`.

### C. Từ đối nghĩa câu 52 — part1 tr.42 (ảnh)

`antonyms-52.json` trống. Team biên soạn sau hoặc chụp bảng nếu cần tab riêng.

### D. Vocab câu 54 — chủ đề 10–16 (part3 tr.157–163)

~~7 chủ đề chỉ có tiêu đề trong PDF `(2)`~~ → **✅ Đã import OCR** từ `(3).pdf` ngày 2026-05-25 vào `vocab-54-topics.json`.

⚠️ Cần **review thủ công** chính tả Hàn (`importMethod: ocr`).

---

## Tùy chọn (mở rộng sau)

| # | Nội dung | Ghi chú |
|---|---|---|
| 5 | Thêm kỳ TOPIK official | PDF đề công bố hoặc link |
| 6 | Ngân hàng nghe/đọc | File riêng |
| 7 | Audio shadowing | Phase sau |
| 8 | 6000 từ / KIIP | Không ưu tiên |

---

## Báo cáo tự động

```bash
npm run data:report    # → data/MISSING-DATA-REPORT.md
npm run data:build     # build + báo cáo cuối console
```

Mở **`MISSING-DATA-REPORT.md`** — phân loại **BLOCKER** vs **DEFERRED (team)**.

---

## GHI CHÚ BỔ SUNG — cần làm tiếp (2026-05-25)

Import từ **`Quyển Viết hoàn chỉnh (3).pdf`** → `data/quyen-viet-supplement-3.pdf`:

| Đã xong | File JSON |
|---------|-----------|
| Vocab 54 — 7 chủ đề (p.157–163) | `vocab-54-topics.json` |
| Mẫu mở/thân/kết luận câu 54 | `essay-54-templates.json` |
| Bài mẫu + outline tình huống câu 53 | `chart-53-bank.json` |

| Còn thiếu | Việc cần làm |
|-----------|--------------|
| **Số liệu biểu đồ 53** (p.88, 102–115, 122–123) | PDF là **ảnh** — mở supplement-3, nhập `labels` + `dataPoints` vào `chart-53-bank.json` |
| **~10 bài luyện 51–52** thiếu đề | Lấy prompt từ đề official (`writing-question-bank.json`) hoặc team nhập |
| **37 đáp án chuẩn** bài 51–52 | Team review → `verified: true` |
| **Từ đối nghĩa câu 52** tr.42 | Ảnh — chưa extract → `antonyms-52.json` |
| **Review OCR vocab** | So ảnh gốc p.157–163, sửa lỗi chính tả Hàn |
| **Tab UI ôn câu 53** | Wire `chart-53-bank.json` vào frontend (tương tự Ôn 51–52) |
| **Trang ảnh supplement** p.135, 139, 141, 143, 147 | Có thể bổ sung thêm mẫu câu 54 sau nếu cần |
