# Task R1-01: Tenant user API and seat enforcement

**Requirement:** R1, R2, R3, R5
**Status:** done
**Priority:** P0
**Estimated Effort:** L
**Dependencies:** tasks/task-R0-01-tenant-user-api-contract.md
**Spec:** specs/tenant-user-management/

## Context

The service already has serializable seat checks and lifecycle invariants for the admin portal. This task makes those invariants available to tenant Owner/Manager users with server-side role boundaries.

## Constraints

- **MUST:** reuse `effectiveMaxUsers = activePlan.maxUsers + tenant.seatBonus`.
- **MUST:** check create/reactivate quota inside serializable transactions.
- **MUST:** protect the last active OWNER and reject cross-tenant targets.
- **MUST NOT:** let tenant users mutate plans or seatBonus.

## Steps

- [ ] Implement tenant-scoped list/create/edit/role/deactivate/reactivate/reset operations.
- [ ] Enforce Owner/Manager/Staff action matrix from design.md using current DB role state.
- [ ] Record USER audit context and map stable errors `SEAT_LIMIT_REACHED`, `LAST_OWNER`, `USER_NOT_FOUND`, and username conflicts.
- [ ] Add unit and Postgres/Redis integration coverage, including concurrent quota attempts where the harness supports it.

## Requirements

- R1 — list and seat visibility.
- R2 — create/edit and quota.
- R3 — role/lifecycle/reset boundaries.
- R5 — audit and verification.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/tenant-users/tenant-users.service.ts` | Modify | Tenant actor/role/seat lifecycle |
| `backend/src/platform/tenant-users/dto/*` | Read/Modify | Request validation |
| `backend/src/platform/auth/guards/tenant-permission.guard.ts` | Read/Modify | Live permission enforcement |
| `backend/src/platform/audit/*` | Modify/Test | USER audit metadata |
| `backend/prisma/schema.prisma` and `backend/prisma/migrations/*` | Modify/Create | Additive USER lifecycle audit actions if missing |
| `backend/test/tenant-auth.e2e-spec.ts` | Modify | Real tenant lifecycle coverage |

## Completion Criteria

- [x] All `/tenant/users` operations are tenant-isolated and role-protected.
- [x] Seat exhaustion blocks create/reactivate atomically.
- [x] Last-owner and Manager-owner protections pass.
- [x] Reset password hashes the secret, forces change, and only returns generated plaintext once.
- [x] Audit payloads contain no credential material.
- [x] Required USER lifecycle audit actions exist through an additive migration and do not alter admin action semantics.

## Evidence

- [x] `pnpm --dir backend exec jest --runInBand src/platform/tenant-users` — PASS, 18 tests.
- [x] `pnpm --dir backend test:e2e --runInBand tenant-auth` — PASS, 1 suite / 2 tests; includes tenant CRUD/lifecycle/audit and Manager→Owner denial.
- [x] `pnpm --dir backend build` — PASS.

## Verification Receipt

- 2026-07-20: additive Prisma migration `20260720000100_tenant_user_lifecycle_audit_actions` applied to local Postgres.
- 2026-07-20: tenant auth E2E PASS after migration; p95 login/me/refresh proof logged by suite.
- 2026-07-20: unit suite PASS — 1 suite / 18 tests.

## Runtime Reachability Verification

- [ ] Entrypoint: tenant JWT request → `/tenant/users` → live permission/role checks → Prisma transaction and audit logger.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Concurrent seat oversubscription | Critical | Serializable transaction and real integration test |
| Manager privilege escalation | Critical | Actor/target role matrix enforced in service and negative tests |
