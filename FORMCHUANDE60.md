# FORMCHUANDE60 — Mẫu chuẩn đề TOPIK II Kỳ 60

> **Mục đích:** File này mô tả **đúng form** đề kỳ 60 đang chạy trên web, để bạn làm **y hệt** cho kỳ 35, 36, 37, …  
> **Đề mẫu tham chiếu:** `topik2-60` (TOPIK II — Kỳ 60, năm 2019)

---

## 1. Tổng quan một đề hoàn chỉnh

| Thành phần | Số lượng | Trạng thái kỳ 60 |
|------------|----------|------------------|
| Câu **Nghe** | 50 | ✅ Đủ (trong bank JSON) |
| Câu **Đọc** | 50 | ✅ Đủ (merge từ file txt) |
| File MP3 nghe | 35 đoạn + 1 full | ✅ |
| Ảnh nghe | 3 (câu 1–3) | ✅ |
| Ảnh đọc | 13 PNG | ✅ |
| Bank JSON | 100 dòng | ✅ |

**ID đề:** `topik2-60`  
**Tiêu đề hiển thị:** `TOPIK II — Kỳ 60`

---

## 2. Cấu trúc thư mục (bạn chuẩn bị data)

### 2.1. Thư mục nguồn trên máy (Downloads)

```
TOPIK_II_Exams\
└── Ki60_2019\                          ← đổi tên folder theo kỳ (Ki35_2014, Ki64_2020, …)
    ├── topik2-60-reading.txt           ← BẮT BUỘC: 50 câu đọc
    └── reading_images\                 ← BẮT BUỘC nếu câu có ảnh
        ├── topik2-60-read-q5.png
        ├── topik2-60-read-q6.png
        ├── … (13 file — xem mục 5)
        └── topik2-60-read-passage-48-50.png
```

> **Lưu ý:** Phần **Nghe** kỳ 60 đã có sẵn trong repo (bank + audio). Các kỳ khác cần bank nghe + audio tương tự trước khi merge đọc.

### 2.2. Thư mục trong repo (sau khi import)

```
topik-frontend\
├── data\
│   ├── topik2-60-bank.json             ← bank gốc (50 nghe + 50 đọc)
│   └── sources\
│       └── topik2-60-reading.txt       ← nguồn text đọc
├── public\
│   ├── data\
│   │   └── topik2-60-bank.json         ← bản phục vụ web (copy/sync từ data/)
│   ├── audio\
│   │   ├── topik2-60-listen-q1.mp3
│   │   ├── … (35 file đoạn)
│   │   └── topik2-60-listen-full.mp3   ← ghép cả đề
│   └── topik_images\
│       ├── topik2-60-listen-q1.png     ← 3 ảnh nghe
│       ├── topik2-60-listen-q2.png
│       ├── topik2-60-listen-q3.png
│       └── topik2-60-read-*.png        ← 13 ảnh đọc
└── src\modules\lib\
    └── examMeta.ts                     ← đăng ký đề trong dropdown
```

---

## 3. Quy tắc đặt tên (thay `60` → số kỳ của bạn)

| Loại | Pattern | Ví dụ kỳ 60 |
|------|---------|-------------|
| examId | `topik2-{KY}` | `topik2-60` |
| Bank JSON | `topik2-{KY}-bank.json` | `topik2-60-bank.json` |
| Text đọc | `topik2-{KY}-reading.txt` | `topik2-60-reading.txt` |
| Audio đoạn 1–20 | `topik2-{KY}-listen-q{N}.mp3` | `topik2-60-listen-q4.mp3` |
| Audio cặp 21–50 | `topik2-{KY}-listen-q{A}_{B}.mp3` | `topik2-60-listen-q21_22.mp3` |
| Audio full đề | `topik2-{KY}-listen-full.mp3` | `topik2-60-listen-full.mp3` |
| Ảnh nghe | `topik2-{KY}-listen-q{N}.png` | `topik2-60-listen-q1.png` (chỉ câu 1–3) |
| Ảnh đọc từng câu | `topik2-{KY}-read-q{N}.png` | `topik2-60-read-q5.png` (câu 5–10) |
| Ảnh passage dài | `topik2-{KY}-read-passage-{A}-{B}.png` | `topik2-60-read-passage-19-20.png` |

