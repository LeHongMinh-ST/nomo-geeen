# Task R0-01: Claim migration

**Requirement:** R5, R8 — JWT claim + additive migration
**Status:** in_progress
**Priority:** P0
**Estimated Effort:** M (1 day)
**Dependencies:** none (foundation)
**Spec:** specs/admin-rbac-user-management/

## Context

- **Why**: Existing JWT access claim has single `role: string` from `PlatformAdmin.role` enum. RBAC needs `roleCodes: string[]` + `permissions: string[]` so `PermissionGuard` authorizes without DB hits and FE filters nav. Migration MUST be backward-additive (R8.1).
- **Current state**: `backend/src/platform/auth/token.service.ts` defines `AccessClaims` with `role: string`; `auth.service.ts` sets `identity.role = admin.role` from enum. JWT strategy returns `{ id, email, role }`.
- **Target outcome**: `AccessClaims` carries `roleCodes` + `permissions`; `AuthService.login/refresh` computes these from new `AdminRoleAssignment` join (task-R0-02); old `role` claim kept as comma-joined string for backward compat. Existing pre-deploy tokens still validate (HS256 signature unchanged).

## Constraints

- **MUST**: Additive — `role: string` stays in claim payload (comma-joined codes).
- **MUST**: New `admin_role_assignment` table via Prisma migration; `PlatformAdmin.role` enum RETAINED.
- **MUST NOT**: Drop `PlatformAdmin.role` enum column (Phase B, out of scope).
- **MUST NOT**: Change JWT algorithm, TTL, or secret names.
- **SCOPE**: Only claim shape + assignment table + DB migration. Service logic updates in task-R0-02.

## Steps

- [ ] 1. Add `AdminRoleAssignment` model to Prisma schema
  - Business intent: M:N table linking PlatformAdmin to Role.
  - Code detail: append to `backend/prisma/schema.prisma`:
    ```prisma
    model AdminRoleAssignment {
      id         String   @id @default(uuid())
      adminId    String
      roleId     String
      assignedAt DateTime @default(now())
      assignedBy String?
      admin      PlatformAdmin @relation(fields: [adminId], references: [id], onDelete: Cascade)
      role       Role          @relation(fields: [roleId], references: [id], onDelete: Restrict)
      @@unique([adminId, roleId])
      @@index([roleId])
      @@map("admin_role_assignment")
    }
    ```
  - Add back-relations on PlatformAdmin + Role.
  - _Requirements: 5.1, 8.1, 8.3_

- [ ] 1.5. Schema additions: `Role.is_admin`, `audit_log.actor_role_code`, `audit_log.action` enum
  - Add to Prisma schema:
    ```prisma
    model Role {
      // ... existing fields ...
      isAdmin   Boolean @default(false)
      // ...
    }
    enum AuditAction {
      ADMIN_CREATE
      ADMIN_UPDATE
      ADMIN_DEACTIVATE
      ADMIN_REACTIVATE
      ADMIN_RESET_PASSWORD
      ADMIN_ROLE_ASSIGN
      ADMIN_ROLE_REVOKE
      ROLE_CREATE
      ROLE_UPDATE
      ROLE_DELETE
      ROLE_PERMISSION_GRANT
      ROLE_PERMISSION_REVOKE
      LOGIN
      LOGOUT
      REFRESH_REUSE_DETECTED
    }
    model AuditLog {
      // ... existing fields ...
      actorRoleCode String?
      action        AuditAction
      // ...
    }
    ```
  - Raw SQL (author `migration.sql` since enum conversion + column add need explicit statements):
    ```sql
    ALTER TABLE role ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE role ADD CONSTRAINT role_admin_null_tenant
      CHECK (is_admin = false OR tenant_id IS NULL);
    CREATE UNIQUE INDEX role_admin_code_unique ON role (code) WHERE is_admin = true;

    ALTER TABLE audit_log ADD COLUMN actor_role_code TEXT;

    CREATE TYPE "AuditAction" AS ENUM (
      'ADMIN_CREATE','ADMIN_UPDATE','ADMIN_DEACTIVATE','ADMIN_REACTIVATE',
      'ADMIN_RESET_PASSWORD','ADMIN_ROLE_ASSIGN','ADMIN_ROLE_REVOKE',
      'ROLE_CREATE','ROLE_UPDATE','ROLE_DELETE',
      'ROLE_PERMISSION_GRANT','ROLE_PERMISSION_REVOKE',
      'LOGIN','LOGOUT','REFRESH_REUSE_DETECTED'
    );
    ALTER TABLE audit_log ALTER COLUMN action TYPE "AuditAction" USING action::"AuditAction";
    ```
  - _Requirements: 5.1, 6.1, 6.2, 6.5_

- [ ] 1.6. Redis per-admin refresh-token family index (F-09 / F-18)
  - Maintain Redis SET `admin:rtidx:{adminId}` containing `familyId`s for each open family.
  - `RefreshTokenStore.open(familyId, refreshToken, ttl, adminId)`: after SET, `SADD admin:rtidx:{adminId} familyId`.
  - `RefreshTokenStore.rotateFamily(familyId, ...)`: no admin change; index stays.
  - `RefreshTokenStore.revokeFamily(familyId, adminId)`: after DEL family key, `SREM admin:rtidx:{adminId} familyId`.
  - `revokeAllForAdmin(adminId)`: `SMEMBERS admin:rtidx:{adminId}` → DEL each family key → DEL index.
  - Document the SET as soft-index; consistency window < refresh TTL (30d) acceptable since login re-creates assignment.
  - _Requirements: 3.7.a_

