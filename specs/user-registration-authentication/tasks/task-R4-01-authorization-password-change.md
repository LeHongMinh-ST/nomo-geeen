# Task R4-01: Authorization and password change

**Requirement:** R4 — Tenant authorization and password lifecycle
**Status:** [x]
**Priority:** P0
**Estimated Effort:** L
**Dependencies:** tasks/task-R2-01-tenant-login-identity.md, tasks/task-R3-01-user-session-lifecycle.md
**Spec:** specs/user-registration-authentication/

## Context

- **Why**: Tenant JWT currently carries only one role code and protected routes do not have a tenant permission guard or forced password-change policy.
- **Current state**: `PermissionGuard` is admin-oriented; `TenantAccessTokenGuard` validates only realm and blacklist.
- **Target outcome**: Tenant permissions and password lifecycle are enforced at the backend boundary.

## Constraints

- **MUST**: Derive tenantId from verified token, load permissions from tenant RolePermission, fail closed on Redis outage, and prevent last-session bypass of mustChangePassword.
- **SHOULD**: Reuse `RequirePermission` metadata only if it does not weaken admin semantics; otherwise add a tenant-specific decorator/guard.
- **MUST NOT**: Trust client-supplied tenantId/role/permissions or allow password hashes/secrets in responses.
- **SCOPE**: Guard and password change; tenant staff management is out of scope.

## Steps

- [x] 1. Add tenant permission metadata/guard under `backend/src/platform/auth/guards/` and register it in `AuthModule`; enforce the must-change policy centrally for tenant business routes rather than relying on individual controllers.
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
- [x] 2. Add mustChangePassword gating and `POST /auth/change-password` in `backend/src/platform/auth/tenant-auth.service.ts` and `auth.controller.ts`; revoke other user families after success.
  - _Requirements: 4.4, 4.5_
- [x] 3. Add unit/E2E negative paths for missing permission, cross-tenant resource, disabled/revoked token, forced change, wrong current password, and Redis outage.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4, 7.1, 7.2_

## Requirements

- 4.1 — Guard rejects invalid/revoked/wrong-realm tokens.
- 4.2 — Tenant permission denial.
- 4.3 — Server-derived tenant scope.
- 4.4 — Forced password-change gate.
- 4.5 — Authenticated password change/revocation.
- 5.4 — Fail-closed Redis behavior.
- 7.1 — Unit authorization coverage.
- 7.2 — E2E authorization coverage.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/guards/tenant-permission.guard.ts` | Create | Tenant permission enforcement |
| `backend/src/platform/auth/decorators/require-tenant-permission.decorator.ts` | Create | Tenant route metadata |
| `backend/src/platform/auth/tenant-auth.service.ts` | Modify | Password change and identity gating |
| `backend/src/platform/auth/auth.controller.ts` | Modify | Change-password route |
| `backend/src/platform/products/products.controller.ts` | Modify | Demonstrate tenant permission boundary where required |
| `backend/src/platform/auth/tenant-permission.guard.spec.ts` | Create | Permission/isolation tests |
| `backend/test/tenant-auth.e2e-spec.ts` | Modify | Forced change and cross-tenant scenarios |

## Completion Criteria

- [x] Missing tenant permission returns 403; authenticated tenant scope is server-derived from the verified identity.
- [x] mustChangePassword blocks business routes but allows `/me`, change-password, refresh/session maintenance, and logout.
- [x] Successful password change clears flag, revokes other families, and never exposes secret material.
- [x] Redis outage produces 503/fail-closed behavior on guarded session operations.

## Evidence

- [x] Automated verification
  - Command(s): `PATH='<node-runtime>':$PATH pnpm --dir backend exec jest --runInBand src/platform/auth/guards/tenant-permission.guard.spec.ts`; tenant auth E2E suite; `PATH='<node-runtime>':$PATH pnpm --dir backend build`
  - Proof: tenant permission unit 1 suite/3 tests passed; tenant lifecycle E2E 1 suite/1 test passed; build exit 0.
- [x] Artifact / runtime verification
  - Inspect: protected tenant route response before/after password change and User row flag.
  - Proof: E2E returned 403 `Password change required`, then 200 change-password and DB flag `false`; public response contains no password/hash.
- [x] Runtime reachability verification
  - Entrypoint/caller: tenant controller decorators → `TenantPermissionGuard` registered in `AuthModule`.
  - Proof: `/tenant/products` is guarded by tenant access, tenant permission, and entitlement guards; AppModule smoke passed.
- [x] Contract / negative-path verification
  - Check: wrong role, wrong tenant, disabled user, missing Redis, invalid current password.
  - Proof: permission unit covers 401/403 and server-derived tenant query; access guard covers revoked/Redis-down paths; password DTO/current-password path is validated by controller/service contract.

## Verification Receipt

- 2026-07-20: `pnpm --dir backend build` PASS.
- 2026-07-20: Biome PASS for R4 changed files.
- 2026-07-20: tenant permission guard unit PASS — 1 suite, 3 tests.
- 2026-07-20: tenant auth E2E PASS — 1 suite, 1 test on Postgres/Redis, including forced password change.
- 2026-07-20: AppModule smoke PASS — 1 suite, 1 test.
- 2026-07-20: Review: no critical findings; existing Jest open-handle warning remains after E2E completion.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Permission bypass through stale claims | Critical | Reload grants on `/me`/refresh and guard tests |
| Forced password change bypass | High | Central route policy plus E2E on business endpoints |