---

## 4. Phần NGHE — Form chuẩn

### 4.1. Phân loại câu

| Câu | Dạng | Audio | Ảnh | Đáp án |
|-----|------|-------|-----|--------|
| 1–3 | Chọn **hình** | 1 file/câu | ✅ PNG | `correct_ans`: 1–4 |
| 4–20 | Trắc nghiệm chữ | 1 file/câu | ❌ | 4 `options` |
| 21–50 | Trắc nghiệm chữ (2 câu/đoạn) | 1 file/cặp | ❌ | 4 `options`/câu |

### 4.2. Danh sách 35 file MP3 (kỳ 60)

```
topik2-60-listen-q1.mp3 … q20.mp3          ← câu 1–20 (20 file)
topik2-60-listen-q21_22.mp3
topik2-60-listen-q23_24.mp3
topik2-60-listen-q25_26.mp3
topik2-60-listen-q27_28.mp3
topik2-60-listen-q29_30.mp3
topik2-60-listen-q31_32.mp3
topik2-60-listen-q33_34.mp3
topik2-60-listen-q35_36.mp3
topik2-60-listen-q37_38.mp3
topik2-60-listen-q39_40.mp3
topik2-60-listen-q41_42.mp3
topik2-60-listen-q43_44.mp3
topik2-60-listen-q45_46.mp3
topik2-60-listen-q47_48.mp3
topik2-60-listen-q49_50.mp3                ← câu 21–50 (15 file)
topik2-60-listen-full.mp3                  ← ghép tuần tự 35 đoạn trên
```

### 4.3. Một dòng bank JSON — câu nghe có ảnh (câu 1)

```json
{
  "examId": "topik2-60",
  "section": "listening",
  "questionNo": "1",
  "tier": "free",
  "correct_ans": "1",
  "content_json": {
    "passage": "다음을 듣고 알맞은 그림을 고르십시오.",
    "audio_url": "/audio/topik2-60-listen-q1.mp3",
    "transcript": [
      { "lineMs": 0, "lineText": "여자: …" },
      { "lineMs": 0, "lineText": "남자: …" }
    ],
    "options": [],
    "exam_offset_ms": 0,
    "image_url": "/topik_images/topik2-60-listen-q1.png"
  }
}
```

### 4.4. Một dòng bank JSON — câu nghe trắc nghiệm (câu 4)

```json
{
  "examId": "topik2-60",
  "section": "listening",
  "questionNo": "4",
  "tier": "free",
  "correct_ans": "4",
  "content_json": {
    "passage": "다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오.",
    "audio_url": "/audio/topik2-60-listen-q4.mp3",
    "transcript": [
      { "lineMs": 0, "lineText": "여자: …" },
      { "lineMs": 0, "lineText": "남자: …" }
    ],
    "options": [
      "장소를 다시 말해 주세요.",
      "다음 모임은 안 갈 거예요.",
      "이번 주에 만나면 좋겠어요.",
      "정문 옆에 있는 식당이에요."
    ],
    "exam_offset_ms": 89400
  }
}
```

### 4.5. Một dòng bank JSON — cặp câu 21 & 22 (cùng 1 MP3)

Câu 21 và 22 **cùng** `audio_url: "/audio/topik2-60-listen-q21_22.mp3"`, mỗi câu có `questionNo` và `correct_ans` riêng.

---

## 5. Phần ĐỌC — Form file txt chuẩn

File: `data/sources/topik2-60-reading.txt`

### 5.1. Khung tổng thể

```text
# topik2-60 - READING ONLY

## READING

[1]
P:
(nội dung passage — có thể nhiều dòng)
Q: (câu hỏi tiếng Hàn)
1) đáp án 1
2) đáp án 2
3) đáp án 3
4) đáp án 4
ANS: 2
IMG: topik2-60-read-q5.png    ← chỉ khi câu cần ảnh (tùy chọn)

[2]
…
(lặp đến [50])
```

### 5.2. Quy tắc từng trường

