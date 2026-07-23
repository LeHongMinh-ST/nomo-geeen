# Verification Receipt — sale-checkout-kind-gates

**Date:** 2026-07-23  
**Spec:** `specs/sale-checkout-kind-gates/`  
**Phase:** code closeout (R1-02 + review hardening)

## Commands

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sale-eligibility-policy.spec.ts
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sales.service.spec.ts
pnpm --dir backend build
```

| Command | Exit | Result |
|---|---|---|
| sale-eligibility-policy.spec.ts | 0 | 12/12 PASS |
| sales.service.spec.ts | 0 | 73/73 PASS |
| nest build | 0 | PASS |

Combined tests: **85/85 PASS** (fresh run after review hardening).

## Artifact / wire proof

| Check | Result |
|---|---|
| `sale-eligibility-policy.ts` exports `assertProductSaleEligible`, `extractSaleAdvisories` | PASS |
| Reasons: PRODUCT_INACTIVE / LOCKED / RECALLED / UNSELLABLE | PASS |
| Wire createOrder `sales.service.ts:404` | PASS |
| Wire completeInTransaction `sales.service.ts:572` | PASS |
| Wire createQuickSale `sales.service.ts:890` | PASS |
| complete product select: tenantId, deletedAt, status, isLocked, isRecalled, productKind, attrs | PASS (`sales.service.ts:539-550`) |
| complete rejects soft-deleted and cross-tenant products | PASS (new regression tests) |
| FEFO after eligibility | PASS (assert loop before `resolveSaleAllocations`) |

## Reachability

```
SalesController (sales.controller.ts)
  → createOrder :55-56
  → completeOrder :62-67
  → createQuickSale :90-94
  → SalesService
    → assertProductSaleEligible (sale-eligibility-policy.ts)
```

Module: `SalesModule` providers → `AppModule` import (existing).

## Test integrity

- Policy suite: 12 `it(` blocks (R0-01).
- Service suite: 58 `it(` blocks (deny paths added in R1-01; no existing tests deleted/weakened).
- Locked quick-sale expected reason updated to `PRODUCT_LOCKED` — intentional (specific reason).

Deny path names present:
- rejects a recalled product on quick sale before stock write
- rejects createOrder when product is locked before sale create
- rejects complete when product became recalled after DRAFT
- rejects complete when line product is missing
- rejects complete when product was soft-deleted after DRAFT
- rejects complete when line product belongs to another tenant

## out_of_scope (not claimed)

- Frontend checkout UI / PHI display screens
- Hard block sale based on harvest date vs PHI calendar
- SalesReturn / PurchaseReturn
- Handbook snapshot on order
- Reports module
- Livestock individual state machine
- Aquaculture-specific rules
- New Prisma columns for PHI/REI
- Tenant audit event wiring
- QuickSaleApiErrorReason DTO expansion (non-blocking medium note from R1-01 review)

## Task completion map

| Task | Status |
|---|---|
| R0-01 Sale eligibility policy | done |
| R1-01 Wire sales service gates | done |
| R1-02 Sale gate verification | done (this receipt) |
