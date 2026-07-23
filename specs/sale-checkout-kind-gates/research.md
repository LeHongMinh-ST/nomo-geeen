# Research: Sale Checkout Kind Gates

## Evidence Summary

- **Codebase scout**: Required.
  - Sale eligibility today is generic only: product must be `ACTIVE`, not `isLocked`, not `isRecalled` (`sales.service.ts` createOrder ~406–408, createQuickSale ~886–890). No `ProductKind` branch, no PHI/REI/withdrawal read, no product-level expired flag beyond product recall/lock.
  - Batch path already filters recalled + past-expiry in FEFO (`fefo-allocator.ts` `isRecalled: false`, `expiresAt gte today`). Sale complete does not re-assert product kind policy after DRAFT create.
  - `product-contract.ts` validates kind/group + required attrs at product write (`activeIngredient`, `composition`, species…). PHI/REI/withdrawal days are **catalog concepts** but **not required attrs** in `REQUIRED_ATTRS` today — only present if stored ad-hoc in `attrs` JSON.
  - Batch inbound policy: `batch-policy.ts` (`assertInboundBatch`, `assertBatchNotRecalled`) used by purchase, not by sale line product check.
  - Pattern for pure policy + 422: `adjustment-reason-policy.ts`, `batch-policy.ts` (`UnprocessableEntityException` with `{ reason, message, field? }`).
  - No `reports/` module; handbook snapshot fields exist on Sale schema but out of this scope.
- **External research**: Skipped — domain rules from `docs/core-business-catalog.md` §1, §5–9, §11 and audit gap #4.
- **Selected decision**: Introduce pure module `sale-eligibility-policy.ts` under `backend/src/platform/sales/` (or `inventory/` if shared; prefer **sales/** next to consumer). Hard blocks: inactive/locked/recalled product; kind-specific soft metadata extraction from `attrs` for PHI/REI/withdrawal **display only** (no harvest-date calendar hard block — data not on line). Batch eligibility remains FEFO; policy may assert controlled kinds still require successful allocation path already enforced. Wire into createOrder + createQuickSale + completeInTransaction (re-check product flags at complete for DRAFT aging).
- **Rejected alternatives**:
  - Hard-block sale when PHI > 0 without harvest date — rejected (no harvest date on sale line; overclaim).
  - Full livestock state machine — out of scope Phase C slice.
  - New Prisma columns for PHI/REI — rejected (YAGNI; use attrs keys when present).
  - FE-only warnings — rejected (audit requires server-side gate).
- **Gaps**: Attr keys for PHI/REI not standardized in product-contract REQUIRED_ATTRS — policy documents optional keys (`phiDays`, `reiDays`, `withdrawalMeatDays`, …) for advisory only.
- **Downstream**: Tasks R0 policy+tests → R1 wire sales service → R1 verification receipt. Depends on core-catalog-foundation + core-stock-lifecycle + sales orders.

## Catalog hard rules mapped (Phase 1 slice)

| Kind | Hard reject | Advisory only |
|---|---|---|
| All | inactive, locked, recalled product | — |
| PESTICIDE / VET_DRUG (batch-controlled) | FEFO insufficient / recalled batch (existing) | PHI/REI or withdrawal days from attrs when present |
| FERTILIZER / SEED* / FEED / LIVESTOCK_SEED | same product flags | kind-specific attrs presence not blocking sale if product ACTIVE |

## Risks

| Risk | Mitigation |
|---|---|
| Double-reject with PRODUCT_UNSELLABLE | Collapse into policy; single reason codes |
| Complete without re-check | Re-load product flags on complete |
| Attr key drift | Document keys in policy; optional advisory |
