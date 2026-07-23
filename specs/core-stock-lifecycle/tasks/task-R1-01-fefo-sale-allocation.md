# Task R1-01: Allocate sale quantities by FEFO

**Requirement:** R2
**Status:** done
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

- [x] Create a transaction-scoped FEFO allocator under `backend/src/platform/inventory/`.
- [x] Replace direct sale stock decrement in quick sale and order completion with allocation and batch updates.
- [x] Persist allocations and batch-linked OUT movements without changing sale money behavior.

## Requirements

- R2.1, R2.2, R2.3, R2.4, R2.5

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/inventory/fefo-allocator.ts` | Create | Shared transaction allocator. |
| `backend/src/platform/sales/sales.service.ts` | Modify | Integrate quick sale and order completion. |
| `backend/src/platform/sales/sales.service.spec.ts` | Modify | FEFO and rollback tests. |

## Completion Criteria

- [x] One sale line can consume multiple batches in FEFO order.
- [x] Expired/recalled batches are never consumed.
- [x] Insufficient eligible stock leaves no committed partial decrement.
- [x] Every allocation remains tenant and warehouse scoped.

## Evidence

### Automated verification

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sales.service.spec.ts
```

Expected: PASS FEFO multi-batch order, skip expired/recalled, insufficient eligible rollback (no partial `qtyOnHand` / `Stock.qty` / SaleLineBatch), tenant+warehouse scope. Exit 0.

```text
# RESULT
# exit: 0
# summary: fefo-allocator + sales.service PASS within 86/86 suite run 2026-07-23
```

### Artifact verification

- One sale line spanning N batches → N `SaleLineBatch` rows, qty sum = line qtyBase.
- Each `StockMovement` SALE_OUT carries corresponding `batchId`.
- Consumed batches: earlier `expiresAt` first; null expiry last; never recalled/expired.

```text
# RESULT
# PASS
# notes: multi-batch FEFO order; SaleLineBatch + OUT batchId; INSUFFICIENT_ELIGIBLE_BATCH
```

### Runtime reachability

- Quick sale **and** order completion call same `allocateFefo` under `backend/src/platform/inventory/fefo-allocator.ts`.
- Proof: unit test asserts both paths call allocator, or shared helper import + mock call counts.

```text
# RESULT
# PASS
# entrypoints: createQuickSale | completeOrder → allocateFefo when isBatchCodeRequired
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Concurrent sale oversells a batch | High | serializable transaction plus conditional batch update |
