# BÁO CÁO PHẦN THIẾU — Quyển Viết

> **Tự sinh:** `2026-05-24` — chạy `npm run data:report` hoặc `npm run data:build`
> **PDF Downloads:**
> - Part 1: `C:\Users\01666\Downloads\Quyển Viết hoàn chỉnh.pdf`
> - Part 3: `C:\Users\01666\Downloads\Quyển Viết hoàn chỉnh (2).pdf` ← file (2) — **đủ bộ 3 part**
> **Trạng thái PDF:** ✅ `complete` — không cần gửi thêm file
> **Đáp án chuẩn:** ⏳ `deferred` — Không chờ đáp án từ PDF. Giữ verified:suggested; team review → verified:true sau.
> **PDF trong repo:** `data/quyen-viet-part1.pdf`, `part2`, `part3`, `supplement-3`
> **PDF bổ sung (3):** `data/quyen-viet-supplement-3.pdf` — import 2026-05-25

---

## TÓM TẮT NHANH (đọc phần này trước)

| Loại | Mục | Số lượng | Ai xử lý |
|------|-----|----------|----------|
| 🔴 PDF trống | Bài luyện **thiếu đề** | **5** | Lấy từ đề official / team sau |
| ⏳ DEFERRED | **Đáp án chuẩn** (suggested) | **37** | **Team** — sau khi hoàn thiện DB |
| 🟡 Tùy phase | Biểu đồ 53 (ảnh) | **4** skeleton | Team nhập số liệu thủ công |
| 🟡 Tùy phase | Từ đối nghĩa tr.42 | **0** cặp | Team biên soạn sau |
| ✅ Done | Vocab 54 chủ đề 10–16 | **0** thiếu / **20** tổng | OCR PDF (3) 2026-05-25 |

Chi tiết: `data/USER-INPUT-CHECKLIST.md`

---

## 1. Bài luyện THIẾU ĐỀ (gửi prompt + đáp án ㉠/㉡)

| ID | Câu | Kỳ thi | PDF (part + trang) | Ghi chú |
|----|-----|--------|-------------------|---------|
| ex51-016 | 51 #16 | 36회 | part1 tr.62 | ✅ đã có — PDF trống prompt |
| ex51-017 | 51 #17 | — | part1 tr.63 | ❌ thiếu — Thiếu đề |
| ex51-018 | 51 #18 | — | part1 tr.28 | ✅ đã có — Đã import đề từ part1 |
| ex51-019 | 51 #19 | — | part1 tr.29 | ✅ đã có — Đã import đề từ part1 |
| ex51-020 | 51 #20 | — | part1 tr.65 | ❌ thiếu — Thiếu đề |
| ex51-021 | 51 #21 | 52회 | part1 | ✅ đã có — Thiếu đề |
| ex51-022 | 51 #22 | 47회 | part1 | ✅ đã có — Thiếu đề |
| ex51-025 | 51 #25 | — | part1 | ❌ thiếu — Thiếu đề |
| ex52-007 | 52 #7 | 52회 | part2 tr.55 | ✅ đã có — PDF trống prompt (file 1) |
| ex52-009 | 52 #9 | 47회 | part2 tr.57 | ✅ đã có — PDF trống prompt (file 1) |
| ex52-016 | 52 #16 | — | part2 tr.62 | ❌ thiếu — PDF trống prompt |
| ex52-019 | 52 #19 | — | part2 tr.64 | ❌ thiếu — PDF trống prompt |
| ex51-012 | 51 #12 | — | part1 (?) | ⚠️ chưa có trong JSON |

---

## 2. ĐÁP ÁN CHUẨN — DEFERRED (team, không block import PDF)

Tổng **37** bài — `verified: "suggested"`. PDF sách **trống đáp án**.

**Chính sách:** Team tạo đáp án chuẩn **sau khi hoàn thiện kho database** → đổi `verified: true`.

<details><summary>Danh sách bài (click mở)</summary>

