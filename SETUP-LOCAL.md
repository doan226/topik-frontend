# Thiết lập local — đã làm sẵn

## Đã cấu hình

- [x] `topik-backend/topikai/.env.backend` (MySQL root/123456, JWT dev, SEED_TEST_USERS=true)
- [x] User test trong DB: **A** / **1** (FREE), **A1** / **1** (PREMIUM)
- [x] `topik-frontend/.env.development.local` — port backend (tự ghi khi chạy `run-backend.ps1`)

## Chạy local

```powershell
# Terminal 1 — backend
cd c:\WEDTOPIKAI\topik-backend\topikai\scripts
.\run-backend.ps1

# Terminal 2 — frontend
cd c:\WEDTOPIKAI\topik-frontend
npm run dev
```

Mở http://localhost:5173 → đăng nhập **A** / **1** hoặc **A1** / **1**.

Nếu login không có token: đảm bảo frontend proxy trỏ đúng port backend (xem log `Backend: http://localhost:808x`).

## Reset user test

```powershell
cd c:\WEDTOPIKAI\topik-backend\topikai\scripts
.\seed-test-users.ps1
```

---

# Production — cần bạn cung cấp / làm trên dashboard

Không thể tự deploy Render/Vercel nếu chưa có quyền tài khoản. Làm lần lượt:

## 1. Render (backend)

Vào **Environment** của service backend, thêm:

| Biến | Ghi chú |
|------|---------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `JWT_SECRET` | Chuỗi ngẫu nhiên ≥ 32 ký tự |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | MySQL Render |
| `ADMIN_API_KEY` | Chuỗi mạnh (giữ bí mật) |
| `GEMINI_API_KEY` | Từ Google AI Studio |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | Nếu dùng đăng ký OTP |
| `CASSO_SECURE_TOKEN` | Từ Casso (nếu dùng) |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | Nếu dùng VNPay |

**Không** đặt `SEED_TEST_USERS=true` trên production.

Sau deploy: chạy `scripts/seed-test-users.sql` trên **MySQL production** (Workbench / Render shell) nếu muốn A/A1 trên web.

## 2. Vercel (frontend)

| Biến | Giá trị |
|------|---------|
| `VITE_API_BASE_URL` | URL backend Render, vd. `https://topik-backend-1.onrender.com` |

Redeploy frontend.

## 3. Gửi cho tôi (nếu muốn tôi hỗ trợ tiếp)

- URL backend Render production
- Xác nhận đã set env trên Render/Vercel
- (Tùy chọn) `GEMINI_API_KEY`, `BREVO_API_KEY` — chỉ nếu cần test đăng ký OTP / chấm AI trên prod

**Không gửi** mật khẩu DB hay JWT production qua chat công khai; chỉ set trên dashboard.