- [ ] 2. Generate + run Prisma migration
  - Command: `cd backend && pnpm prisma migrate dev --name admin_rbac_assignment_table`.
  - Also author `migration.down.sql`: drop `admin_role_assignment` table, drop `audit_log.actor_role_code`, drop `AuditAction` enum, drop `Role.is_admin` column.
  - _Requirements: 8.1_

- [ ] 3. Update `AccessClaims` interface and `signAccess` payload
  - In `backend/src/platform/auth/token.service.ts` add `roleCodes: string[]` + `permissions: string[]` to `AdminIdentity` and `AccessClaims`.
  - **Sign contract (F-06)**: `signAccess` joins `roleCodes` with `,` into the legacy `role` field (e.g. `"SUPER_ADMIN,BILLING"`). Old consumers reading `payload.role` see CSV.
  - **Validate contract (F-06)**: `AccessTokenStrategy.validate()` returns `payload.roleCodes ?? payload.role.split(',')`; both branches covered by unit test in step 5.
  - _Requirements: 5.1_

- [ ] 4. Update `AccessTokenStrategy.validate()`
  - In `backend/src/platform/auth/strategies/access-token.strategy.ts` return `{ id, email, role, roleCodes, permissions }` with `?? []` defensive default. Backward compat: when payload only has `role`, split on `,` to populate `roleCodes`.
  - _Requirements: 5.3_

- [ ] 5. Unit tests
  - In `backend/src/platform/auth/token.service.spec.ts` add tests for new claim + backward read. Verify CSV join when 2 roles (e.g. `['SUPER_ADMIN','BILLING']` → `role='SUPER_ADMIN,BILLING'`). Verify old single-role payload validates to `roleCodes=['SUPER_ADMIN']`.
  - Run `pnpm --filter backend test -- --testPathPattern token.service`.
  - _Requirements: 5.1, 5.3, 8.1_

## Requirements

- 5.1 — login/refresh compute permissions from role assignments
- 5.3 — AccessTokenStrategy returns `{id, email, roleCodes, permissions}`
- 8.1 — `PlatformAdmin.role` enum column retained
- 8.3 — back-fill column ignored after migration

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Add `AdminRoleAssignment` model |
| `backend/prisma/migrations/<ts>_admin_rbac_assignment_table/migration.sql` | Create | Generated by prisma |
| `backend/src/platform/auth/token.service.ts` | Modify | Expand `AccessClaims` |
| `backend/src/platform/auth/strategies/access-token.strategy.ts` | Modify | Update `validate()` |
| `backend/src/platform/auth/token.service.spec.ts` | Modify | Add claim-shape unit tests |

## Completion Criteria

- [ ] `pnpm prisma migrate status` reports migration applied; `admin_role_assignment` exists
- [ ] `pnpm --filter backend test token.service` exits 0
- [ ] Old `PlatformAdmin.role` enum column still present
- [ ] `req.user` from `validate()` includes `roleCodes` and `permissions`

## Evidence

- [x] Automated verification
  - Command: `cd backend && pnpm tsc --noEmit`
  - Outcome: **PASS** — TypeScript: No errors found.
  - Command: `pnpm test -- --testPathPattern token.service`
  - Outcome: **BLOCKED — environment**: pnpm install aborted by supply-chain policy on `better-result@2.10.0` (lockfile policy violation, not code-related). Unable to execute jest in this session.
- [ ] Artifact / runtime verification
  - Inspect: `psql $DATABASE_URL -c "\d admin_role_assignment"`
  - Status: **DEFERRED** — no Postgres live in this session. Migration SQL authored at `backend/prisma/migrations/20260718000100_admin_rbac_assignment_table/migration.sql`; `migration_down.sql` companion authored (NFR-3).
- [x] Runtime reachability verification
  - Entrypoint: `backend/src/platform/auth/auth.module.ts` boots (TS compile green); no compile errors after schema + token-service + redis-service edits.
- [ ] Contract / negative-path verification
  - Check: decode OLD-shape token with valid signature → `validate()` returns `roleCodes` from CSV split + `permissions: []`.
  - Status: **Unit test authored** in `token.service.spec.ts` ("verifyAccess derives roleCodes from CSV when roleCodes field absent"). Not executed in this session due to env block; awaiting test-runner.
  - Check: signAccess multi-role → `role: 'SUPER_ADMIN,BILLING'`.
  - Status: **Unit test authored** ("signAccess joins multi-role roleCodes into CSV"). Not executed.

**Verification receipt:** TypeScript compile PASS. Migration + down SQL authored. New + backward-compat unit tests authored. Runtime test execution BLOCKED by env (`pnpm install` lockfile policy violation, unrelated to this task). Re-run `/hapo:test admin-rbac-user-management` in env with clean pnpm install to close evidence loop.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Migration fails on existing DB | Medium | Additive only; verify on staging copy |
| Old tokens mis-validated | Medium | `verifyAccess` unchanged; defensive `?? []` |
| `req.user.role` consumers break | Low | Field retained; Phase B follow-up |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
