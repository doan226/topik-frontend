# Security deployment checklist

## Render (backend)

Set environment variables:

- `SPRING_PROFILES_ACTIVE=prod`
- `JWT_SECRET` (min 32 random characters)
- `JWT_EXPIRATION_HOURS=24`
- `DB_URL`, `DB_USER`, `DB_PASSWORD`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`
- `ADMIN_API_KEY` (strong random string)
- `CASSO_SECURE_TOKEN` (from Casso dashboard)
- `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`

Rotate any secrets that were previously committed to git.

## Vercel (frontend)

- `VITE_API_BASE_URL` = your Render backend URL (no trailing slash)
- Do **not** put `JWT_SECRET` on the frontend

## Post-deploy tests

1. Register -> OTP verify -> Login returns token
2. Authenticated `/api/v1/dashboard/{userId}` works for own userId
3. Same endpoint with another user's token returns 403
4. Unauthenticated API calls return 401
5. `POST /api/v1/auth/upgrade` removed (404)
6. Casso webhook rejects wrong `secure-token`
7. Admin endpoints require `X-Admin-Key`
8. Page refresh keeps session (token + topik_user in localStorage)

## Breaking change

Users with only `topik_user` in localStorage (no token) must log in again once after deploy.

## Test users (local / staging only)

| Username | Password | Role |
|----------|----------|------|
| `A` | `1` | FREE_USER |
| `A1` | `1` | PREMIUM_USER |

**Cách 1 — Tự động mỗi lần chạy backend (local):** trong `.env.backend` đặt `SEED_TEST_USERS=true`

**Cách 2 — SQL một lần:**

```bash
mysql -u root -p topik_db < scripts/seed-test-users.sql
```

**Cách 3 — Script:**

```powershell
cd topik-backend/topikai/scripts
.\seed-test-users.ps1
```

**Cách 4 — Production (database hiện tại trên Render, không đổi DB_URL):**

Sau khi deploy backend mới, chạy (cần `ADMIN_API_KEY` từ Render Environment):

```powershell
cd topik-backend/topikai/scripts
.\seed-production-via-api.ps1 -AdminKey "<ADMIN_API_KEY>"
```

**Cách 5 — Railway MySQL mới:**

```powershell
cd c:\WEDTOPIKAI
.\topik-backend\topikai\scripts\init-railway-db.ps1
.\topik-backend\topikai\scripts\print-render-db-env.ps1
```

Dán 3 biến `DB_*` vào Render → Save → Manual Deploy.

Không bật `SEED_TEST_USERS` trên production Render.
