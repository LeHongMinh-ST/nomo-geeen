# Task R0-01: Tenant user API contract

**Requirement:** R1, R2, R3, R5
**Status:** done
**Priority:** P0
**Estimated Effort:** M
**Dependencies:** none
**Spec:** specs/tenant-user-management/

## Context

The existing tenant-user service and controller are platform-admin-only. The user app needs a separate tenant-authenticated contract without changing the admin API.

## Constraints

- **MUST:** derive tenantId and actor from the verified tenant JWT.
- **MUST:** keep `/admin/tenants/:tenantId/users` and admin guards backward-compatible.
- **MUST NOT:** accept tenantId from the user client or expose secrets.

## Steps

- [x] Add tenant-user controller routes under `/tenant/users` with tenant access and permission guards.
- [x] Generalize service/audit context only where required for USER actor metadata.
- [x] Add controller/unit coverage for tenant versus admin token boundaries.

## Requirements

- R1.1–R1.4 — tenant-scoped public list contract.
- R2.1–R2.5 — tenant-scoped mutation contract.
- R5.1 — audit context contract.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/tenant-users/tenant-users.controller.ts` | Modify | Add tenant route boundary without removing admin routes |
| `backend/src/platform/tenant-users/tenant-users.service.ts` | Modify | Support tenant actor context |
| `backend/src/platform/tenant-users/tenant-users.module.ts` | Modify | Register required guards/providers |
| `backend/src/platform/tenant-users/*spec.ts` | Modify/Create | Contract and guard tests |

## Completion Criteria

- [x] `/tenant/users` routes derive tenantId/actor from tenant JWT.
- [x] Admin endpoint behavior and guards remain unchanged.
- [x] User responses exclude passwordHash and plaintext secrets.

## Evidence

- [x] `pnpm --dir backend exec jest --runInBand src/platform/tenant-users` — PASS, 18 tests.
- [x] `pnpm --dir backend build` — PASS.
- [x] Controller boundary is mounted separately; negative integration proof remains in R1/R3 acceptance.

## Runtime Reachability Verification

- [x] Entrypoint: `AppModule` → `TenantUsersModule` → `/tenant/users` controller → tenant guards → service.

## Verification Receipt

- 2026-07-20: `pnpm exec prisma generate` PASS after additive audit enum update.
- 2026-07-20: backend build PASS.
- 2026-07-20: tenant-users unit suite PASS — 1 suite / 18 tests.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Admin/user auth contexts mixed | Critical | Separate controllers, guards, and explicit realm tests |

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Admin/user auth contexts mixed | Critical | Separate controllers, guards, and explicit realm tests |
