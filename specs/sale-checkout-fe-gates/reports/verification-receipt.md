# Verification receipt — sale-checkout-fe-gates

**Date:** 2026-07-23  
**Mode:** full-spec `/hapo:develop sale-checkout-fe-gates`

## Commands

```bash
pnpm --dir frontend test sales-api-error
# Test Files  1 passed · Tests  10 passed · PASS

pnpm --dir frontend test order-form
# PASS (included in combined runs)

pnpm --dir frontend test sales-api-error sale-advisories order-form order-detail
# Test Files  5 passed · Tests  23 passed · PASS

pnpm --dir frontend build
# EXIT 0 — Next.js build complete
```

## Reachability

| Surface | Proof |
|---|---|
| `mapSalesApiError` | Imported in `quick-sale.tsx`, `order-form.tsx`, `order-detail.tsx` |
| POS routes | `/ban-nhanh`, `/don-ban-hang/tao`, `/don-ban-hang/[id]` (build lists routes) |
| Advisory strip | Mounted under cart lines; `collectSaleAdvisories` unit tests |

## Out of scope (not claimed)

- PHI/REI hard block by harvest date  
- Livestock SM  
- Backend policy / SALE_DENY audit  
- Tenant product API agro enrichment (strip hides when meta absent — R3.3)

## Artifacts

- `frontend/lib/sales-api-error.ts`  
- `frontend/lib/sales-api-error.test.ts`  
- `frontend/components/app/sales/sale-advisories-strip.tsx`  
- `frontend/components/app/sales/sale-advisories-strip.test.ts`  
- Wire: quick-sale, order-form, order-detail  
