# Task R1-01: Wire sales service gates

**Requirement:** R2, R3, R6
**Status:** done
**Priority:** P1
**Estimated Effort:** 1 day
**Dependencies:** `tasks/task-R0-01-sale-eligibility-policy.md`
**Spec:** specs/sale-checkout-kind-gates/

## Context

- **Why**: Policy must run on every stock-affecting sale write path.
- **Current state**: `createOrder` / `createQuickSale` / `completeInTransaction` use inline product flag checks.
- **Target outcome**: Replace/augment with `assertProductSaleEligible`; re-check on complete; keep FEFO allocation.

## Constraints

- **MUST**: Call policy before line create and before stock decrement on complete/quick.
- **MUST**: Load product fields needed: status, isLocked, isRecalled, productKind, attrs (if advisory needed).
- **MUST NOT**: Skip FEFO/`resolveSaleAllocations` for batch-controlled kinds; no returns; no handbook snapshot.
- **SCOPE**: `sales.service.ts` + service unit tests for deny paths.

## Steps

- [x] 1. Import `assertProductSaleEligible` in `sales.service.ts`; use in createOrder product loop.
  - _Requirements: 2.1_
- [x] 2. On `completeInTransaction`, expand product include/select beyond `productKind` only: load `status`, `isLocked`, `isRecalled`, `productKind` (and `attrs` if advisories). Re-assert eligibility before allocations/stock. Missing product → reject (`PRODUCT_UNSELLABLE`); never skip assert.
  - _Requirements: 2.2, 3.2_
- [x] 3. Wire createQuickSale the same way before stock mutation; keep tenant-scoped product queries.
  - _Requirements: 2.3, 3.1, 6.2_
- [x] 4. Keep eligibility checks inside existing sales `$transaction` boundaries (no new cross-service RPC for multi-line carts up to typical POS size).
  - _Requirements: 6.1_
- [x] 5. Add/adjust `sales.service.spec.ts` cases: locked/recalled reject without stockMovement.
  - _Requirements: 5.2_

## Requirements

- 2.1, 2.2, 2.3, 3.1, 3.2, 5.2, 6.1, 6.2

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/sales.service.ts` | Modify | Wire eligibility. |
| `backend/src/platform/sales/sales.service.spec.ts` | Modify | Deny-path tests. |
| `backend/src/platform/sales/sale-eligibility-policy.ts` | Read | Policy API. |
| `backend/src/platform/inventory/fefo-allocator.ts` | Read | Allocation remains after gate. |

## Completion Criteria

- [x] createOrder rejects unsellable product before sale create.
- [x] complete rejects if product becomes recalled/locked after DRAFT (re-check with full flags, not productKind-only select).
- [x] complete rejects missing/soft-deleted product on line.
- [x] quick sale rejects unsellable before stock write.
- [x] Policy not orphaned (imported from service).

## Evidence

### Automated verification

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sales.service.spec.ts
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sale-eligibility-policy.spec.ts
```

### Artifact verification

- Grep service for `assertProductSaleEligible` at create + complete + quick.
- Grep `completeInTransaction` product select includes `status` / `isLocked` / `isRecalled` (not only `productKind`).

### Runtime reachability verification

- Entrypoint: `SalesController` → `SalesService` methods already registered in `SalesModule` / `AppModule`.

### Contract / negative-path verification

- Mock locked product on create → no sale create.
- Mock product recalled at complete (was ok at DRAFT) → no `stockMovement.create`.



### Verification receipt (2026-07-23)

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sales.service.spec.ts
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sale-eligibility-policy.spec.ts
```

**PASS** — sales.service.spec: 71/71 · sale-eligibility-policy.spec: 12/12 · combined 83/83 · exit 0

Artifact:
- PASS — `assertProductSaleEligible` at sales.service.ts:404 (createOrder), :572 (complete), :890 (quick)
- PASS — complete select includes status/isLocked/isRecalled/productKind/attrs
- PASS — policy imported `sales.service.ts:13` (not orphan)

Negative paths:
- createOrder locked → no sale.create (PRODUCT_LOCKED)
- complete recalled after DRAFT → no stockMovement.create (PRODUCT_RECALLED)
- complete missing product → PRODUCT_UNSELLABLE
- quick recalled → no stock.updateMany

Quality gate:
- Stage A Test: PASS
- Stage A Spec: SPEC_PASS · Critical 0
- Stage B Quality: Score 9.7/10 · Critical 0 · PASS
- Note (non-blocking): QuickSaleApiErrorReason DTO still lists legacy PRODUCT_UNSELLABLE only — FE mapping follow-up outside R1-01 Related Files

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Complete uses thin product select | High | Expand select to include flags |
| Test suite large/flaky | Medium | Targeted deny cases only |
