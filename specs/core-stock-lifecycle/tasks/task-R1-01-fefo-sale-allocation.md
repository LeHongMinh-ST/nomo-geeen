# Task R1-01: Allocate sale quantities by FEFO

**Requirement:** R2
**Status:** pending
**Priority:** P1
**Estimated Effort:** 1-2 days
**Dependencies:** `tasks/task-R0-01-batch-receiving.md`
**Spec:** specs/core-stock-lifecycle/

## Context

Sales currently decrement only aggregate stock. A shared allocator is required so quick sales and order completion consume the earliest eligible batches consistently.

## Constraints

- **MUST** exclude recalled and expired batches and use deterministic FEFO ordering.
- **MUST** persist SaleLineBatch rows and batch-linked movements.
- **MUST** fail atomically if eligible quantity is insufficient.
- **SCOPE** completed sale paths; returns and cancellation compensation remain later work.

## Steps

- [ ] Create a transaction-scoped FEFO allocator under `backend/src/platform/inventory/`.
- [ ] Replace direct sale stock decrement in quick sale and order completion with allocation and batch updates.
- [ ] Persist allocations and batch-linked OUT movements without changing sale money behavior.

## Requirements

- R2.1, R2.2, R2.3, R2.4

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/inventory/fefo-allocator.ts` | Create | Shared transaction allocator. |
| `backend/src/platform/sales/sales.service.ts` | Modify | Integrate quick sale and order completion. |
| `backend/src/platform/sales/sales.service.spec.ts` | Modify | FEFO and rollback tests. |

## Completion Criteria

- [ ] One sale line can consume multiple batches in FEFO order.
- [ ] Expired/recalled batches are never consumed.
- [ ] Insufficient eligible stock leaves no committed partial decrement.
- [ ] Every allocation remains tenant and warehouse scoped.

## Evidence

- [ ] Automated verification: `pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sales.service.spec.ts`.
- [ ] Artifact verification: inspect SaleLineBatch and StockMovement batchId writes.
- [ ] Runtime reachability verification: quick sale and order completion both invoke the same allocator.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Concurrent sale oversells a batch | High | serializable transaction plus conditional batch update |
