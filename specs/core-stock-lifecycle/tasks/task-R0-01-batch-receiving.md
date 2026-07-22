# Task R0-01: Receive and maintain product batches

**Requirement:** R1
**Status:** in_progress
**Priority:** P1
**Estimated Effort:** 1-2 days
**Dependencies:** none
**Spec:** specs/core-stock-lifecycle/

## Context

Purchase lines already collect `batchCode` and `expiresAt`, but completion leaves ProductBatch empty and movements unlinked. This breaks expiry, recall, and later FEFO.

## Constraints

- **MUST** create or reuse a tenant/product/warehouse batch in the same transaction as stock receipt.
- **MUST** persist batchId on purchase lines and movements.
- **MUST NOT** change purchase totals, debt, or idempotency behavior.
- **SCOPE** purchase completion and batch-receipt tests only.

## Steps

- [x] In `PurchasesService.completeInTransaction`, require a batch code for controlled products, upsert ProductBatch, increment qtyOnHand, and connect line/movement batchId.
- [ ] Preserve batch expiry and reject invalid inbound lifecycle values according to the product kind policy.
- [ ] Add focused tests for create, reuse, and tenant isolation.

## Requirements

- R1.1, R1.2, R1.3

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/purchases/purchases.service.ts` | Modify | Wire batch receipt into completion. |
| `backend/src/platform/purchases/purchases.service.spec.ts` | Modify | Batch receipt assertions. |
| `backend/prisma/schema.prisma` | Read | Existing batch and line relations. |

## Completion Criteria

- [ ] Completed purchase creates/reuses the correct batch and increments batch quantity.
- [ ] PurchaseLine and StockMovement carry batchId.
- [ ] Invalid controlled inbound data is rejected atomically.

## Evidence

- [ ] Automated verification: `pnpm --dir backend test --runInBand --runTestsByPath src/platform/purchases/purchases.service.spec.ts`.
- [ ] Artifact verification: inspect ProductBatch, PurchaseLine.batchId, and StockMovement.batchId writes.
- [ ] Runtime reachability verification: `PurchasesController.complete` reaches the changed transaction path.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Duplicate receipt on retry | High | preserve existing idempotency and transaction boundary |
