# TOPIK AI — Implementation Handoff

> Brief cho agent triển khai. Master plan: `.cursor/plans/topik_master_handoff_*.plan.md` (không sửa file plan).

## Bảng giá & SKU

| SKU | Mã VietQR `addInfo` | Giá (VNĐ) | Entitlement | AI chấm/ngày |
|-----|---------------------|-----------|-------------|--------------|
| Free | — | 0 | — | 2 |
| Viết 90 ngày | `TOPIKVIET {userId}` | 89.000 | WRITING_90D (+90d) | 15 |
| Viết lifetime | `TOPIKVIP {userId}` | 129.000 | WRITING_LIFE | 20 |
| TOPIK I | `TOPIKI {userId}` | 99.000 | TOPIK1 | explain 5 |
| Hán Hàn | `TOPIKHANJA {userId}` | 79.000 | HANJA | — |
| All-in | `TOPIKALL {userId}` | 189.000 | ALLIN | 20 |

**Grandfather:** `PREMIUM_USER` từ `TOPIKVIP` 50k → coi như `WRITING_LIFE`.

## Entitlement logic

```
hasWriting = WRITING_90D (chưa hết hạn) | WRITING_LIFE | ALLIN | legacy PREMIUM_USER
hasHanja   = HANJA | ALLIN  (KHÔNG từ hasWriting alone)
hasTopik1  = TOPIK1 | ALLIN
```

## Phase checklist

| Phase | Status | Key files |
|-------|--------|-----------|
| 0 Docs | Done | `docs/IMPLEMENTATION-HANDOFF.md`, `docs/BUSINESS-PLAN.md`, `PRODUCT-CONTEXT.md` |
| 1 Monetization | Done | `EntitlementService`, `SkuPaymentService`, `CassoController`, `useEntitlements`, `PricingPage`, `UpgradeModal` |
| 2 Writing quality | Done | `PreGradingValidator`, `GradingResultPanel` (4 tab), `wongojiUtils`, pre-submit checklist |
| 3 Learning loop | Done | `Essay54Wizard`, mistake SRS, rewrite v1/v2, `exportEssayImage` |
| 4 TOPIK I | Done | `topik1-*-bank.json` (10 đề), `Topik1Hub`, JSON explain, TOPIK II paywall |

## API

- `GET /api/v1/entitlements/{userId}` — full entitlement + quota snapshot
- `GET /api/v1/payment/check-vip/{userId}` — wrapper compat (deprecated)
- `GET /api/v1/products/skus` — bảng giá 5 gói
- Login response includes entitlement snapshot

## Test accounts

- **A** / **1** — FREE_USER
- **A1** / **1** — PREMIUM_USER (grandfather)

## Manual test

Xem `docs/PRACTICE-QUOTA-TEST.md` — limits: 2 chấm/ngày free, 15/20 paid.

## Casso webhook test

```bash
curl -X POST http://localhost:8080/api/v1/payment/casso-webhook \
  -H "secure-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":[{"id":"test1","description":"TOPIKVIET 1","amount":89000}]}'
```
