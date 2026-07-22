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

## R7-01 verification checkpoint

- Loaded `backend/.env` and applied pending local migrations `20260722102000_debt_idempotency` and `20260722104500_sales_order_lifecycle`.
- `pnpm test:e2e -- tenant-sales.e2e-spec.ts --runInBand` — pass (1 suite, 4 tests).
- Backend sales unit suites — pass (2 suites, 70 tests); backend build — pass.
- Frontend sales/API suites — pass (14 files, 43 tests); frontend build — pass.
- Fixed an unstable debounce test wait and added explicit `type="button"` to sales detail actions; targeted lint passes.
- R7 final acceptance passed: backend tenant-sales E2E 11/11, frontend acceptance/sales suites 15 files / 51 tests, benchmark p95 14.10ms for 30 warm requests over 1,000 orders, same-tenant wrong-channel 404, insufficient-stock order rollback, list/create/detail route reachability, desktop pagination, mobile sentinel, and 390/768/1280 viewport checks; backend/frontend builds, targeted lint, and diff check passed.
- Query-plan receipt: read-only `EXPLAIN (FORMAT JSON)` for the tenant/channel/order-by list shape returned a bounded `Limit` plan; PostgreSQL chose `Seq Scan` only because the local fixture is tiny.
