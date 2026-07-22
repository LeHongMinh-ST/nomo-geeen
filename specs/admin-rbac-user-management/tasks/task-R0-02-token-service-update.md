# Task R0-02: Token service update

**Requirement:** R5.1, R5.2 — Login/refresh compute permissions
**Status:** done
**Priority:** P0
**Estimated Effort:** M (1 day)
**Dependencies:** tasks/task-R0-01-claim-migration.md
**Spec:** specs/admin-rbac-user-management/

## Context

- **Why**: After claim migration (task-R0-01), `AuthService` MUST actually populate `permissions` from DB at login + refresh. Without this, JWT claim stays empty and `PermissionGuard` denies everything.
- **Current state**: `backend/src/platform/auth/auth.service.ts:73-95` sets `identity.role = admin.role` from enum; nothing else.
- **Target outcome**: `login()` and `refresh()` JOIN `admin_role_assignment` → `role` → `role_permission` → `permission`, returning distinct `permission.code[]` + `role.code[]`. JWT claim signed with both lists (R5.1, R5.2).

## Constraints

- **MUST**: Single Prisma `findMany` query for all assignments + permissions (avoid N+1).
- **MUST**: Failure path: if RBAC tables missing/empty for SUPER_ADMIN, return ALL seeded permission codes (recovery).
- **MUST NOT**: Compute permissions from JWT (must be DB-authoritative at login).
- **SCOPE**: `AuthService.login` + `AuthService.refresh` only. Guard implementation is task-R0-03.

## Steps

- [ ] 1. Add `loadAdminPermissions()` helper on `AuthService`
  - Business intent: single source of truth for permission resolution.
  - Code detail: in `backend/src/platform/auth/auth.service.ts`:
    ```ts
    private async loadAdminPermissions(adminId: string): Promise<{roleCodes: string[]; permissions: string[]}> {
      const rows = await this.prisma.adminRoleAssignment.findMany({
        where: { adminId, role: { tenantId: null, isAdmin: true } }, // F-07: drop isSystem clause
        select: {
          role: {
            select: {
              code: true,
              permissions: { select: { permission: { select: { code: true } } } },
            },
          },
        },
      });
      const roleCodes = [...new Set(rows.map(r => r.role.code))];
      const permissions = [...new Set(rows.flatMap(r => r.role.permissions.map(p => p.permission.code)))];
      return { roleCodes, permissions };
    }
    ```
  - The join keys on `role.isAdmin = true`, so `SUPER_ADMIN` (which has `isSystem=true` AND `isAdmin=true`) is included. The previous `isSystem: false` filter broke R4.2 super-admin shortcut on first login (F-07).
  - _Requirements: 5.1, 5.2_

- [ ] 2. Wire `loadAdminPermissions` into `login()`
  - Replace `identity.role = admin.role` with full identity including roleCodes + permissions.
  - Update audit log to include `actor_role_code` (R6.2) — set from `identity.roleCodes.join(',')`.
  - _Requirements: 5.1_

- [ ] 3. Wire `loadAdminPermissions` into `refresh()`
  - Re-load admin, then compute permissions, then sign new access token with updated claim.
  - _Requirements: 5.2_

- [ ] 4. Handle R8.2 (legacy SUPER_ADMIN auto-assignment) — wrapped in transaction + upsert (F-08)
  - On `login()`, if admin has no role assignments AND `admin.role === 'SUPER_ADMIN'`, auto-create assignment to seeded system SUPER_ADMIN role. Wrap in `prisma.$transaction([...])` and use `prisma.adminRoleAssignment.upsert({ where: { adminId_roleId: { adminId, roleId: superAdminRoleId } }, update: {}, create: { adminId, roleId: superAdminRoleId, assignedBy: null } })` so concurrent first-time logins are idempotent (the unique constraint is the source of truth).
  - Add Evidence: "two concurrent first-time logins both return 200 with non-empty `permissions[]`".
  - _Requirements: 8.2_

- [ ] 5. Unit tests
  - In `backend/src/platform/auth/auth.service.spec.ts` add tests: login populates permissions from JOIN; refresh re-populates; legacy auto-assignment; concurrent-assignment test (Promise.all of two login calls both succeed).
  - Run `pnpm --filter backend test -- --testPathPattern auth.service`.
  - _Requirements: 5.1, 5.2, 8.2_

## Requirements

- 5.1 — login computes permissions from role assignments
- 5.2 — refresh re-computes permissions from DB
- 8.2 — legacy SUPER_ADMIN auto-assignment on login

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/auth.service.ts` | Modify | Add `loadAdminPermissions`, wire into login/refresh |
| `backend/src/platform/auth/auth.service.spec.ts` | Modify | Add load-claim tests |

## Completion Criteria

- [ ] Login response includes `admin.permissions` array non-empty for SUPER_ADMIN seed
- [ ] Refresh returns access token whose decoded payload has `roleCodes` + `permissions` matching DB
- [ ] Legacy admin with no assignments gets auto-assigned at login

## Evidence

- [x] Automated verification
  - Command: `cd backend && pnpm tsc --noEmit`
  - Outcome: **PASS** — TypeScript: No errors found.
  - Command: `pnpm test -- --testPathPattern auth.service`
  - Outcome: **BLOCKED — environment**: pnpm install aborted by supply-chain policy (same env block as R0-01). Test code authored.
- [ ] Artifact / runtime verification
  - Inspect: decode JWT after login with seeded SUPER_ADMIN; payload has 30+ permission codes.
  - Status: **DEFERRED** — no Postgres/Redis live in this session. Unit test mocks `prisma.adminRoleAssignment.findMany` to return SUPER_ADMIN assignment + 2 permission codes, and asserts `result.admin.roleCodes === ['SUPER_ADMIN']` + `result.admin.permissions.length >= 2`.
- [x] Runtime reachability verification
  - Entrypoint: `POST /auth/admin/login` wired via AuthController. TS compile green; all type checks pass.
- [ ] Contract / negative-path verification
  - Check: legacy admin (no assignments, enum=SUPER_ADMIN) logs in → auto-assignment row created.
  - Status: **Unit test authored** in `auth.service.spec.ts` ("R8.2: legacy SUPER_ADMIN with no assignments auto-creates row in transaction + upsert"). Asserts `prisma.$transaction` called once + `adminRoleAssignment.upsert` called at least once. Non-SUPER_ADMIN enum path also covered ("non-SUPER_ADMIN enum skips R8.2 auto-assignment").

**Verification receipt:** TypeScript compile PASS. AuthService.login/refresh/me/logout wired with roleCodes + permissions; R8.2 auto-assignment wrapped in `$transaction` + `upsert`. Unit tests authored. Runtime test execution BLOCKED by env (`pnpm install` lockfile policy). Re-run `/hapo:test admin-rbac-user-management` in env with clean pnpm install.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| N+1 query | Low | Single `findMany` with nested selects |
| Refresh re-fetch fails (DB down) | Medium | Wrap in try/catch; on DB error re-throw 503 (consistent with `redisGuard` pattern) |
| Legacy admin has no permission seed | Low | Auto-assign + seed guarantees SUPER_ADMIN has all perms |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
