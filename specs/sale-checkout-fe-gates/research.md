# Research: sale-checkout-fe-gates

## Evidence Summary

### Codebase scout (2026-07-23)

| Path | Finding |
|---|---|
| `backend/src/platform/sales/sale-eligibility-policy.ts` | Hard reasons: PRODUCT_UNSELLABLE, PRODUCT_LOCKED, PRODUCT_RECALLED, PRODUCT_INACTIVE; `extractSaleAdvisories` for phi/rei/withdrawal keys (not on HTTP yet). |
| `backend/src/platform/sales/dto/create-quick-sale.dto.ts` | `QuickSaleApiErrorReason` includes eligibility codes (post fix commit). |
| `frontend/lib/tenant-sales-api.ts` | `createQuickSale` / `createOrder` / `completeOrder` via `userFetch`; no typed error body. |
| `frontend/components/app/sales/quick-sale.tsx:131-140` | Catch maps only INSUFFICIENT_STOCK + INVALID_CUSTOMER; generic fallback for eligibility denies. |
| `frontend/components/app/sales/order-form.tsx:100,109` | Errors use `Error.message` only — no reason map. |
| `frontend/components/app/sales/order-detail.tsx` | complete/cancel set raw error; incomplete reason UX. |
| `frontend/lib/products.ts` | Seed products have `agro.phi` / `agro.rei` (display on product-detail); POS cart does not surface advisories. |
| `frontend/components/app/product/product-detail.tsx` | PHI row exists — pattern for advisory labels. |

### External research

Skipped — internal FE/BE contract only; no third-party API.

### Decision

1. **Shared pure map** `mapSalesApiError(reason, fallback)` → Vietnamese copy for POS.
2. Wire map into quick-sale + order-form + order-detail complete.
3. **Advisory display**: if cart line product has attrs/phi/rei (from picker/product payload already loaded), show non-blocking chip strip — no harvest hard block.
4. Backend advisory on HTTP response **optional** this slice: prefer client-side attrs already on selected product; if attrs missing, skip strip (no extra API).

### Rejected alternatives

- Hard PHI calendar gate on FE — violates catalog + parent out_of_scope.
- Duplicate per-screen if/else without shared map — DRY fail.
- Change backend sale response DTO in this FE-only slice without need — keep YAGNI; client attrs first.

### Remaining gaps

- Whether product-picker cart lines already carry `attrs` / `productKind` / agro fields — implementer must scout picker types (task R1-02).
- Order complete error path may need userFetch to surface `response.reason` — verify userFetch error shape.

### Downstream task/test implications

- Unit test map pure function.
- Component tests: mock throw with reason codes → assert alert text.
- No E2E browser required for light tier if component tests cover map wiring.
