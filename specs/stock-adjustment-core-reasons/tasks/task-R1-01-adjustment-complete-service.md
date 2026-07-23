# Task R1-01: Complete adjustment with stock/batch dual write

**Requirement:** R1, R3, R5
**Status:** done
**Priority:** P1
**Estimated Effort:** 1-2 days
**Dependencies:** `tasks/task-R0-01-reason-vocabulary-and-schema.md`
**Spec:** specs/stock-adjustment-core-reasons/

## Context

- **Why**: No service writes StockAdjustment today; completion must dual-write like core-stock-lifecycle.
- **Current state**: Models only; purchase/sale show movement patterns.
- **Target outcome**: `StockAdjustmentsService.complete` updates Stock, batch when needed, movement ADJUSTMENT, status COMPLETED.

## Constraints

- **MUST**: Serializable transaction; reject negative stock; reason policy; tenant scope.
- **MUST**: Decrease on batch-controlled kinds requires batchId with sufficient qtyOnHand (`isBatchControlled` from `batch-policy.ts`).
- **MUST**: Create header with explicit `status: 'DRAFT'` (schema default is COMPLETED — do not rely on it).
- **MUST**: Fill `qtyBefore`/`qtyAfter` server-side; movement `refType='StockAdjustment'`, `refId`, `refLineId`; reject empty lines and any `delta=0`.
- **MUST NOT**: Change sale/purchase totals; free-text reason bypass; complete COMPLETED docs.
- **SCOPE**: Service layer only (API in R1-02).

## Steps

- [x] 1. Implement create draft + complete in `stock-adjustments.service.ts` using Prisma TransactionIsolationLevel.Serializable (optional P2034 retry if sales/purchases pattern reused).
  - _Requirements: 1.1, 1.2, 5.1_
- [x] 2. Per line: load product (tenant), `assertReasonAllowed(kind, reasonCode)`, snapshot stock, reject nextQty < 0 via conditional update, update ProductBatch when batchId/required, write StockMovement ADJUSTMENT with ref fields, persist qtyBefore/After/delta/reasonCode.
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
- [x] 3. Service unit tests: happy path, INSUFFICIENT_STOCK, INVALID_REASON, BATCH_REQUIRED, double complete, zero-delta reject.
  - _Requirements: 1.3, 4.1_

## Requirements

- 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 4.1, 5.1

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/stock-adjustments/stock-adjustments.service.ts` | Create | Complete logic. |
| `backend/src/platform/stock-adjustments/stock-adjustments.service.spec.ts` | Create | Tests. |
| `backend/src/platform/inventory/batch-policy.ts` | Read | isBatchCodeRequired / controlled. |
| `backend/src/platform/purchases/purchases.service.ts` | Read | Movement dual-write pattern. |
| `backend/prisma/schema.prisma` | Read | Models. |

## Completion Criteria

- [x] Complete dual-writes stock/batch/movement.
- [x] Negative and reason failures leave no partial write (tx rollback).
- [x] COMPLETED is immutable.

## Evidence

### Automated verification

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/stock-adjustments/stock-adjustments.service.spec.ts
```


**Result (2026-07-23):**
- Jest service: PASS — 8/8
- Jest policy regression: PASS — 11/11 (19 total with service)
- SPEC_PASS critical 0
- Quality 9.6/10 critical 0 (after tenant stock findFirst + longer docNo)
- Artifact: StockMovement reason ADJUSTMENT, refType StockAdjustment

### Artifact verification

- Inspect complete path creates StockMovement reason ADJUSTMENT.

### Runtime reachability verification

- Service called from controller (R1-02); not orphaned after module register.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Concurrent oversell stock | High | Serializable + qty gte updates |
| Batch drift | High | Conditional batch decrement |