| Trường | Bắt buộc | Ghi chú |
|--------|----------|---------|
| `[N]` | ✅ | N = 1…50, đủ 50 block |
| `P:` | ✅ | Passage; có thể để trống nếu ảnh chứa hết nội dung |
| `Q:` | ✅ | Câu hỏi |
| `1)` … `4)` | ✅ | Đúng 4 đáp án |
| `ANS:` | ✅ | Giá trị `1`, `2`, `3` hoặc `4` |
| `IMG:` | ⚠️ | Chỉ 21 câu có ảnh — xem bảng 5.3 |

### 5.3. Bảng 13 ảnh đọc (áp dụng mọi kỳ — chỉ đổi `60` → `{KY}`)

| Câu có `IMG:` | Tên file PNG |
|---------------|--------------|
| 5 | `topik2-{KY}-read-q5.png` |
| 6 | `topik2-{KY}-read-q6.png` |
| 7 | `topik2-{KY}-read-q7.png` |
| 8 | `topik2-{KY}-read-q8.png` |
| 9 | `topik2-{KY}-read-q9.png` |
| 10 | `topik2-{KY}-read-q10.png` |
| 19, 20 | `topik2-{KY}-read-passage-19-20.png` |
| 21, 22 | `topik2-{KY}-read-passage-21-22.png` |
| 23, 24 | `topik2-{KY}-read-passage-23-24.png` |
| 42, 43 | `topik2-{KY}-read-passage-42-43.png` |
| 44, 45 | `topik2-{KY}-read-passage-44-45.png` |
| 46, 47 | `topik2-{KY}-read-passage-46-47.png` |
| 48, 49, 50 | `topik2-{KY}-read-passage-48-50.png` |

> **Quan trọng:** Dòng `IMG:` trong txt chỉ là **tên file**, không phải ảnh nhúng trong txt. File `.png` thật phải nằm trong `reading_images/` rồi copy sang `public/topik_images/`.

### 5.4. Ví dụ txt — câu chỉ text (câu 1)

```text
[1]
P:
1. 휴대 전화를 (      ) 내려야 할 역을 지나쳤다.
Q: ( )에 들어갈 가장 알맞은 것을 고르십시오.
1) 보든지
2) 보다가
3) 보려면
4) 보고서
ANS: 2
```

### 5.5. Ví dụ txt — câu có ảnh quảng cáo (câu 5)

```text
[5]
P:
Q: 다음은 무엇에 대한 글인지 고르십시오.
1) 과자
2) 안경
3) 우유
4) 신발
ANS: 3
IMG: topik2-60-read-q5.png
```

### 5.6. Ví dụ txt — câu passage dài + ảnh chung (câu 19–20)

```text
[19]
P:
Q: ( )에 들어갈 알맞은 것을 고르십시오.
1) 비록
2) 물론
3) 만약
4) 과연
ANS: 3
IMG: topik2-60-read-passage-19-20.png

[20]
P:
Q: 이 글의 내용과 같은 것을 고르십시오.
1) …
2) …
3) …
4) …
ANS: 3
IMG: topik2-60-read-passage-19-20.png
```

### 5.7. Một dòng bank JSON — câu đọc (sau merge)

```json
{
  "examId": "topik2-60",
  "section": "reading",
  "questionNo": "5",
  "tier": "free",
  "correct_ans": "3",
  "content_json": {
    "passage": "",
    "question": "다음은 무엇에 대한 글인지 고르십시오.",
    "options": ["과자", "안경", "우유", "신발"],
    "image_url": "/topik_images/topik2-60-read-q5.png"
  }
}
```

---

## 6. Bank JSON gộp (file cuối cùng)

File `topik2-60-bank.json` là **mảng JSON** gồm **100 phần tử**:

```
[ 50 câu listening ] + [ 50 câu reading ]
```

Thứ tự: **Nghe trước, Đọc sau** (script `merge-reading-bank.py` giữ nguyên phần nghe cũ, ghi đè phần đọc mới).

---

## 7. Đăng ký đề trên web (`examMeta.ts`)

Thêm block tương tự kỳ 60:

```typescript
{
  examId: 'topik2-60',
  title: 'TOPIK II — Kỳ 60',
  fullAudioUrl: '/audio/topik2-60-listen-full.mp3',
  listeningMcqCount: 50,
  listeningAudioSegmentCount: 35,
},
```

