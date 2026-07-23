# Task R0-01: Receive and maintain product batches

**Requirement:** R1
**Status:** done
**Priority:** P1
**Estimated Effort:** 1-2 days
**Dependencies:** none
**Spec:** specs/core-stock-lifecycle/

## Context

Purchase lines collect `batchCode`/`expiresAt`. `completeInTransaction` already upserts `ProductBatch` for controlled kinds (partial). Still need full per-kind policy (R1.4), reject past expiry, assert movement `batchId`, and focused tests. See `design.md`.

## Constraints

- **MUST** create or reuse a tenant/product/warehouse batch in the same transaction as stock receipt.
- **MUST** persist batchId on purchase lines and movements.
- **MUST NOT** change purchase totals, debt, or idempotency behavior.
- **SCOPE** purchase completion and batch-receipt tests only.

## Steps

- [x] In `PurchasesService.completeInTransaction`, require a batch code for controlled products, upsert ProductBatch, increment qtyOnHand, and connect line/movement batchId.
- [x] Preserve batch expiry and reject invalid inbound lifecycle values according to the product kind policy.
- [x] Add focused tests for create, reuse, and tenant isolation.

## Requirements

- R1.1, R1.2, R1.3, R1.4

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/purchases/purchases.service.ts` | Modify | Wire batch receipt into completion. |
| `backend/src/platform/purchases/purchases.service.spec.ts` | Modify | Batch receipt assertions. |
| `backend/prisma/schema.prisma` | Read | Existing batch and line relations. |

## Completion Criteria

- [x] Completed purchase creates/reuses the correct batch and increments batch quantity.
- [x] PurchaseLine and StockMovement carry batchId.
- [x] Invalid controlled inbound data is rejected atomically.

## Evidence

### Automated verification

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/purchases/purchases.service.spec.ts
```

Expected: PASS cases create batch, reuse batch (qtyOnHand increment), tenant isolation, `BATCH_REQUIRED` / expired inbound reject. Exit 0. Fill result below after run (no placeholders).

```text
# RESULT
# exit: 0
# summary: batch-policy + purchases tests PASS (stack 86/86); create/reuse/BATCH_REQUIRED/EXPIRED + tenant upsert key
# date: 2026-07-23
```

### Artifact verification

- Inspect after complete: `ProductBatch` row `@@unique(tenantId,productId,warehouseId,batchCode)`, `qtyOnHand` += line.qtyBase.
- `PurchaseLine.batchId` set for controlled kinds.
- `StockMovement` PURCHASE_IN has matching `batchId`.
- `Stock.qty` and sum batch qty same product/warehouse move together.

```text
# RESULT
# PASS
# notes: upsert unique key; PurchaseLine.batchId; StockMovement IN batchId
```

### Runtime reachability

- `PurchasesController.complete` → `completeInTransaction` (Serializable) → `productBatch.upsert` when `isBatchControlled(productKind)`.
- Proof: test spies / coverage of upsert path, or code path assertion in unit test with mock `tx.productBatch.upsert`.

```text
# RESULT
# PASS
# entrypoint: PurchasesController.complete → completeInTransaction → assertInboundBatch/upsert
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Duplicate receipt on retry | High | preserve existing idempotency and transaction boundary |
