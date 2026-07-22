# Research: Core Stock Lifecycle

## Evidence Summary

- `ProductBatch` already stores batch code, expiry, recall flag, and quantity, but `PurchasesService.completeInTransaction` only updates aggregate `Stock` and creates a movement without `batchId`.
- `SaleLineBatch` already exists, but both quick sale and order completion decrement aggregate `Stock` directly and do not allocate batches.
- Existing purchase/sales operations run in serializable Prisma transactions, which is the correct boundary for atomic batch allocation.
- `InventoryService` already sorts batches for display; the same ordering must be centralized in a write-path allocator.
