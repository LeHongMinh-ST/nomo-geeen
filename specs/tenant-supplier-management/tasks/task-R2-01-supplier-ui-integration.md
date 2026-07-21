# Task R2-01: Supplier UI integration

**Requirement:** R7 — Frontend `/nha-cung-cap` wired to the tenant supplier API
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** R1-01
**Spec:** specs/tenant-supplier-management/

## Context

- **Why**: The `/nha-cung-cap` list/detail/form/delete screens still render `frontend/lib/suppliers.ts` seed data and `frontend/lib/debts.ts` mock payable, so store users cannot manage real suppliers.
- **Current state**: `frontend/lib/tenant-suppliers-api.ts` client exists but is only consumed by `purchase/supplier-picker.tsx`; the four screens and the `nha-cung-cap/[id]` + `[id]/sua` pages import seed/mock modules.
- **Target outcome**: All supplier screens fetch and mutate through the tenant API with loading/empty/error/pagination states, read-only payable balance, and preserved-on-error forms; no `@/lib/suppliers` or `@/lib/debts` import remains in the supplier surface.

## Constraints

- **MUST**: Use `frontend/lib/tenant-suppliers-api.ts` (`userFetch`) for all data; follow `DESIGN.md`; surface 422 (`VALIDATION_ERROR`) and 409 (`DUPLICATE_SUPPLIER_CODE`) inline and preserve form input on error; show payable from numeric `balance` only.
- **SHOULD**: Reuse existing components and states; add `getTenantSupplier(id)` to the client if detail/edit need it.
- **MUST NOT**: Import `@/lib/suppliers` or `@/lib/debts` in the supplier surface; write/derive balance client-side; break `purchase/supplier-picker.tsx`.
- **SCOPE**: Implement only R7 (and R4 read-only payable in UI) and the approved `scope_lock`; no purchase-history/debt-voucher features.

## Steps

- [x] 1. Wire the supplier list to the API
  - Business intent: store users see real tenant suppliers with search and pagination.
  - Code detail: `frontend/components/app/supplier/supplier-list.tsx` — replace seed with `listTenantSuppliers` (search/page/pageSize), add loading/empty/error states, real soft-delete via `deleteTenantSupplier` with confirm + list refresh; `supplier-card.tsx` consumes the API `TenantSupplier` type and maps the type label.
  - _Requirements: 7.1, 7.2_

- [x] 2. Wire supplier detail, create, and update
  - Business intent: users view a supplier and create/edit it against the API.
  - Code detail: `supplier-detail.tsx` fetches by id (add `getTenantSupplier` if missing), shows read-only payable from numeric `balance`, edit/soft-delete actions; `supplier-form.tsx` submits `createTenantSupplier`/`updateTenantSupplier`, disables duplicate submit, preserves input and surfaces 422/409 inline; update `nha-cung-cap/[id]/page.tsx` and `[id]/sua/page.tsx` off the seed.
  - _Requirements: 7.3, 4.3_

- [x] 3. Remove seed/mock imports and add client tests
  - Business intent: guarantee no mock data path survives and the client contract is covered.
  - Code detail: delete `@/lib/suppliers` and `@/lib/debts` imports from the supplier surface; add `frontend/lib/tenant-suppliers-api.test.ts` asserting request URL/method/body, list mapping, and error propagation.
  - _Requirements: 7.4, 8.2_

## Requirements

- 7.1 — List/search/pagination render from `listTenantSuppliers` with loading/empty/error states.
- 7.2 — Soft delete from the UI calls the API and refreshes the list.
- 7.3 — Create/update submit through the client and preserve input while surfacing 422/409.
- 7.4 — No `@/lib/suppliers` or `@/lib/debts` import remains in the supplier surface.
- 4.3 — Payable balance is displayed read-only from the API numeric value.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/tenant-suppliers-api.ts` | Modify | Add `getTenantSupplier(id)` if detail/edit require it |
| `frontend/components/app/supplier/supplier-list.tsx` | Modify | API-backed list/search/pagination/delete |
| `frontend/components/app/supplier/supplier-detail.tsx` | Modify | API-backed detail + read-only payable |
| `frontend/components/app/supplier/supplier-form.tsx` | Modify | API create/update with error preservation |
| `frontend/components/app/supplier/supplier-card.tsx` | Modify | Consume API type + type label |
| `frontend/app/(app)/nha-cung-cap/[id]/page.tsx` | Modify | Fetch detail from API |
| `frontend/app/(app)/nha-cung-cap/[id]/sua/page.tsx` | Modify | Edit via API |
| `frontend/lib/tenant-suppliers-api.test.ts` | Create | Client contract tests |

## Completion Criteria

- [x] `/nha-cung-cap` list/detail/form/delete run fully on the tenant API with loading/empty/error/pagination states.
- [x] Create/update preserve input and surface 409/422 inline; payable is read-only from the API number.
- [x] No `@/lib/suppliers` or `@/lib/debts` import remains in the supplier surface (diff-verified).
- [x] `purchase/supplier-picker.tsx` still works and the frontend builds/lints clean.

## Evidence

This section is both the task-level test plan and the proof checklist. Keep it short, exact, and executable.
Select the proof by task risk; do not run every test type for every task.

- Logic/data/validator task: include unit tests.
- Stateful UI/component task: include component or integration tests.
- Cross-module/API/state flow task: include integration tests.
- User-facing end-to-end workflow: include E2E/UI flow verification.
- Layout/theme/responsive task: include visual/runtime viewport checks.
- Interactive UI task: include accessibility checks when keyboard, focus, labels, or ARIA can regress.
- Scaffold/release task: include smoke build/test/dev-server checks.
- Performance/security checks are required only when the requirement, risk, or touched surface calls for them.

- [x] Automated verification (client + build)
  - Command(s): `cd frontend && pnpm exec vitest run lib/tenant-suppliers-api.test.ts`; `cd frontend && pnpm lint`; `cd frontend && pnpm exec next build --webpack`
  - Receipt: client PASS — 1 file, 2 tests; lint PASS; webpack build PASS with TypeScript and 42 routes. Turbopack default build hit an environment process-bind panic; webpack fallback passed.
- [x] Artifact / runtime verification
  - Inspect: `frontend/app/(app)/nha-cung-cap/page.tsx` and child components rendered in the running app
  - Expect: list/detail/form show API data with loading/empty/error/pagination and read-only payable.
- [x] Runtime reachability verification
  - Entrypoint/caller: `frontend/app/(app)/nha-cung-cap/*` route files import the migrated components
  - Expect: components call `tenant-suppliers-api` functions; `supplier-picker.tsx` still imports the client unchanged.
- [x] Contract / negative-path verification
  - Check: `grep -R "@/lib/suppliers\|@/lib/debts" frontend/app/(app)/nha-cung-cap frontend/components` supplier surface; duplicate code and empty code/name submit.
  - Expect: no seed/mock import remains; 409/422 shown inline with input preserved.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Payable/type shape mismatch between seed and API (`SupplierType` string vs enum) | Medium | Map display labels ↔ free-form string at the client boundary per `design.md` |
| Regressing `purchase/supplier-picker.tsx` while editing shared client | Medium | Only add `getTenantSupplier`; keep existing exports/signatures stable; build after change |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
