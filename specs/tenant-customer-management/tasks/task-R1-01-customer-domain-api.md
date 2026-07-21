# Task R1-01: Customer domain api

**Requirement:** R1 — Tenant customer records, lookup, CRUD, soft delete, and read-only balance
**Status:** done
**Priority:** P1
**Estimated Effort:** 4–6 hours
**Dependencies:** none
**Spec:** specs/tenant-customer-management/

## Context

- **Why**: `/khach-hang` runs on `frontend/lib/customers.ts` seed data; there is no tenant customer API. The directory must be durable and tenant-isolated so store users can find customers by name/phone and see debt status.
- **Current state**: Prisma `Customer` model, `CustomerType` enum, and `customer:*` permissions already exist. No `customers` backend module is present. `SuppliersModule` is the closest precedent, but Customer has no `status` column, an optional `code`, and a required `name`.
- **Target outcome**: Guarded `/tenant/customers` routes (list/detail/create/update/soft-delete) return tenant-scoped customers with read-only balance; write ops validate `name` and reject cross-tenant/invalid input.

## Constraints

- **MUST**: Derive `tenantId`/`userId` only from the tenant access token; scope every query with `tenantId` and `deletedAt: null`; treat `balance`/`openingBalance` as read-only (never written by this module).
- **SHOULD**: Reuse the NestJS/Prisma suppliers controller-service split, DTO/class-validator patterns, bounded pagination (pageSize min 1 max 20), and BigInt→Number serialization in `toResponse`.
- **MUST NOT**: Read or write a customer `status` column (it does not exist); force or de-duplicate `code`; add `@RequireFeature`; mutate balance/debt or add out-of-scope transaction history.
- **SCOPE**: Implement only the behavior mapped to R1–R5, R7–R9 and the approved `scope_lock`; do not leave scoped acceptance criteria unwired.

## Steps

- [x] 1. Create `CustomersModule`, `CustomersController` (`@Controller('tenant/customers')` with `TenantAccessTokenGuard` + `TenantPermissionGuard`), `CustomersService`, and `dto/customer.dto.ts`; register the module in `backend/src/app.module.ts`.
  - Business intent: A store user reaches a real customer API instead of seed data.
  - Code detail: GET `/` `customer:view` (list+search+pagination), GET `/:id` `customer:view` (detail), POST `/` `customer:create`, PATCH `/:id` `customer:edit`, DELETE `/:id` `customer:delete`. No `@RequireFeature`. Service `list` where `{tenantId, deletedAt:null}`, `OR` on name/phone/code `contains` insensitive, `orderBy [{name:'asc'},{id:'asc'}]`, `page=max(1,page)`, `pageSize=min(20,max(1,pageSize))`. `findById`/`update`/`remove` use `findFirst({where:{id,tenantId,deletedAt:null}})` or `NotFoundException`. `remove` sets `deletedAt:new Date()`. `toResponse` maps id/code/name/phone/address/type/`balance:Number`/`openingBalance:Number`/createdAt/updatedAt.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 8.1, 8.3_
- [x] 2. Implement create/update validation and DTOs: `CustomerQueryDto` (search?, page, pageSize), `CreateCustomerDto` (`name` required non-empty; `phone?`/`code?`/`address?`/`note?`; `type?` `@IsEnum`), `UpdateCustomerDto` (all optional, `name` non-empty when present), `CustomerTypeInput` enum = RETAIL/FARMER/FARM/AGENT. Reject empty name with `UnprocessableEntityException` `VALIDATION_ERROR`; ignore client-supplied balance/openingBalance/tenantId/deletedAt; default balance to schema 0 on create.
  - Business intent: The directory stays clean (name required, phone as identifier) and finance data cannot be spoofed.
  - Code detail: Persist only submitted contact fields on update; never write balance/openingBalance/status. Optionally populate `nameSearch` on write for accent-insensitive search (additive, non-contract).
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 8.2_
- [x] 3. Verification implementation
  - Add `customers.service.spec.ts` / `customers.controller.spec.ts` (validation, enum rejection, pagination bounds/order, balance serialization, soft delete) and `backend/test/tenant-customers.e2e-spec.ts` (create→list/search→detail→update→soft delete; cross-tenant 404; permission denial; deleted excluded; client balance ignored).
  - _Requirements: 9.1_

## Requirements

