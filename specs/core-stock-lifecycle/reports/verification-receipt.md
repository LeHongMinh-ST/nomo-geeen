# Verification receipt — core-stock-lifecycle

**Date:** 2026-07-23  
**Spec:** `specs/core-stock-lifecycle/`  
**Mode:** full develop (not flash)

## Commands

```bash
pnpm --dir backend test --runInBand --runTestsByPath \
  src/platform/inventory/batch-policy.spec.ts \
  src/platform/inventory/fefo-allocator.spec.ts \
  src/platform/purchases/purchases.service.spec.ts \
  src/platform/sales/sales.service.spec.ts
# → exit 0 | 4 suites | 86 passed

pnpm --dir backend build
# → exit 0 | nest build

pnpm --dir backend exec prisma validate
# → exit 0 | schema valid
```

## Implemented surface

| Area | Path | Behavior |
|---|---|---|
| Policy | `inventory/batch-policy.ts` | per-kind batchCode/expiresAt inbound |
| FEFO | `inventory/fefo-allocator.ts` | FEFO + `INSUFFICIENT_ELIGIBLE_BATCH` |
| Purchase | `purchases.service.ts` | assert + upsert batch, line/movement batchId |
| Sale | `sales.service.ts` | FEFO when `isBatchCodeRequired` (quick + order) |

## Reachability

- `PurchasesController.complete` → batch receive
- `SalesController.createQuickSale` / `completeOrder` → FEFO

## Out of scope (not claimed)

Returns, adjustments, aquaculture, handbook, multi-warehouse transfer, frontend, near-expiry notifications, livestock state machine, live Postgres concurrent R3.2 equality.

## Residual risk

- R3.2 under concurrent load not integration-tested (serializable + unit mocks).
- Fertilizer without batchCode: aggregate stock only on sale (optional inbound).

## Post code-review remediation (2026-07-23)

Critical fixes applied:

1. **Anti-drift optional kinds** — `resolveSaleAllocations`: required kinds always FEFO; optional (FERTILIZER/AGRI_MATERIAL) FEFO when any `qtyOnHand` on batches; OTHER aggregate only.
2. **Recalled inbound** — `assertBatchNotRecalled` before upsert; reason `BATCH_RECALLED_INBOUND`.
3. **No silent expiry extend** on batch reuse (update only qtyOnHand).
4. **Quick sale** `stock.updateMany` includes `tenantId`.
5. **P2034** clientVersion from Prisma runtime string.

```bash
pnpm --dir backend test --runInBand --runTestsByPath \
  src/platform/inventory/batch-policy.spec.ts \
  src/platform/inventory/fefo-allocator.spec.ts \
  src/platform/purchases/purchases.service.spec.ts \
  src/platform/sales/sales.service.spec.ts
# → exit 0 | 4 suites | 92 passed
```

