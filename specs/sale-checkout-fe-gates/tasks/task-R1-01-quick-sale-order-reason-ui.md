# Task R1-01: Quick sale order reason ui

**Requirement:** R2
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5 day
**Dependencies:** `tasks/task-R0-01-sale-error-reason-map.md`
**Spec:** specs/sale-checkout-fe-gates/

## Context

- **Why**: Map must reach POS catch paths.
- **Current state**: quick-sale nested ternary; order-form uses Error.message; order-detail sets raw error.
- **Target outcome**: All three use `mapSalesApiError`.

## Constraints

- **MUST**: Wire map on createQuickSale, createOrder, completeOrder failure UI.
- **MUST**: Surfaces that show failure text use `mapSalesApiError(...)` result string (not only store raw Error).
- **MUST NOT**: Prefer raw `Error.message` over map for createOrder/complete failure paths.
- **MUST NOT**: Change payment/settlement logic; no PHI hard block.
- **SCOPE**: three sales components + existing tests adjust if needed.
- <!-- Updated: Validation Session 1 — order-detail complete banner; no Error.message preference -->

## Steps

- [x] 1. Import `mapSalesApiError` in `frontend/components/app/sales/quick-sale.tsx`; replace nested stock/customer/generic ternary with map (keep 401 handling if status-only outside map is cleaner).
  - _Requirements: 2.1_
- [x] 2. Wire `order-form.tsx` catch for createOrder (and draft path if same) via `setError(mapSalesApiError(cause))`.
  - _Requirements: 2.2_
- [x] 3. Wire `order-detail.tsx` complete (and optionally cancel) so user-visible alert/banner shows `mapSalesApiError(e)` for 422 eligibility — do not leave complete failures looking like load 403/404 only.
  - _Requirements: 2.3_
- [x] 4. Adjust component tests if they assert old strings; add/assert PRODUCT_LOCKED path on quick-sale if harness exists.
  - _Requirements: 4.2_

## Requirements

- 2.1, 2.2, 2.3, 4.2

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/components/app/sales/quick-sale.tsx` | Modify | Catch map. |
| `frontend/components/app/sales/order-form.tsx` | Modify | Catch map. |
| `frontend/components/app/sales/order-detail.tsx` | Modify | Complete error map. |
| `frontend/lib/sales-api-error.ts` | Read | Map API. |
| `frontend/components/app/sales/__tests__/order-form.test.tsx` | Modify | If needed. |

## Completion Criteria

- [x] PRODUCT_LOCKED (or similar) reject shows mapped VI on quick-sale.
- [x] order-form create failure shows mapped reason when provided (not raw Nest message alone).
- [x] order-detail complete failure shows mapped VI string in user-visible UI when reason provided.
- [x] Map imported (not orphan).

## Evidence

### Automated verification

```bash
pnpm --dir frontend test sales-api-error
pnpm --dir frontend test order-form
```

### Artifact verification

- Grep three components for `mapSalesApiError`.

### Runtime reachability verification

- Entrypoint: POS routes that mount quick-sale / order-form / order-detail (existing app routes).

### Contract / negative-path verification

- Mock throw `{ reason: 'PRODUCT_RECALLED' }` → mapped alert text.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| order-detail error type not Error | Medium | Normalize via mapSalesApiError(unknown) |
| Test flakiness | Low | Targeted asserts only |


### Verification receipt — 2026-07-23T16:44:34+07:00

```bash
pnpm --dir frontend test order-form order-detail sales-api-error
# Test Files  4 passed (4)
# Tests  19 passed (19)
# PASS
```

- Grep: mapSalesApiError in quick-sale, order-form, order-detail.
- order-detail: actionError banner for complete/cancel mapped VI.
- Mode: full-spec develop.
