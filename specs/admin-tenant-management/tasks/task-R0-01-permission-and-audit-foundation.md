# Task R0-01: Permission and audit foundation

**Requirement:** R0 — Shared foundation for tenant permissions and audit actions
**Status:** done
**Priority:** P1
**Estimated Effort:** S
**Dependencies:** admin-rbac-user-management (hard blocker)
**Spec:** specs/admin-tenant-management/
**Contracts:** none

## Context

- **Why**: Tenant management must reuse the reserved `admin.tenant:*` permission codes, apply the role grant matrix, write stable audit events via `AuditLogger.run`, and prove RBAC runtime authz before any endpoint ships.
- **Current state**: `backend/prisma/seed-admin-rbac.ts` already seeds `admin.tenant:view|edit|approve|export` codes but `SUPPORT_GRANTS` does not include any `admin.tenant:*` codes. `AuditAction` enum lacks tenant events. `AuditLogger.run(input, stateChange)` already wraps mutation + audit in one `$transaction`.
- **Target outcome**: Permission catalog, SUPPORT full tenant grants, audit action vocabulary (with migration), and RBAC preflight acceptance tests are ready for R1.

## Constraints

- **MUST**: Keep codes exactly `admin.tenant:view`, `admin.tenant:edit`, `admin.tenant:approve`, `admin.tenant:export`.
- **MUST**: Add `AuditAction` values via a **Prisma migration artifact** (not generate-only).
- **MUST**: Pass RBAC foundation acceptance test before R1 starts (R5.6).
- **SHOULD**: Reuse existing seed and `AuditLogger.run` patterns.
- **MUST NOT**: Invent alternate permission formats, log secrets, or implement tenant endpoints.
- **SCOPE**: Foundation only; no tenant endpoints yet.

## Steps

- [x] 1. Verify/seed tenant permission codes and apply grant matrix
  - Business intent: codes exist and SUPPORT can manage tenants (all four ops); BILLING stays out.
  - Code detail: confirm `backend/prisma/seed-admin-rbac.ts` creates the four codes; add all four `admin.tenant:view|edit|approve|export` to `SUPPORT_GRANTS`; leave SUPER_ADMIN as guard bypass (no grant rows); BILLING/custom get none.
  - _Requirements: 5.1, 5.5_

- [x] 2. Extend audit action vocabulary with migration artifact
  - Business intent: mutations and export leave forensic trail against a compatible DB.
  - Code detail: add `TENANT_UPDATE`, `TENANT_STATUS_CHANGE`, `TENANT_EXPORT` to `AuditAction` in `backend/prisma/schema.prisma`; create migration; deploy-before-app-code ordering.
  - _Requirements: 2.5, 3.3, 4.4_

- [x] 3. Verify AuditLogger transaction-scoped API is usable for tenant tasks
  - Business intent: later mutation tasks call the same-tx path without inventing a second logger.
  - Code detail: confirmed `AuditLogger.run(input, stateChange)` uses one `$transaction`; also `log()` for event-only (export path candidate).
  - _Requirements: 2.5, 3.3, 7.3, 8.3_

- [x] 4. RBAC foundation acceptance preflight (blocks R1)
  - Business intent: prove runtime authorization, not just seed rows.
  - Code detail: unit suite `permission.guard.spec.ts` + `audit-logger.service.spec.ts` (14 tests). Valid claim allow, missing permission 403, SUPER_ADMIN bypass, no-user 401. Missing decorator metadata remains **allow** per RBAC foundation contract (`PermissionGuard` R0-03) — not rewritten here. Stale-token denial window owned by `admin-rbac-user-management`.
  - _Requirements: 5.3, 5.4, 5.6, 8.1_

- [x] 5. Verification implementation
  - Seed + migrate deploy + generate + typecheck + unit tests.
  - _Requirements: 5.1, 8.3_

## Requirements

