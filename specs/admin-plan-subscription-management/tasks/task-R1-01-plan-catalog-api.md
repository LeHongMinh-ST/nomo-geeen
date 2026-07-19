# Task R1-01: Plan catalog API

**Requirement:** R1 — plan catalog management
**Status:** done
**Priority:** P1
**Estimated Effort:** L
**Dependencies:** task-R0-01-schema-seed-audit-foundation.md
**Spec:** specs/admin-plan-subscription-management/

## Context

Build the permissioned NestJS admin plan catalog using existing platform module, DTO, guard, Prisma, and audit patterns. The catalog must manage feature membership and quotas without destroying existing subscriptions.

## Constraints

- **MUST** use `AccessTokenGuard`, `PermissionGuard`, and exact `BillingPermissions`.
- **MUST** use `AuditLogger.run` for create/update/activation mutations and optimistic `expectedUpdatedAt` for edits; feature/quota edits take effect immediately for existing subscribers and audit before/after snapshots.
- **SHOULD** cap pagination at 100 and order `createdAt DESC, id DESC`.
- **MUST NOT** allow plan code changes or assignment of inactive plans.
- **SCOPE** API/service/DTO/module only; UI is R2-01.

## Steps

- [x] 1. Create `backend/src/platform/billing/{billing.module,billing.controller,billing.service}.ts` and plan DTOs with GET/POST/PATCH/activation endpoints from `design.md`.
  - Validate code, price, cycle, quotas, feature IDs/codes, UUIDs, and stale timestamps; map missing rows to 404 and conflict to 409.
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 9.1, 9.2_
- [x] 2. Register `BillingModule` in `backend/src/app.module.ts`; return a stable plan response with feature codes and quota values.
  - _Requirements: 1.3, 1.4_
- [x] 3. Add `backend/src/platform/billing/billing.service.spec.ts` for valid CRUD, invalid quota/code, inactive-plan behavior, and audit atomicity.
  - _Requirements: 1.3, 1.5, 4.1, 4.2_

## Requirements

- 1.1–1.5 — plan creation, edit, activation, listing, validation
- 4.1, 4.2 — audit rows and transaction atomicity
- 9.1, 9.2 — guarded API and validation

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/billing/billing.module.ts` | Create | Nest billing boundary |
| `backend/src/platform/billing/billing.controller.ts` | Create | Guarded plan routes |
| `backend/src/platform/billing/billing.service.ts` | Create | Plan mutations/read model |
| `backend/src/platform/billing/dto/create-plan.dto.ts` | Create | Create validation |
| `backend/src/platform/billing/dto/update-plan.dto.ts` | Create | Edit/activation validation |
| `backend/src/platform/billing/billing.service.spec.ts` | Create | Service tests |
| `backend/src/app.module.ts` | Modify | Register BillingModule |
| `backend/src/platform/audit/audit-logger.service.ts` | Read | Transactional audit API |

## Completion Criteria

- [x] All plan routes match the method/path/permission table and return validated feature/quota data.
- [x] Inactive plans cannot be assigned by later subscription service; edits are atomic and stale edits are 409.
- [x] Every successful mutation emits the correct audit action in the same transaction.
- [x] Service tests cover invalid input and no-partial-write behavior.

## Evidence

- [x] Automated verification
  - Command(s): `cd backend && pnpm test -- --runInBand billing.service.spec.ts && pnpm build`
  - Receipt: `pnpm prisma:generate` PASS; `pnpm build` PASS; `billing.service.spec.ts` PASS (5 tests); full backend suite PASS (16 suites, 125 tests); targeted Biome PASS.
- [x] Artifact / runtime verification
  - Inspect: `backend/src/app.module.ts` and `billing.controller.ts` decorators.
  - Expect: module is reachable and each route has auth + exact permission metadata.
  - Receipt: `BillingModule` registered in `AppModule`; `/admin/plans`, `/admin/plans/:id`, and `/admin/plans/:id/activation` are guarded with `AccessTokenGuard`, `PermissionGuard`, and canonical `admin.plan:*` metadata.
- [x] Runtime reachability verification
  - Entrypoint/caller: Nest HTTP routes `/admin/plans*`.
  - Expect: request reaches `BillingService` only after both guards.
  - Receipt: controller routes reach service; later subscription assignment consumes `isActive` catalog state.
- [x] Contract / negative-path verification
  - Check: unauthorized admin, inactive plan activation/assignment race, invalid numeric/date data.
  - Expect: 401/403/400/409 with no state/audit drift.
  - Receipt: DTO boundary validation, stale `expectedUpdatedAt` 409, unknown feature rejection, and transactional audit before/after snapshots covered; no payment integration added.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Plan edit changes active subscriber semantics | High | Keep plan ID/code stable; subscription history remains row-based |
| Missing permission decorator | Critical | Controller matrix test inspects route metadata |
