# Task R2-01: Real product picker

**Requirement:** R2 — API-backed product selection
**Status:** done
**Priority:** P1
**Estimated Effort:** 2–3 hours
**Dependencies:** tasks/task-R0-01-sales-contract-foundation.md
**Spec:** specs/tenant-sales-management/

## Context

- **Why**: Cashiers currently see seed products that may not belong to their tenant or reflect current stock.
- **Current state**: `ProductPicker` imports `products` from `frontend/lib/products.ts`; `frontend/lib/tenant-products-api.ts` already provides list/lookups/map helpers.
- **Target outcome**: `/ban-nhanh` searches the authenticated tenant product list and exposes only sellable current products.

## Constraints

- **MUST**: Use `listTenantProducts`, `getProductLookups`, `mapTenantProduct`, and existing `userFetch` transport; preserve the current mobile UI.
- **SHOULD**: Fetch list/lookups once per mounted picker and filter in memory for the current cart session.
- **MUST NOT**: Reintroduce seed/mock products in the runtime picker or add server-side search/customer scope.
- **SCOPE**: Product selection only; checkout submission belongs to R2-02.

## Steps

- [x] 1. Modify `frontend/components/app/sales/product-picker.tsx` to load and map real tenant products.
  - Business intent: show the cashier current name, price, unit, and stock.
  - Code detail: add loading/error/empty states; search name/SKU/barcode; filter inactive/locked/recalled/out-of-stock rows before selection; preserve scan-sheet integration boundary.
  - _Requirements: 3.1, 3.2, 5.2_
- [x] 2. Add focused tests or testable pure helpers for result filtering and API error state.
  - Business intent: prevent unsellable products from entering the cart while keeping the screen understandable.
  - Code detail: cover search matching and exclusion of locked/recalled/out-of-stock rows.
  - _Requirements: 3.2, 7.2_

## Requirements

- 3.1, 3.2 — real tenant product loading and sellable filtering
- 5.2 — first result set without per-product requests
- 7.2 — data-load failure is visible without losing an existing cart

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/components/app/sales/product-picker.tsx` | Modify | Replace seed product source with tenant API data |
| `frontend/components/app/sales/scan-sheet.tsx` | Modify | Search the same tenant product collection for barcode entry |
| `frontend/lib/tenant-products-api.ts` | Read | Existing list/lookups/mapping contract |
| `frontend/lib/products.ts` | Modify | Shared product/stock display types include API status flags |
| `frontend/package.json` | Read | Vitest/build commands |

## Completion Criteria

- [ ] ProductPicker displays API-backed tenant products and supports name/SKU/barcode search.
- [ ] Locked, recalled, inactive, and out-of-stock products cannot be selected.
- [ ] Loading, empty, and API error states are explicit and do not replace the existing cart state.
- [ ] The picker remains reachable from `frontend/components/app/sales/quick-sale.tsx` and retains the mobile scan entrypoint.

## Evidence

- [ ] Automated verification
  - Command(s): `pnpm --dir frontend test` and `pnpm --dir frontend build`
  - Expected proof: picker tests/build pass with no seed-product runtime import.
- [ ] Artifact / runtime verification
  - Inspect: `frontend/components/app/sales/product-picker.tsx`
  - Expect: imports `tenant-products-api` and renders real API result fields.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `frontend/components/app/sales/quick-sale.tsx` → `ProductPicker`
  - Expect: `/ban-nhanh` mounts the API-backed picker.
- [ ] Contract / negative-path verification
  - Check: API failure and rows marked locked/recalled/out-of-stock.
  - Expect: error/empty message and disabled/excluded selection.

### Verification receipt — 2026-07-20

- `pnpm --dir frontend test` — PASS (5 files, 8 tests; includes product filtering and API client coverage).
- `pnpm --dir frontend build` — PASS outside sandbox (Next compiled, TypeScript passed, 42 static pages generated).
- Artifact proof: `ProductPicker` and `ScanSheet` consume `listTenantProducts()`/lookups; no seed product import remains in the runtime picker path.
- Reachability proof: `/ban-nhanh` → `QuickSale` → `ProductPicker` → tenant product API; barcode entry receives the same loaded product collection.
- Negative-path proof: tests cover locked, recalled, inactive, and out-of-stock exclusion; UI exposes API loading/error/retry states.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Product DTO fields differ from mock `Product` shape | Medium | Use existing `mapTenantProduct` and typecheck |
| API load delays first interaction | Medium | Explicit skeleton/loading state; one list + one lookups request |
