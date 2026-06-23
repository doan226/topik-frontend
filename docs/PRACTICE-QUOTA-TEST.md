# Practice Quota — Manual Test Guide

Phase 1 freemium for tabs Ôn 51–54. Requires backend `topikai` running on port 8080.

## Setup

1. Start backend: `./mvnw spring-boot:run` in `topikai/`
2. Start frontend: `npm run dev` in `topik-frontend/`
3. Log in as **FREE** user (role `FREE_USER`)
4. Optional: export tracker — `npm run project:status` (needs backend)

## FREE limits (KST)

| Feature | Limit | Reset |
|---------|-------|-------|
| Chấm AI (OMR) | **2/ngày** | midnight |
| Bài luyện câu 51 | 5/tuần | Monday |
| Bài luyện câu 52 | 5/tuần | Monday |
| Đề luyện câu 53 | 1/tuần | Monday |
| Quiz câu 54 | 10/ngày | midnight |
| Chưa thuộc (saved) | 20 total | — |
| Vocab 54 topics | 4 đầu | — |
| Biểu hiện 54 | opening + closing | — |
| Hán Hàn SRS | 5 phiên/ngày (10 thẻ/phiên) | midnight |
| Hán Hàn Quiz | 5 phiên/ngày (5 câu/phiên) | midnight |
| Hán Hàn tra cứu / lật thẻ | Không giới hạn | — |
| Pack free | topik100-frequent + beginner-core (120 từ) | — |

## Paid tiers (entitlement)

| Gói | Mã CK | Chấm AI/ngày |
|-----|-------|--------------|
| Viết 90 ngày | `TOPIKVIET {userId}` | 15 |
| Viết lifetime | `TOPIKVIP {userId}` | 20 |
| Hán Hàn | `TOPIKHANJA {userId}` | 0 (không chấm viết) |
| TOPIK I | `TOPIKI {userId}` | explain 5/ngày |
| All-in | `TOPIKALL {userId}` | 20 |

Grandfather: `TOPIKVIP` @ 50.000đ → Viết lifetime.

## Test cases

### Pattern 51 / 52

- [ ] Tab **Biểu hiện** và **Từ vựng**: truy cập không giới hạn
- [ ] Tab **Bài luyện**: badge hiện `Còn X/5`
- [ ] Mở 5 bài khác nhau trong tuần → bài thứ 6 hiện overlay 🔒 + nút Premium
- [ ] Quay lại bài đã mở trong tuần: không tốn thêm lượt
- [ ] PREMIUM user: không badge, mở mọi bài

### Chart 53

- [ ] **Công thức viết**: free, không quota
- [ ] **Luyện đề**: 1 đề/tuần free; chuyển đề thứ 2 → lock
- [ ] PREMIUM: duyệt tất cả đề

### Essay 54

- [ ] Vocab: chỉ 4 chủ đề đầu trong dropdown free; chủ đề 🔒 disabled
- [ ] Biểu hiện: free chỉ Mở bài / Kết bài / cả hai
- [ ] Quiz: sau 10 lần Kiểm tra → toast + modal Premium
- [ ] Flashcard: không tốn quota quiz

### Saved items

- [ ] Lưu >20 mục (51–52 hoặc 54) → toast + gợi ý Premium
- [ ] Xóa mục → có thể lưu thêm

### Hán Hàn

- [ ] Tab **Lộ trình Pack**: hero card 100 từ TOPIK, progress X/100, nút "Ôn 5 từ hôm nay"
- [ ] Chip **Động tác & hành động** / **Khái niệm xã hội** lọc đúng trong Tra cứu
- [ ] Free: tra cứu 120 từ (100 TOPIK + 20 gốc âm) không giới hạn
- [ ] Tra cứu: nút **Lật thẻ xem** — flip nghĩa, không consume SRS
- [ ] Free: pack `topik-intermediate` 🔒 trên Lộ trình — copy "27 gốc âm nâng cao — PREMIUM"
- [ ] **Flashcard SRS**: bắt đầu phiên → 1 consume; ôn tối đa 10 thẻ/phiên; free 5 phiên/ngày
- [ ] Hết SRS → banner soft landing + nút **Mở Tra cứu** (không modal cứng)
- [ ] **Quiz Arena**: 5 phiên/ngày free; pool chỉ từ pack free (~120 từ)
- [ ] PREMIUM: mở 27 từ trung cấp + SRS/Quiz không giới hạn
- [ ] Dashboard: progress bar 100 từ TOPIK X/100 + streak hiển thị rõ

### API

```bash
# Quota snapshot (grading 2/day free, aiExplain 3/day free)
curl http://localhost:8080/api/v1/dashboard/quota/1

# Entitlements
curl http://localhost:8080/api/v1/entitlements/1

# Consume hanja SRS session
curl -X POST http://localhost:8080/api/v1/practice/consume \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"featureKey":"hanja_srs"}'

# Project tasks
curl http://localhost:8080/api/v1/project/tasks
```

## Progress tracker

After each implementation task:

```bash
curl -X PATCH http://localhost:8080/api/v1/project/tasks/fe-pattern-quota \
  -H "Content-Type: application/json" \
  -d '{"status":"done","notes":"PatternPractice.jsx exercise gating"}'

npm run project:status
```

Read `@docs/IMPLEMENTATION-STATUS.md` before starting new work.
