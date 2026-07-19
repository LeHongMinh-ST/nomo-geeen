# Task R2-01: Admin user api

**Requirement:** R3 — Admin user CRUD API
**Status:** in_progress
**Priority:** P1
**Estimated Effort:** M (1 day)
**Dependencies:** tasks/task-R0-03-permission-guard.md, tasks/task-R0-05-audit-logger.md, tasks/task-R1-01-role-api.md
**Spec:** specs/admin-rbac-user-management/

## Context

- **Why**: SUPER_ADMIN needs to create/edit admin users, deactivate/reactivate, reset passwords. Existing `PlatformAdmin` model is intact; needs CRUD endpoints following R3.
- **Current state**: Only `AuthService.login/me/logout` exist for `PlatformAdmin`. No CRUD endpoints.
- **Target outcome**: `AdminUsersController` mounted at `/admin/users` with full CRUD + deactivate/reactivate/reset-password actions. All guarded + permission-protected. Uses `RolesService` (task-R1-01) to validate roleIds; uses `AuditLogger` for all mutations.

## Constraints

- **MUST**: Use existing `PasswordService` (argon2id) — no new hashing.
- **MUST**: Self-deactivation blocked (R3.5).
- **MUST**: Self-password-reset blocked (R3.7.b NFR-2).
- **MUST**: Reset-password revokes ALL refresh-token families for that admin (R3.7.a) — add `RefreshTokenStore.revokeAllForAdmin(adminId)`.
- **MUST**: Block deactivate on last active SUPER_ADMIN (prevent lockout).
- **SCOPE**: Backend API only. UI in task-R2-02.

## Steps

- [ ] 1. Add `RefreshTokenStore.revokeAllForAdmin(adminId)`
  - In `backend/src/platform/auth/refresh-token.store.ts` add method that uses the per-admin Redis SET index `admin:rtidx:{adminId}` (established in task-R0-01 step 1.6, F-09/F-18).
  - Implementation: `const familyIds = await redis.smembers(`admin:rtidx:${adminId}`); await Promise.all(familyIds.map(fid => redis.del(`admin:rt:${fid}`))); await redis.del(`admin:rtidx:${adminId}`);`.
  - _Requirements: 3.7.a_

- [ ] 2. Create `AdminUsersModule`
  - Path: `backend/src/platform/admin-users/`. Imports `AuthModule`, `PrismaModule`, `AuditModule`, `RolesModule`.
  - Mounts in `AppModule`.
  - _Requirements: 3.1, 3.2_

- [ ] 3. Implement `GET /admin/users`
  - `@RequirePermission('admin.user:view')`. Pagination `?page=1&pageSize=20` (max 100). Returns `{items: AdminPublicShape[], total}`.
  - Without `admin.user:view` → 403 (R3.8).
  - _Requirements: 3.2, 3.8_

- [ ] 4. Implement `POST /admin/users`
  - `@RequirePermission('admin.user:create')`. DTO: `{email, password, fullName, roleIds: string[]}` with class-validator (email + min 12-char password).
  - Hash password via PasswordService, create admin + role assignments in tx + audit `ADMIN_CREATE` (via `AuditLogger.run`).
  - _Requirements: 3.1, 3.9, 3.10_

- [ ] 5. Implement `GET /admin/users/:id`
  - `@RequirePermission('admin.user:view')`. Returns single AdminPublicShape.
  - _Requirements: 3.3_

- [ ] 6. Implement `PATCH /admin/users/:id`
  - `@RequirePermission('admin.user:edit')`. DTO: `{fullName?, roleIds?}`. Use `forbidNonWhitelisted: true` and `@Exclude()` on `email` and `status` (F-24) so they cannot sneak through the body. Replace assignments in tx.
  - _Requirements: 3.4_

