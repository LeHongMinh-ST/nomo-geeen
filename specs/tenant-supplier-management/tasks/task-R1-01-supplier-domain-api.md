# Task R1-01: Supplier domain API hardening

**Requirement:** R1 — Tenant-scoped supplier CRUD, search, read-only payable balance, soft delete
**Status:** pending
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** none
**Spec:** specs/tenant-supplier-management/

## Context

- **Why**: The `/nha-cung-cap` store surface must run on a real tenant-scoped API. The backend `SuppliersController`/`SuppliersService` already implement CRUD, but coverage and the named contract must reach the customer-module bar before the frontend is wired to it.
- **Current state**: `backend/src/platform/suppliers/{suppliers.controller.ts, suppliers.service.ts, dto/supplier.dto.ts, suppliers.module.ts}` exist and are registered; `supplier:*` permissions and the `inventory` feature are seeded. E2E coverage is partial vs the customer module.
- **Target outcome**: Supplier CRUD/search/soft-delete is provably tenant-isolated, validated, duplicate-code safe, and serializes read-only payable balance as a JSON number — all covered by unit + E2E tests.

## Constraints

- **MUST**: Keep the canonical contract from `design.md` — active filter `deletedAt IS NULL AND status='ACTIVE'`; `code`+`name` both required; duplicate code → `409 DUPLICATE_SUPPLIER_CODE`; balance read-only; soft delete sets `deletedAt=now` + `status='INACTIVE'`; `inventory` feature gate on writes only.
- **SHOULD**: Extend existing tests rather than rewrite the service; only change service behavior where a real gap vs the contract is found.
- **MUST NOT**: Write `Supplier.balance`, add a `SupplierType` DB enum, introduce a schema migration, or trust body-supplied `tenantId`/`deletedAt`/`balance`.
- **SCOPE**: Implement only R1–R6/R8 backend behavior and the approved `scope_lock`; no purchase/debt/payables features.

## Steps

- [ ] 1. Audit service/controller/DTO against the canonical contract
  - Business intent: guarantee tenant isolation, validation, and authorization match `design.md` before the UI depends on them.
  - Code detail: verify `list` filter/search/order/pagination bounds (`pageSize = min(20, max(1,...))`), `findById` tenant+non-deleted 404, `create`/`update` require non-empty `code`+`name`, P2002 → `ConflictException('DUPLICATE_SUPPLIER_CODE')`, `remove` soft-delete transition, `toResponse` `balance: Number(...)`, controller decorators (`supplier:view` reads; `supplier:create/edit/delete` + `@RequireFeature('inventory')` writes). Fix only real deviations.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 3.1, 3.2, 5.1, 5.3, 6.1_

- [ ] 2. Complete unit coverage for the service
  - Business intent: lock the validation, conflict, serialization, and pagination invariants.
  - Code detail: `backend/src/platform/suppliers/suppliers.service.spec.ts` — DTO normalization (trim, empty→null), missing `code`/`name` → `UnprocessableEntityException VALIDATION_ERROR`, duplicate code → `409`, `toResponse` balance number, list ordering `[name asc, id asc]` and pageSize clamping, soft-delete sets `deletedAt`+`status='INACTIVE'`.
  - _Requirements: 3.1, 3.3, 3.4, 4.1, 5.1_

- [ ] 3. Complete E2E coverage for the tenant contract
  - Business intent: prove the guarded HTTP surface end to end.
  - Code detail: `backend/test/tenant-suppliers.e2e-spec.ts` — create → list/search → detail → update → soft delete; cross-tenant id → 404; missing `supplier:*` → 403; write without `inventory` → 403; deleted supplier excluded from reads; client-supplied `balance` ignored.
  - _Requirements: 2.1, 4.2, 5.2, 6.1, 6.2, 6.3_

## Requirements

- 1.1 — List returns only tenant-scoped active suppliers with search/pagination/ordering.
- 3.1 — Create/update require non-empty `code` and `name`.
- 3.2 — Duplicate `code` per tenant returns `409 DUPLICATE_SUPPLIER_CODE`.
- 4.1 — `balance` is server-derived, read-only, serialized as a JSON number.
- 5.1 — Delete is soft (`deletedAt=now`, `status='INACTIVE'`), preserving history.
- 6.1 — Reads require `supplier:view`; writes require `supplier:create/edit/delete` + `inventory`.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/suppliers/suppliers.service.ts` | Modify | Fix only real deviations from the canonical contract |
| `backend/src/platform/suppliers/suppliers.controller.ts` | Modify | Confirm permission/feature decorators per contract |
| `backend/src/platform/suppliers/dto/supplier.dto.ts` | Modify | Confirm validation rules (code+name required, email, status enum) |
| `backend/src/platform/suppliers/suppliers.service.spec.ts` | Modify | Unit coverage for validation/conflict/serialization/pagination/soft-delete |
| `backend/test/tenant-suppliers.e2e-spec.ts` | Modify | E2E for isolation, permissions, feature gate, soft delete |

## Completion Criteria

- [ ] Supplier CRUD/search/soft-delete matches the `design.md` canonical contract with no body-derived tenant trust.
- [ ] Duplicate `code` returns `409 DUPLICATE_SUPPLIER_CODE`; missing `code`/`name` returns `422 VALIDATION_ERROR`.
- [ ] `balance` is never written by this module and serializes as a JSON number.
- [ ] Cross-tenant access returns 404 and unauthorized/feature-gated writes return 403, proven by passing tests.

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

- [ ] Automated verification (unit + E2E)
  - Command(s): `cd backend && npx jest suppliers.service.spec` and `cd backend && npx jest tenant-suppliers.e2e`
  - Expected proof: both suites PASS with non-zero test counts; no skipped contract cases.
- [ ] Artifact / runtime verification
  - Inspect: `backend/src/platform/suppliers/suppliers.service.ts` list/toResponse and `backend/test/tenant-suppliers.e2e-spec.ts`
  - Expect: active filter includes `deletedAt: null` + `status: 'ACTIVE'`; `balance: Number(...)`; E2E asserts soft-delete exclusion.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `backend/src/platform/suppliers/suppliers.module.ts` registered in the platform module graph
  - Expect: `/tenant/suppliers` routes are mounted and reached by the E2E client.
- [ ] Contract / negative-path verification
  - Check: cross-tenant id, missing `supplier:*`, write without `inventory`, duplicate code, empty code/name, client-supplied balance.
  - Expect: 404 / 403 / 403 / 409 / 422 / balance ignored respectively.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Prisma P3009 migration state blocks E2E (shared with customer spec) | High | Attempt repair; if unrepairable record an explicit environment blocker with the failing command output |
| Hidden deviation from customer-module conventions | Medium | Audit step 1 diffs service against `design.md` contract before adding tests |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
