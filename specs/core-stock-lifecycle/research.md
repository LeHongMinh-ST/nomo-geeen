# Research: Core Stock Lifecycle

## Evidence Summary

- `ProductBatch` (`schema.prisma` unique tenant/product/warehouse/batchCode) stores batch code, expiry, recall, `qtyOnHand`.
- Purchase path: `PurchasesService.completeInTransaction` already upserts batch + sets line batchId for `isBatchControlled` kinds (partial R1); still need full expiry policy + tests + movement batch assert.
- `SaleLineBatch` model exists; quick sale and order completion still decrement aggregate `Stock` only — no FEFO write path.
- Purchase/sales use `Prisma.TransactionIsolationLevel.Serializable` (+ sales P2034 retry) — correct boundary for dual stock/batch write.
- Catalog §5–9/§11 defines FEFO + per-kind inbound; audit `docs/audit-core-business-catalog-2026-07-22.md` gap #3 = batch not wired on sale + incomplete receive.
- Display-side batch sort in inventory must not diverge from write-path FEFO helper.
