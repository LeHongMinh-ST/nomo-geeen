# Design: Core Stock Lifecycle

## FEFO policy

Eligible batches satisfy the same tenant, product, warehouse scope, `isRecalled = false`, `qtyOnHand > 0`, and `expiresAt IS NULL OR expiresAt >= today` conditions. Sort by `expiresAt ASC`, with null expiry last, then `createdAt ASC`, then `id ASC`.

## Transaction invariant

The aggregate `Stock.qty` and the sum of `ProductBatch.qtyOnHand` change in the same serializable transaction. A failed allocation throws before the sale becomes completed; no partial batch decrement is committed.