- 1.1, 1.2, 1.3, 1.4 — tenant-scoped list/detail, response fields, deterministic order
- 2.1, 2.2, 2.3, 2.4, 2.5 — create/update validation, type enum, optional code
- 3.1, 3.2, 3.3 — soft delete + retention + not-found
- 4.1, 4.2 — read-only balance projection
- 5.1, 5.2, 5.3, 5.4 — token-derived tenant, permissions, no feature gate
- 7.1, 7.2 — bounded pagination, index-aligned search
- 8.1, 8.2, 8.3 — tenant scope, reject client balance, non-revealing errors
- 9.1 — backend unit/controller/E2E coverage

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/customers/customers.module.ts` | Create | Customer module (imports AuthModule, PrismaModule) |
| `backend/src/platform/customers/customers.controller.ts` | Create | Guarded `/tenant/customers` routes |
| `backend/src/platform/customers/customers.service.ts` | Create | Tenant-scoped CRUD/search + read-only balance |
| `backend/src/platform/customers/dto/customer.dto.ts` | Create | Query/Create/Update DTOs + CustomerTypeInput enum |
| `backend/src/platform/customers/customers.service.spec.ts` | Create | Unit tests |
| `backend/src/platform/customers/customers.controller.spec.ts` | Create | Controller tests |
| `backend/test/tenant-customers.e2e-spec.ts` | Create | Isolation/lifecycle/permission E2E |
| `backend/src/app.module.ts` | Modify | Register CustomersModule |

## Completion Criteria

- [x] List/search returns active (`deletedAt: null`) tenant customers with bounded pagination and stable order.
- [x] Create/update requires non-empty name, accepts only valid `CustomerType`, keeps `code` optional, and never writes balance.
- [x] Delete is soft; deleted customers are excluded from reads; historical sales/debt references remain intact.
- [x] Reads require `customer:view`; writes require the matching `customer:*` permission; no `@RequireFeature`; cross-tenant requests return the not-found contract without leaking existence.

## Evidence

This section is both the task-level test plan and the proof checklist. Keep it short, exact, and executable.
Select the proof by task risk; do not run every test type for every task.

**Verification receipt:** PASS. `pnpm --dir backend test -- --runInBand customers` → 2 suites, 4 tests passed. `pnpm --dir backend test:e2e -- --runInBand tenant-customers.e2e-spec.ts` → 1 suite, 1 test passed outside sandbox; runtime CRUD, search, update, soft delete, tenant isolation, permission denial, and balance protection were exercised. `prisma migrate status` showed no failed migration. Runtime reachability confirmed through `backend/src/app.module.ts`.

- Logic/data/validator task: include unit tests.
- Stateful UI/component task: include component or integration tests.
- Cross-module/API/state flow task: include integration tests.
- User-facing end-to-end workflow: include E2E/UI flow verification.
- Layout/theme/responsive task: include visual/runtime viewport checks.
- Interactive UI task: include accessibility checks when keyboard, focus, labels, or ARIA can regress.
- Scaffold/release task: include smoke build/test/dev-server checks.
- Performance/security checks are required only when the requirement, risk, or touched surface calls for them.

- [x] Automated verification (unit/component/integration/E2E as applicable)
  - Command(s):
    ```bash
    pnpm --dir backend test -- --runInBand customers
    pnpm --dir backend test:e2e -- --runInBand tenant-customers.e2e-spec.ts
    ```
  - Expected proof: Both suites exit 0 with >0 passing tests covering validation, enum rejection, pagination bounds/order, balance serialization, and soft delete.
- [x] Artifact / runtime verification
  - Inspect: `GET /tenant/customers` and `GET /tenant/customers/:id` responses (via E2E)
  - Expect: Payload includes `id, code, name, phone, address, type, balance, openingBalance` with `balance` as Number; deleted records absent from list.
- [x] Runtime reachability verification
  - Entrypoint/caller: `backend/src/app.module.ts`
  - Expect: `CustomersModule` is imported and registered so `/tenant/customers` routes are mounted by the Nest bootstrap.
- [x] Contract / negative-path verification
  - Check: cross-tenant `GET/PATCH/DELETE :id`, missing `customer:*` permission, empty `name`, client-supplied `balance`
  - Expect: cross-tenant → not-found contract (no existence leak); missing permission → 403; empty name → `UnprocessableEntityException` `VALIDATION_ERROR`; client balance ignored (persisted balance unchanged).

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Assuming a `status` column exists (copied from suppliers) → Prisma runtime error | High | Filter active by `deletedAt: null` only; never reference `status` in where/select/writes. |
| Forcing/uniquing `code` breaks optional-code customers → create failures | Medium | Keep `code` optional and non-unique; do not add conflict handling around it. |
| Write path mutating `balance`/`openingBalance` corrupts finance data | High | Whitelist contact fields only; ignore client balance; assert balance unchanged in tests. |
| Cross-tenant read/write leaking another tenant's data | High | Scope every query by token-derived `tenantId`; use `findFirst` with `tenantId` + `deletedAt: null`; return not-found contract. |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