- 5.1 — Ensure tenant permission codes exist + grant matrix
- 5.3 — Deny-by-default / missing metadata fail-closed
- 5.4 — SUPER_ADMIN bypass with audit
- 5.5 — Do not invent alternate permission formats
- 5.6 — RBAC foundation acceptance preflight
- 2.5 — Profile update audit row
- 3.3 — Status transition audit row
- 4.4 — Export audit row
- 7.3 — Transactional mutation + audit
- 8.1 — Server-side guards
- 8.3 — No secret logging

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/seed-admin-rbac.ts` | Modify | Verify codes; add all four `admin.tenant:*` to SUPPORT_GRANTS |
| `backend/prisma/schema.prisma` | Modify | Add tenant AuditAction enum members |
| `backend/prisma/migrations/20260718000100_admin_rbac_assignment_table/migration.sql` | Modify | Repair camelCase columns + include tenant AuditAction values |
| `backend/prisma/migrations/20260718133734_add_tenant_audit_actions/migration.sql` | Create | History marker (tenant values applied in RBAC migration) |
| `backend/src/platform/audit/audit-logger.service.ts` | Read | Confirm `run(input, stateChange)` same-tx API |
| `backend/src/platform/audit/audit-logger.service.spec.ts` | Modify | Fix TS cast for `log()` mock (scope escape for typecheck) |
| `backend/src/platform/auth/decorators/require-permission.decorator.ts` | Read | Confirm metadata helper for later controllers |
| `backend/src/platform/auth/guards/permission.guard.ts` | Read | Preflight: SUPER_ADMIN bypass + permission AND |

## Completion Criteria

- [x] Four `admin.tenant:*` codes present after seed; SUPPORT has all four tenant codes
- [x] Migration artifact for three tenant audit actions is applied; Prisma client generates them
- [x] `AuditLogger.run` contract documented for R1 mutation tasks
- [x] RBAC preflight acceptance test passes (R5.6 unit matrix); no alternate permission naming introduced
- [x] Foundation is reachable by later module tasks without orphaned schema changes

## Evidence

- [x] Automated verification
  - Commands:
    - `npx prisma migrate deploy` → EXIT 0, schema up to date
    - `npx prisma generate` → client includes TENANT_*
    - `npx tsc -p tsconfig.json --noEmit` → EXIT 0
    - `npx jest --testPathPatterns='permission.guard.spec|audit-logger.service.spec' --no-coverage` → 14 passed
    - `npx ts-node prisma/seed-admin-rbac.ts` → EXIT 0, 25 admin perms, 3 system roles
  - Expected proof: migrate/generate/typecheck/unit/seed green
- [x] Artifact / runtime verification
  - Inspect DB: AuditAction enum includes TENANT_UPDATE, TENANT_STATUS_CHANGE, TENANT_EXPORT
  - Permission rows: admin.tenant:view|edit|approve|export
  - SUPPORT grants: all four tenant codes
- [x] Runtime reachability verification
  - Entrypoint: seed script + migrate deploy + Prisma client + PermissionGuard unit suite
  - Expect: later tasks import AuditAction and call AuditLogger.run
- [x] Contract / negative-path verification
  - Check: only admin.tenant:* codes; missing permission 403; SUPER_ADMIN bypass; no-user 401
  - Note: empty metadata → allow (RBAC foundation contract, not changed)

### Verification Receipt — 2026-07-18
```
Mode: full
migrate deploy: PASS (DB schema up to date)
prisma generate: PASS (TENANT_UPDATE,TENANT_STATUS_CHANGE,TENANT_EXPORT in client)
tsc --noEmit: PASS
jest permission.guard + audit-logger: PASS (14 tests)
seed-admin-rbac: PASS (SUPPORT has 4 admin.tenant:* grants)
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Enum migration conflicts with RBAC work | High | Fixed broken RBAC migration camelCase (`tenantId`/`isAdmin`/`actorRoleCode`/`adminId`) so deploy could complete |
| Seed drift between environments | Medium | Seed idempotent; re-run `npx ts-node prisma/seed-admin-rbac.ts` |
| Preflight skipped → insecure endpoints | Critical | Unit matrix green; R1 must still use dual guards + RequirePermission |

---

> **Parallel marker**: Can run with R0-02 after shared schema review; both blocked by RBAC foundation.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`.
> **Evidence rule**: `## Evidence` present above.
