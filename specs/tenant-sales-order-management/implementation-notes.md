# Implementation notes

## R4-01

- Added the typed `SALES_ORDER_API_V1` client and explicit JSON-safe order DTOs in `frontend/lib/tenant-sales-api.ts`; quick-sale remains unchanged, including its `TRANSFER` wire value.
- `CustomerPicker` now uses `tenant-customers-api`, debounces search (350ms), ignores stale generations, supports keyboard selection/Escape/focus restoration, and renders loading/empty/error/retry states in the existing mobile bottom sheet.
- Codebase-reality decision: `frontend/lib/orders.ts` seed exports and `getOrder` remain for current R5/R6 route callers. R4 removes new production dependency from `CustomerPicker` and does not migrate orchestration ahead of those tasks.

## Verification

- `pnpm --dir frontend test -- tenant-sales-api.test.ts customer-picker.test.tsx` — pass (10 files, 27 tests).
- `pnpm --dir frontend build` — pass.
- `pnpm --dir frontend lint` — existing unrelated warning in `components/admin/permission-group-card.tsx`; R4 picker dependency lint fixed.

## Deferred

- Order route/list/detail/form orchestration remains scoped to R5/R6.
