# Task R0-01: Sale eligibility policy

**Requirement:** R1, R4
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5 day
**Dependencies:** none
**Spec:** specs/sale-checkout-kind-gates/

## Context

- **Why**: Audit gap #4 — sale only checks ACTIVE/locked/recalled inline; catalog requires kind-aware eligibility and stable 422 reasons.
- **Current state**: Inline checks in `sales.service.ts`; batch-policy/FEFO separate; no pure sale eligibility module.
- **Target outcome**: Pure `sale-eligibility-policy.ts` with `assertProductSaleEligible` + optional advisory extract from attrs.

## Constraints

- **MUST**: Pure functions (no Prisma); structured 422 body matching design contract.
- **MUST**: Deny inactive, locked, recalled; allow ACTIVE sellable products.
- **MUST NOT**: Hard-block on PHI/REI/withdrawal without harvest date; no FE; no schema migration; no requirement to change sale HTTP response DTOs for advisories.
- **SCOPE**: Policy module + unit tests only (wire in R1-01).

## Steps

- [x] 1. Create `backend/src/platform/sales/sale-eligibility-policy.ts` exporting `assertProductSaleEligible(product)` and optional `extractSaleAdvisories(attrs)`.
  - Reasons: `PRODUCT_INACTIVE`, `PRODUCT_LOCKED`, `PRODUCT_RECALLED`, `PRODUCT_UNSELLABLE` (missing/null).
  - _Requirements: 1.1, 1.2, 1.3_
- [x] 2. Document advisory attr keys (`phiDays`, `reiDays`, `withdrawalMeatDays`, …) — non-blocking.
  - _Requirements: 4.1, 4.2_
- [x] 3. Add `sale-eligibility-policy.spec.ts` allow/deny matrix.
  - _Requirements: 5.1_

## Requirements

- 1.1, 1.2, 1.3, 4.1, 4.2, 5.1

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/sale-eligibility-policy.ts` | Create | Pure eligibility policy. |
| `backend/src/platform/sales/sale-eligibility-policy.spec.ts` | Create | Unit tests. |
| `backend/src/platform/inventory/batch-policy.ts` | Read | Error shape pattern. |
| `backend/src/platform/stock-adjustments/adjustment-reason-policy.ts` | Read | Pure policy pattern. |
| `docs/core-business-catalog.md` | Read | Catalog hard/soft rules. |

## Completion Criteria

- [x] Policy rejects locked/recalled/inactive products with structured reasons.
- [x] Active product passes without throw.
- [x] Advisory extract does not throw on missing keys.
- [x] Unit tests pass (policy file reachable via tests; service wire deferred to R1-01).

## Evidence

### Automated verification

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sale-eligibility-policy.spec.ts
```



**PASS** — 2026-07-23 · exit 0 · Tests: 12 passed, 12 total · Time: 0.414s

```
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        0.414 s
Ran all test suites within paths "src/platform/sales/sale-eligibility-policy.spec.ts".
```

### Artifact verification

- PASS — exports `assertProductSaleEligible`, `extractSaleAdvisories`
- PASS — reason codes: `PRODUCT_INACTIVE`, `PRODUCT_LOCKED`, `PRODUCT_RECALLED`, `PRODUCT_UNSELLABLE`
- PASS — files exist at `backend/src/platform/sales/sale-eligibility-policy.ts` (+ `.spec.ts`)

### Runtime reachability verification

- Policy imported by sales service in R1-01; orphan policy OK for R0-01 only. (UNVERIFIED by design)

### Contract / negative-path verification

- PASS — denied product → 422 (`UnprocessableEntityException`) body with `reason` + `field: productId` (+ optional `productKind`)

### Quality gate

- Stage A Test: PASS (12/12)
- Stage A Spec compliance: SPEC_PASS · Critical 0
- Stage B Code quality: Score 9.6/10 · Critical 0 · PASS

### Artifact verification

- Inspect exports `assertProductSaleEligible` and reason codes.

### Runtime reachability verification

- Policy imported by sales service in R1-01; orphan policy OK for R0-01 only.

### Contract / negative-path verification

- Denied product → 422 body with `reason` + `field: productId`.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Reason code churn vs FE | Medium | Freeze design contract codes |
| Over-block missing attrs | Medium | Advisory only |
