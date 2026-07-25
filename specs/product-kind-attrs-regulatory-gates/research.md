# Research

## Source findings

- `backend/src/platform/products/product-contract.ts` already owns `KIND_GROUP` and `REQUIRED_ATTRS`, and `validateProductContract` is the single funnel used by both `ProductsService.create` (`products.service.ts:237`) and `ProductsService.update` (`products.service.ts:344`, which merges `dto.attrs ?? current.attrs`). Extending this one module makes `ProductKind` authoritative on every write path without touching controllers.
- `REQUIRED_ATTRS` currently omits every specialized regulatory attr the catalog mandates: no `phiDays`/`reiDays` for `PESTICIDE`, no separate withdrawal periods for `VET_DRUG`, no nutrient percentages for `FERTILIZER`. There is also no rejection of attrs belonging to a different kind, so a fertilizer can silently carry PHI today.
- `backend/src/platform/sales/sale-eligibility-policy.ts` already hard-gates PHI and withdrawal when the sale supplies a date, but the branches are kind-agnostic: the PHI branch fires for any kind carrying `phiDays`, the withdrawal branch collapses meat/milk/egg via `.find(...)` into the first defined value, and there is no REI branch at all.
- `SalesService` calls `assertProductSaleEligible` + `assertSaleRegulatoryDates` on all three write paths before stock mutation: order create (`sales.service.ts:458`), draft completion (`sales.service.ts:676`, which also passes `tenantId` and reads persisted `SaleLine` snapshots), and quick sale (`sales.service.ts:1037`). Denials are audited via `recordSaleDenial` (`sales.service.ts:82`), so no new wiring is needed for `SALE_DENY`.
- `SaleLine.harvestDate` and `SaleLine.withdrawalEndDate` already exist as `DateTime? @db.Date` (`prisma/schema.prisma:1375-1376`, migration `20260724210000_sale_regulatory_dates`), and both line DTOs already validate them as optional ISO-8601. REI reuses the same supplied harvest date, so this slice needs no schema or DTO change.
- `frontend/lib/sales-api-error.ts` maps `PRODUCT_PHI_ACTIVE` (line 64) and `PRODUCT_WITHDRAWAL_ACTIVE` (line 66) to locked Vietnamese copy, and `sales-api-error.test.ts` asserts both. Reusing these two codes keeps the mapper compatible with no frontend edit.

## Catalog authority

- `docs/core-business-catalog.md` §5.1 lists PHI and REI as pesticide attributes; §5.2 states fertilizer must not use PHI/REI and requires `%N`, `%P₂O₅`, `%K₂O`; §8 requires the three withdrawal periods kept separate and forbids reusing crop PHI/REI for veterinary drugs.
- `docs/audit-core-business-catalog-2026-07-22.md` line 128 tracks missing PHI/REI and NPK validation, line 148 tracks the missing separate withdrawal fields, and line 290 tracks the missing kind-scoped hard gates. Those three lines are exactly this slice.

## Evidence Summary

- Source inspection: `validateProductContract` is the only attrs validator reachable from create and update, so per-kind rules added there are server-authoritative.
- Source inspection: all three sale paths already invoke the policy before any stock write, so kind-scoping the existing branches cannot introduce a mutation-before-deny regression.
- Source inspection: the persisted `SaleLine` date snapshots are already read on draft completion, so a REI branch keyed on harvest date is automatically re-evaluated at completion time.
- Source inspection: the frontend reason mapper already covers both reason codes this slice reuses, so mapper compatibility needs no change.

Unresolved questions: regulatory master-data ownership and backfill of pre-existing products remain outside this slice; tightening required attrs applies to new writes only, since `update` merges current attrs and would otherwise reject edits to legacy rows.
