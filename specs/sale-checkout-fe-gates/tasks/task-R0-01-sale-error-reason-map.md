# Task R0-01: Sale error reason map

**Requirement:** R1, R5
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5 day
**Dependencies:** none
**Spec:** specs/sale-checkout-fe-gates/

## Context

- **Why**: Backend eligibility returns PRODUCT_LOCKED/RECALLED/INACTIVE/UNSELLABLE; FE still shows generic fail text.
- **Current state**: `quick-sale.tsx` hardcodes INSUFFICIENT_STOCK + INVALID_CUSTOMER only; `userFetch`/`createUserApiError` already attach **top-level** `reason` on thrown `UserApiError` (`frontend/lib/user-auth-api.ts`).
- **Target outcome**: Pure `mapSalesApiError` + unit tests.
- <!-- Updated: Validation Session 1 — reason top-level + locked stock/customer copy + no message preference -->

## Constraints

- **MUST**: Cover PRODUCT_UNSELLABLE, PRODUCT_LOCKED, PRODUCT_RECALLED, PRODUCT_INACTIVE + stock/customer + fallback.
- **MUST**: Pure function, Vietnamese POS copy, no network.
- **MUST**: Read `reason` from thrown object top-level (`error.reason` when object); also accept string reason if passed through helper overload if implemented.
- **MUST**: INSUFFICIENT_STOCK / INVALID_CUSTOMER messages **byte-identical** to design.md locked UX table (current quick-sale copy).
- **MUST**: Missing/unknown reason → `fallback` arg or default generic VI — **never** raw `Error.message`.
- **MUST NOT**: Hard-block PHI; no backend changes.
- **SCOPE**: New lib + unit test only (wire in R1-01).

## Steps

- [x] 1. Create `frontend/lib/sales-api-error.ts` exporting `mapSalesApiError(error: unknown, fallback?: string): string` extracting top-level `reason` from Error/`UserApiError`/plain objects.
  - _Requirements: 1.1, 1.2, 1.3, 5.1_
- [x] 2. Map table per design.md **locked** UX copy (eligibility + exact stock/customer + default fallback string).
  - _Requirements: 1.3_
- [x] 3. Add `frontend/lib/sales-api-error.test.ts` matrix: four eligibility reasons, stock, customer, unknown, missing reason, non-Error input.
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

- [x] All four eligibility reasons map to distinct non-empty VI strings.
- [x] INSUFFICIENT_STOCK / INVALID_CUSTOMER non-regressive.
- [x] Unknown reason uses fallback.
- [x] Unit tests pass; map not required to be imported by UI yet (wire R1-01).

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


### Verification receipt — 2026-07-23T16:40:58+07:00

```bash
pnpm --dir frontend test sales-api-error
# Test Files  1 passed (1)
# Tests  10 passed (10)
# PASS
```

- Export `mapSalesApiError` in `frontend/lib/sales-api-error.ts`.
- Input without reason → default fallback VI.
- Orphan map OK for R0-01 (wire R1-01).
- Mode: full-spec develop.
