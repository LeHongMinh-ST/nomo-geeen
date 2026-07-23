# Task R1-01: Quick sale order reason ui

**Requirement:** R2
**Status:** pending
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
- **MUST NOT**: Change payment/settlement logic; no PHI hard block.
- **SCOPE**: three sales components + existing tests adjust if needed.

## Steps

- [ ] 1. Import `mapSalesApiError` in `frontend/components/app/sales/quick-sale.tsx`; replace eligibility-unaware catch branch.
  - _Requirements: 2.1_
- [ ] 2. Wire `order-form.tsx` catch for createOrder.
  - _Requirements: 2.2_
- [ ] 3. Wire `order-detail.tsx` complete (and optionally cancel) error display via map when reason present.
  - _Requirements: 2.3_
- [ ] 4. Adjust component tests if they assert old strings; add/assert PRODUCT_LOCKED path on quick-sale if harness exists.
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

- [ ] PRODUCT_LOCKED (or similar) reject shows mapped VI on quick-sale.
- [ ] order-form create failure shows mapped reason when provided.
- [ ] order-detail complete failure shows mapped reason when provided.
- [ ] Map imported (not orphan).

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