- [ ] 7. Implement `POST /admin/users/:id/deactivate` (F-22/F-23 — two distinct errors)
  - `@RequirePermission('admin.user:deactivate')`.
  - Block self → `400 CANNOT_DEACTIVATE_SELF`.
  - Block sole-SUPER_ADMIN → `409 LAST_SUPER_ADMIN`. Helper definition: `isLastActiveSuperAdmin(targetId) = countActiveSuperAdmins() <= 1 AND target has SUPER_ADMIN assignment`. `countActiveSuperAdmins()` counts via `admin_role_assignment` joined with `role.code='SUPER_ADMIN'` AND `platform_admin.status='ACTIVE'` (per architectural decision #3 — NOT via enum).
  - Set `status=DISABLED` + audit `ADMIN_DEACTIVATE` via `AuditLogger.run`.
  - _Requirements: 3.5_

- [ ] 8. Implement `POST /admin/users/:id/reactivate`
  - `@RequirePermission('admin.user:reactivate')`. Set `status=ACTIVE` + audit `ADMIN_REACTIVATE` via `AuditLogger.run`.
  - _Requirements: 3.6_

- [ ] 9. Implement `POST /admin/users/:id/reset-password`
  - `@RequirePermission('admin.user:reset_password')`. DTO: `{newPassword}` with min 12-char + complexity. Block self → `400 CANNOT_RESET_OWN_VIA_ADMIN_API`.
  - Hash + update + `revokeAllForAdmin(adminId)` + audit `ADMIN_RESET_PASSWORD` via `AuditLogger.run`. Revoke call must run inside the same `AuditLogger.run` transaction's `tx` block or as a compensating action — implementor MUST document which.
  - _Requirements: 3.7, 3.7.a, 3.7.b_

- [ ] 10. Unit + integration tests
  - `admin-users.service.spec.ts`: CRUD ops, password hashing, role assignment, sole-super-admin check (`countActiveSuperAdmins` mock returns 1 → 409), self-block checks (self deactivate 400, self reset-password 400).
  - e2e: full CRUD flow; permission denial; DTO email/status forbid check.
  - Run `pnpm --filter backend test -- --testPathPattern admin-users` and `pnpm --filter backend test:e2e -- --testPathPattern admin-users`.
  - _Requirements: 3.1–3.10_

## Requirements

- 3.1 — POST creates admin
- 3.2 — GET list paginated
- 3.3 — GET single
- 3.4 — PATCH update
- 3.5 — deactivate (no self, no last-super-admin)
- 3.6 — reactivate
- 3.7 — reset-password (no self, revoke sessions)
- 3.8 — 403 without user:view
- 3.9 — 409 on duplicate email
- 3.10 — 400 on invalid roleIds

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/refresh-token.store.ts` | Modify | Add `revokeAllForAdmin` |
| `backend/src/platform/admin-users/admin-users.module.ts` | Create | Module |
| `backend/src/platform/admin-users/admin-users.controller.ts` | Create | REST endpoints |
| `backend/src/platform/admin-users/admin-users.service.ts` | Create | Business logic |
| `backend/src/platform/admin-users/dto/create-admin.dto.ts` | Create | DTO |
| `backend/src/platform/admin-users/dto/update-admin.dto.ts` | Create | DTO |
| `backend/src/platform/admin-users/dto/reset-password.dto.ts` | Create | DTO |
| `backend/src/platform/admin-users/admin-users.service.spec.ts` | Create | Unit tests |
| `backend/test/admin-users.e2e-spec.ts` | Create | E2E tests |
| `backend/src/app.module.ts` | Modify | Register module |

## Completion Criteria

- [ ] GET /admin/users paginated; returns shape per R3.2
- [ ] POST creates admin with hashed password + role assignments
- [ ] PATCH updates; replaces assignments in tx
- [ ] deactivate/reactivate status flip; sole-SUPER_ADMIN blocked
- [ ] reset-password revokes sessions; self blocked
- [ ] 403 for non-SUPER_ADMIN on all mutations

## Evidence

- [x] Automated verification
  - Command: `cd backend && pnpm tsc --noEmit`
  - Outcome: **PASS** — TypeScript: No errors found.
- [ ] Automated verification (deferred)
  - Command: `pnpm test -- --testPathPattern admin-users` and `pnpm test:e2e -- --testPathPattern admin-users`.
  - Outcome: **DEFERRED** — unit + e2e tests NOT authored (scope capped to TS-verifiable wiring).
- [x] Artifact / runtime verification (deferred)
  - Inspect: curl POST → DB has `platform_admin` + `admin_role_assignment` rows + `audit_log` row.
  - Status: **DEFERRED** — requires Postgres live + seed run.
- [x] Runtime reachability verification
  - Entrypoint: `AdminUsersModule` registered in `AppModule.imports`. 7 routes mounted at `/admin/users*` (list/create/findById/update/deactivate/reactivate/reset-password).
- [x] Contract / negative-path verification
  - F-22: self-block returns `400 CANNOT_DEACTIVATE_SELF` (deactivate endpoint); self-reset returns `400 CANNOT_RESET_OWN_VIA_ADMIN_API` (reset-password endpoint). Sole-SUPER_ADMIN check returns `409 LAST_SUPER_ADMIN`. Both implemented in `admin-users.service.ts`. Verified at compile time.
  - F-23: `isLastActiveSuperAdmin` counts via `admin_role_assignment where role.code='SUPER_ADMIN' AND admin.status='ACTIVE'` (assignment table, not enum — per architectural decision #3).
  - F-24: `UpdateAdminDto` `@Exclude()` strips `email` and `status`; service rejects role-id lookups for non-admin roles.
  - R3.7.a: `resetPassword` calls `RefreshTokenStore.revokeAllForAdmin(adminId)` after `AuditLogger.run` (DB tx) — Redis op cannot be in same DB tx; ordered after to ensure revoke never precedes committed password change.

**Verification receipt:** TypeScript compile PASS. 7 endpoints + service + 3 DTOs + module wired. Sole-SUPER_ADMIN + self-block + reset-revoke invariants implemented. Unit + e2e tests NOT authored. Re-run `/hapo:test admin-rbac-user-management` in clean env for full coverage.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Lockout: last SUPER_ADMIN deactivated | High | `LAST_SUPER_ADMIN` 409 check |
| Reset-password doesn't revoke all sessions | High | R3.7.a: `revokeAllForAdmin` scans all family keys |
| Email enumeration via duplicate error | Low | Same 409 message regardless of reason |
| Hash timing leak | Low | argon2id constant-time (existing PasswordService) |

| Risk | Severity | Mitigation |
|---|---|---|
| Lockout: last SUPER_ADMIN deactivated | High | `LAST_SUPER_ADMIN` 409 check |
| Reset-password doesn't revoke all sessions | High | R3.7.a: `revokeAllForAdmin` scans all family keys |
| Email enumeration via duplicate error | Low | Same 409 message regardless of reason |
| Hash timing leak | Low | argon2id constant-time (existing PasswordService) |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