| ID | Câu | #LT | Kỳ thi |
|----|-----|-----|--------|
| ex51-001 | 51 | 1 | — |
| ex51-002 | 51 | 2 | — |
| ex51-003 | 51 | 3 | — |
| ex51-004 | 51 | 4 | — |
| ex51-005 | 51 | 5 | — |
| ex51-006 | 51 | 6 | — |
| ex51-007 | 51 | 7 | — |
| ex51-008 | 51 | 8 | — |
| ex51-009 | 51 | 9 | 70회 |
| ex51-010 | 51 | 10 | 72회 |
| ex51-011 | 51 | 11 | 64회 |
| ex51-013 | 51 | 13 | — |
| ex51-014 | 51 | 14 | — |
| ex51-015 | 51 | 15 | — |
| ex51-023 | 51 | 23 | 65회 |
| ex51-024 | 51 | 24 | 66회 |
| ex51-026 | 51 | 26 | — |
| ex51-027 | 51 | 27 | — |
| ex51-028 | 51 | 28 | — |
| ex51-029 | 51 | 29 | — |
| ex51-030 | 51 | 30 | — |
| ex52-001 | 52 | 1 | — |
| ex52-002 | 52 | 2 | — |
| ex52-003 | 52 | 3 | — |
| ex52-004 | 52 | 4 | — |
| ex52-005 | 52 | 5 | — |
| ex52-006 | 52 | 6 | — |
| ex52-008 | 52 | 8 | — |
| ex52-010 | 52 | 10 | — |
| ex52-011 | 52 | 11 | — |
| ex52-012 | 52 | 12 | — |
| ex52-013 | 52 | 13 | 67회 |
| ex52-014 | 52 | 14 | 72회 |
| ex52-015 | 52 | 15 | 63회 |
| ex52-017 | 52 | 17 | — |
| ex52-018 | 52 | 18 | — |
| ex52-020 | 52 | 20 | — |

</details>

---

## 3. Biểu đồ câu 53 — THIẾU SỐ LIỆU

PDF **ảnh** — combined tr. **67–104 (part2), 100–104 (part3)**

- Skeleton trong JSON: **4** (needsManualEntry)
- Đã nhập số liệu: **0**
- Sample essay: 반려동물, 스트레스 (tr.146) + outline: 게임 중독, 주차 (supplement-3 tr.142)
- PDF supplement-3: trang sách **88, 102–115, 122–123** (ảnh — cần nhập số liệu thủ công)

---

## 4. Từ đối nghĩa câu 52

- ❌ **Chưa có** — Part1 / combined PDF **trang 42** (ảnh, không extract được)
- File: `data/antonyms-52.json`

---

## 5. Vocab câu 54 — chủ đề thiếu từ

- ✅ **Đủ 20/20 chủ đề** — 7 chủ đề p.157–163 đã import OCR từ PDF (3) ngày 2026-05-25
- ⚠️ Nên **review thủ công** các mục `importMethod: ocr` (có thể sai chính tả Hàn do scan)

---

## 6. GHI CHÚ BỔ SUNG — cần làm tiếp (2026-05-25)

### Đã import từ `Quyển Viết hoàn chỉnh (3).pdf` → `data/quyen-viet-supplement-3.pdf`

| Nội dung | Trạng thái | Ghi chú |
|----------|------------|---------|
| Vocab 54 chủ đề 10–16 (p.157–163) | ✅ OCR → `vocab-54-topics.json` | Review chính tả Hàn |
| Mẫu mở/thân/kết câu 54 (p.134–151) | ✅ → `essay-54-templates.json` | Thêm connector + ví dụ môi trường |
| Bài mẫu/outline câu 53 (p.142, 146) | ✅ → `chart-53-bank.json` | 2 essay + 2 situation-outline |
| Biểu đồ câu 53 (p.88, 102–115, 122–123) | ❌ Chỉ có ảnh | **Cần nhập thủ công** labels + dataPoints |
| Trang p.135, 139, 141, 143, 147 (supplement) | ❌ Ảnh | Có thể bổ sung thêm mẫu câu 54 nếu cần |

### Vẫn thiếu — không có trong PDF (3)

1. **~10 bài luyện 51–52 thiếu đề** — PDF gốc trống prompt → lấy từ `writing-question-bank.json` (kỳ 36, 47, 52회…) hoặc team nhập.
2. **37 đáp án chuẩn bài 51–52** — deferred, team review sau.
3. **Từ đối nghĩa câu 52 tr.42** — ảnh, chưa extract được → `antonyms-52.json` trống.
4. **Số liệu biểu đồ 53** — mở PDF supplement-3, đọc từng biểu đồ, điền vào `chart-53-bank.json`.
5. **UI ôn câu 53** — data skeleton đủ metadata; chưa wire tab luyện như Ôn 51–52.
6. **Review OCR vocab** — so khớp với ảnh gốc part3 p.157–163, sửa lỗi Hàn nếu có.

Chi tiết checklist: `data/USER-INPUT-CHECKLIST.md`

---

## Sau khi cập nhật data

1. Sửa JSON tương ứng (hoặc script import)
2. Chạy `npm run data:build`
3. Mở lại **file này** — số DEFERRED/BLOCKER phải giảm