---

## 8. Quy trình làm kỳ mới (copy từ kỳ 60)

Thay `60` → `{KY}` ở mọi bước.

### Bước A — Chuẩn bị nguồn

- [ ] Tạo folder `Ki{KY}_{NAM}\` trong `TOPIK_II_Exams\`
- [ ] Viết/soạn `topik2-{KY}-reading.txt` (50 câu, đủ `ANS:`)
- [ ] Crop **13 PNG** từ PDF đọc → `reading_images\`
- [ ] Kiểm tra mỗi dòng `IMG:` trong txt **khớp** tên file PNG thật

### Bước B — Phần Nghe (nếu chưa có)

- [ ] Có `topik2-{KY}-bank.json` với **50 câu** `section: "listening"`
- [ ] Copy **35 MP3** + **1 full** vào `public/audio/`
- [ ] Copy **3 PNG** nghe (câu 1–3) vào `public/topik_images/`
- [ ] Mỗi câu có `correct_ans`, `audio_url`, `transcript`
- [ ] Câu 21–50: cặp câu dùng chung file `q{A}_{B}.mp3`

### Bước C — Merge Đọc vào bank

```bat
cd topik-frontend
copy data\sources\topik2-{KY}-reading.txt   ← đặt file txt vào data\sources\
copy reading_images\*.png  public\topik_images\
python scripts\merge-reading-bank.py {KY}
```

Kết quả mong đợi:

```
[merge] Listening=50 Reading=50 -> data\topik2-{KY}-bank.json
```

### Bước D — Đăng ký & kiểm tra

- [ ] Thêm kỳ vào `src/modules/lib/examMeta.ts`
- [ ] Seed DB (nếu dùng MySQL backend)
- [ ] Mở web → chọn kỳ → thử Nghe + Đọc

### Import hàng loạt (12 kỳ đọc)

```bat
cd topik-frontend
python scripts\import-all-reading-exams.py
```

---

## 9. Checklist xác nhận “đề OK” (giống kỳ 60)

| Kiểm tra | Kỳ 60 | Kỳ mới |
|----------|-------|--------|
| Bank: 50 nghe + 50 đọc | ✅ | ☐ |
| Đáp án nghe 50/50 | ✅ | ☐ |
| Đáp án đọc 50/50 | ✅ | ☐ |
| MP3 đoạn 35/35 | ✅ | ☐ |
| MP3 full | ✅ | ☐ |
| Ảnh nghe 3/3 | ✅ | ☐ |
| Ảnh đọc 13/13 (file tồn tại) | ✅ | ☐ |
| `IMG:` trong txt khớp PNG | ✅ | ☐ |
| Dropdown chọn được kỳ | ✅ | ☐ |

---

## 10. File tham chiếu trực tiếp trong repo (kỳ 60)

| File | Vai trò |
|------|---------|
| `topik-frontend/data/topik2-60-bank.json` | Bank đầy đủ 100 câu |
| `topik-frontend/data/sources/topik2-60-reading.txt` | Mẫu txt đọc |
| `topik-frontend/public/audio/topik2-60-listen-*.mp3` | Audio nghe |
| `topik-frontend/public/topik_images/topik2-60-*` | Ảnh nghe + đọc |
| `topik-frontend/scripts/merge-reading-bank.py` | Script merge đọc |
| `topik-frontend/scripts/import-all-reading-exams.py` | Import 12 kỳ |
| `topik-frontend/src/modules/lib/examMeta.ts` | Cấu hình dropdown |

---

## 11. Mẫu nhanh — đổi kỳ 60 → kỳ 64

```
topik2-60  →  topik2-64
Ki60_2019  →  Ki64_2020
topik2-60-reading.txt  →  topik2-64-reading.txt
topik2-60-read-q5.png  →  topik2-64-read-q5.png
topik2-60-listen-q1.mp3  →  topik2-64-listen-q1.mp3
```

Chỉ cần **find-replace số kỳ** theo bảng trên, giữ nguyên cấu trúc folder và form txt/json.

---

*Tài liệu sinh từ đề kỳ 60 đang chạy production — cập nhật khi pipeline thay đổi.*
