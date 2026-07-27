# Requirements: Inventory Expiry Tenant-Wide Summary UI

The tenant already exposes `GET /tenant/inventory/expiry-summary` (see
`specs/core-stock-lifecycle/` follow-on commits `ecb38a3`/`a25ec33`) returning
tier counts across every batch/item for the tenant. The inventory list screen
(`frontend/components/app/inventory/inventory-list.tsx`) previously derived its
"Còn dưới 30 ngày" and "Đã hết hạn" alert tiles from `items`, the array holding
only the current page (20 rows). This undercounts whenever more than one page
of stock exists. This spec closes that gap by wiring the existing tenant-wide
summary endpoint into those two tiles, with its own loading/error/retry states
independent of the paginated list fetch.

## R1 — Tenant-wide tile counts

- **R1.1** When the inventory list mounts, it shall call
  `getTenantInventoryExpirySummary()` (`frontend/lib/tenant-inventory-api.ts`)
  once, independent of the paginated `listTenantInventory` call.
- **R1.2** The "Còn dưới 30 ngày" tile shall render
  `summary.items.byTier.CRITICAL` and the "Đã hết hạn" tile shall render
  `summary.items.byTier.EXPIRED`, not a count derived from the current page's
  `items` array.
- **R1.3** Clicking either tile shall keep the existing behavior of setting the
  page-local expiry filter (`expiry` state) to the matching tier; the filter
  still only affects the rows shown from the current page fetch. This spec does
  not change filtering behavior, only tile counts.

## R2 — Loading and error handling for the summary

- **R2.1** While the summary request is pending, both tiles shall show a
  loading placeholder (skeleton) instead of a stale or zero count, and shall
  not block the rest of the page (search, stock tiles, list) from rendering.
- **R2.2** If the summary request fails, both tiles shall be replaced by a
  single inline error message (Vietnamese, safe fallback copy) with a "Thử
  lại" (retry) action that re-issues the request.
- **R2.3** A summary failure shall not affect the paginated list fetch or its
  own independent loading/error state; the two requests fail independently.

## R3 — Verification

- **R3.1** Component tests shall cover: tenant-wide counts differing from the
  current page's local counts, the loading placeholder, and the error/retry
  path.
- **R3.2** `pnpm --dir frontend test` shall pass for the affected suite.

## Out of scope

- Backend changes to `GET /tenant/inventory/expiry-summary` (already shipped).
- Changing the "Sắp hết"/"Hết hàng" stock tiles (unaffected, remain page-local
  by design since stock qty is per-row, not tenant-aggregated here).
- Server-side filtering/pagination changes to `listTenantInventory`.
