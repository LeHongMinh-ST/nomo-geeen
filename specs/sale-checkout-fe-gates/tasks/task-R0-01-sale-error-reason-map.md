# Task R0-01: Sale error reason map

**Requirement:** R1, R5
**Status:** pending
**Priority:** P1
**Estimated Effort:** 0.5 day
**Dependencies:** none
**Spec:** specs/sale-checkout-fe-gates/

## Context

- **Why**: Backend eligibility returns PRODUCT_LOCKED/RECALLED/INACTIVE/UNSELLABLE; FE still shows generic fail text.
- **Current state**: `quick-sale.tsx` hardcodes INSUFFICIENT_STOCK + INVALID_CUSTOMER only; `userFetch` already surfaces `reason` via `createUserApiError`.
- **Target outcome**: Pure `mapSalesApiError` + unit tests.

## Constraints

- **MUST**: Cover PRODUCT_UNSELLABLE, PRODUCT_LOCKED, PRODUCT_RECALLED, PRODUCT_INACTIVE + existing stock/customer + fallback.
- **MUST**: Pure function, Vietnamese POS copy, no network.
- **MUST NOT**: Hard-block PHI; no backend changes.
- **SCOPE**: New lib + unit test only (wire in R1-01).

## Steps

- [ ] 1. Create `frontend/lib/sales-api-error.ts` exporting `mapSalesApiError(error: unknown, fallback?: string): string` reading `reason` from Error-like objects.
  - _Requirements: 1.1, 1.2, 1.3, 5.1_
- [ ] 2. Map table per design.md UX copy; unknown → fallback.
  - _Requirements: 1.3_
- [ ] 3. Add `frontend/lib/sales-api-error.test.ts` matrix.
  - _Requirements: 4.1_

## Requirements

- 1.1, 1.2, 1.3, 4.1, 5.1

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/sales-api-error.ts` | Create | Pure reason map. |
| `frontend/lib/sales-api-error.test.ts` | Create | Unit tests. |
| `frontend/lib/user-fetch.ts` | Read | Confirms reason on throw. |
| `backend/src/platform/sales/dto/create-quick-sale.dto.ts` | Read | Reason union alignment. |

## Completion Criteria

- [ ] All four eligibility reasons map to distinct non-empty VI strings.
- [ ] INSUFFICIENT_STOCK / INVALID_CUSTOMER non-regressive.
- [ ] Unknown reason uses fallback.
- [ ] Unit tests pass; map not required to be imported by UI yet (wire R1-01).

## Evidence

### Automated verification

```bash
pnpm --dir frontend test sales-api-error
```

(If project uses vitest path differently, use the package script that runs `frontend/lib/sales-api-error.test.ts`.)

### Artifact verification

- Export `mapSalesApiError` exists.

### Runtime reachability verification

- Orphan map OK for R0-01; import in R1-01.

### Contract / negative-path verification

- Input without reason → fallback string.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Copy wording churn | Low | Short VI; BA tweak later |
| Test runner path variance | Medium | Document exact command in receipt |
