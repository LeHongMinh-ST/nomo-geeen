# Research: Stock Adjustment Core Reasons

## Evidence Summary

- **Codebase scout**: Required.
  - `StockAdjustment` / `StockAdjustmentLine` exist in `backend/prisma/schema.prisma` (status string, lines with qtyBefore/After/delta, optional batchId) but **no** Nest service/controller under `backend/src/platform/`.
  - `StockReason.ADJUSTMENT` and `StockDirection` IN/OUT exist; purchase/sale write movements with PURCHASE/SALE reasons.
  - Dual-write stock + batch patterns live in `purchases.service.ts` and `fefo-allocator.ts` / `batch-policy.ts` from `core-stock-lifecycle`.
  - Inventory module is read-oriented (`inventory.service.ts`); not adjustment writer.
- **External research**: Skipped — internal domain vocabulary from `docs/core-business-catalog.md` and audit `docs/audit-core-business-catalog-2026-07-22.md` gap #6.
- **Selected decision**: API-first tenant stock-adjustment module reusing existing models; add `reasonCode` on line (schema/migration) + pure policy map by `ProductKind`; complete path dual-writes Stock + optional ProductBatch + movement ADJUSTMENT in Serializable tx.
- **Rejected alternatives**:
  - Free-text only reasons — rejected (catalog §13 audit requires reason taxonomy).
  - Auto FEFO split on decrease without batchId — rejected (YAGNI; force explicit batch for controlled decreases).
  - Full FE cycle-count wizard — rejected (scope_lock FE optional later).
- **Gaps**: Line model lacks reasonCode today — must add. Status is free string — standardize DRAFT/COMPLETED. No idempotency key on model — optional create key or omit (document).
- **Downstream**: Tasks R0 schema/policy → R1 service → R1 API → R1 tests. Depends on core-stock-lifecycle for batch dual-write expectations.

## Catalog reason seeds (Phase 1)

| ProductKind | Example reason codes (closed set) |
|---|---|
| PESTICIDE / VET_DRUG | `MOISTURE_DAMAGE`, `EXPIRED_SCRAP`, `RECALL_SCRAP`, `COUNT_CORRECTION` |
| FERTILIZER | `MOISTURE_CAKING`, `BAG_TEAR`, `QUALITY_LOSS`, `COUNT_CORRECTION` |
| SEED / SEEDLING / CROP_SEED | `MOLD_MOISTURE`, `DEAD_PLANT`, `CULL`, `CARE_SHRINK`, `COUNT_CORRECTION` |
| ANIMAL_FEED | `MOISTURE`, `MOLD`, `CAKING`, `OPEN_BAG`, `SHRINK`, `COUNT_CORRECTION` |
| LIVESTOCK_SEED | `DEAD`, `SICK_CULL`, `QUARANTINE_HOLD`, `SOURCE_RETURN`, `COUNT_CORRECTION` |
| OTHER / fallback | `COUNT_CORRECTION`, `OTHER_LOSS` |

Exact code list is fixed in design/policy module; Vietnamese labels for FE later.

## Risks

| Risk | Mitigation |
|---|---|
| Drift stock vs batch on decrease | Require batchId for controlled kinds on negative delta; conditional update qtyOnHand |
| Over-broad reason enum in Prisma | Prefer string reasonCode validated in app layer against kind map |
| Completing twice | Status guard COMPLETED short-circuit |
