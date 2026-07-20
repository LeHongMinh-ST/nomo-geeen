# Task R3-01: Sales acceptance reachability

**Requirement:** R3 — end-to-end acceptance and runtime reachability
**Status:** done
**Priority:** P1
**Estimated Effort:** 3–4 hours
**Dependencies:** tasks/task-R1-01-quick-sale-api.md, tasks/task-R2-01-real-product-picker.md, tasks/task-R2-02-quick-sale-submit-flow.md
**Spec:** specs/tenant-sales-management/
**Contracts:** QuickSaleApi

## Context

- **Why**: Cross-layer work is incomplete unless the actual user route proves the backend and frontend outputs are connected.
- **Current state**: `/ban-nhanh` is mounted through `frontend/app/(app)/ban-nhanh/page.tsx`; backend and UI are currently mock/local at the sales boundary.
- **Target outcome**: Automated and runtime checks prove login-authenticated product selection → payment → persisted sale/stock/debt result.

## Constraints

- **MUST**: Verify the real runtime entrypoint and the canonical API contract, including negative paths.
- **SHOULD**: Reuse existing backend e2e setup and Playwright/browser workflow if the local environment is available.
- **MUST NOT**: Mark success from build-only evidence or expand into order list, returns, customer CRUD, or disease flow.
- **SCOPE**: Acceptance/reachability verification and only fixes required to connect scoped outputs.

## Steps

- [x] 1. Extend backend acceptance coverage in `backend/test/tenant-sales.e2e-spec.ts` for success, stock/debt effects, tenant isolation, permission denial, and idempotency.
  - _Requirements: 1.1, 2.2, 2.3, 2.4, 4.2, 4.3, 6.2, 7.1_
- [x] 2. Add frontend integration/runtime verification for `frontend/app/(app)/ban-nhanh/page.tsx` and its `QuickSale` path.
  - Business intent: prove the visible app route uses real products and server checkout.
  - Code detail: verify API-backed picker, successful cart reset, and failed-submit cart preservation at a mobile viewport.
  - _Requirements: 3.1, 3.2, 3.4, 3.5, 5.2, 7.2_
- [x] 3. Run scoped backend/frontend build and tests; record exact receipt in the spec report or task evidence.
  - _Requirements: 5.1, 6.1, 7.1_

## Requirements

- 1.1, 2.2, 2.3, 2.4 — completed sale and side effects
- 3.1, 3.2, 3.4, 3.5 — visible product/checkout behavior
- 4.2, 4.3 — isolation/idempotency
- 5.1, 5.2 — performance/product loading
- 6.1, 6.2 — security boundary
- 7.1, 7.2 — rollback and UI recovery

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/test/tenant-sales.e2e-spec.ts` | Modify | Backend acceptance and negative paths |
| `frontend/app/(app)/ban-nhanh/page.tsx` | Read | Runtime route entrypoint |
| `frontend/components/app/sales/quick-sale.tsx` | Read | User-facing flow under test |
| `frontend/components/app/sales/product-picker.tsx` | Read | Real product selection surface |
| `frontend/lib/tenant-sales-api.ts` | Read | API consumer contract |
| `frontend/package.json` | Read | Frontend test/build commands |
| `backend/package.json` | Read | Backend test/build commands |

## Completion Criteria

- [x] Backend acceptance test proves committed sale, stock movement, optional debt, rollback, tenant denial, and idempotent replay.
- [x] `/ban-nhanh` runtime check proves real product rows can be selected and successful checkout clears only after server success.
- [x] Failed checkout preserves cart and shows an actionable error at mobile viewport.
- [x] Scoped backend tests/build and frontend tests/build pass with no orphaned route/client/module.

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir backend test:e2e -- --runInBand tenant-sales.e2e-spec.ts`, `pnpm --dir backend build`, `pnpm --dir frontend test`, `pnpm --dir frontend build`
  - Expected proof: all commands exit 0 and acceptance suite covers positive/negative paths.
- [x] Artifact / runtime verification
  - Inspect: `/ban-nhanh` at mobile viewport and persisted `Sale`/`StockMovement`/`DebtLedger` rows.
  - Expect: route is reachable after auth; result and data side effects agree.
- [x] Runtime reachability verification
  - Entrypoint/caller: `frontend/app/(app)/ban-nhanh/page.tsx`
  - Expect: route mounts `QuickSale`, which invokes API-backed `ProductPicker` and `createQuickSale`.
- [x] Contract / negative-path verification
  - Check: another tenant product, insufficient stock, missing permission, failed network request, replayed key.
  - Expect: explicit denial/error, zero partial writes, preserved cart, or original result for safe replay.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Environment lacks database/browser fixtures | Medium | Record explicit blocker and keep automated contract tests as required evidence |
| E2E passes while route still uses mock data | High | Inspect imports and assert API request from `/ban-nhanh` runtime path |

### Verification receipt — 2026-07-20

- `tenant-sales.e2e-spec.ts` — PASS (4 tests): committed sale/stock movement, idempotent replay/conflict, customer debt balance/ledger, insufficient-stock rollback, and permission denial.
- `pnpm --dir backend build` — PASS.
- `pnpm --dir frontend lint` — PASS; `pnpm --dir frontend test` — PASS (5 files, 8 tests); `pnpm --dir frontend build` — PASS (42 routes including `/ban-nhanh`).
- Browser mobile reachability: `/ban-nhanh` is protected and redirects unauthenticated access to `/dang-nhap?next=%2Fban-nhanh`; route source mounts `QuickSale`, whose path is `ProductPicker` → `PaymentSheet` → `createQuickSale`.
- Negative-path artifact proof: failed API submission retains `lines` and idempotency key; pending state disables duplicate confirmation.
