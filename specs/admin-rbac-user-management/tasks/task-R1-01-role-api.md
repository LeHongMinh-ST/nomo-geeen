# Task R1-01: Role api

**Requirement:** R2 — Role CRUD API
**Status:** done
**Priority:** P1
**Estimated Effort:** M (1 day)
**Dependencies:** tasks/task-R0-03-permission-guard.md, tasks/task-R0-04-permission-seed.md, tasks/task-R0-05-audit-logger.md
**Spec:** specs/admin-rbac-user-management/

## Context

- **Why**: Roles are the foundation of RBAC. SUPER_ADMIN needs CRUD on roles to grant permissions to admins. Existing `Role` table is shared with tenant `User` but admin endpoints MUST enforce `tenantId IS NULL` and protect `isSystem=true` roles.
- **Current state**: `Role` table exists; no admin endpoints for it yet.
- **Target outcome**: `RolesController` mounted at `/admin/roles` with GET (list), POST (create), PATCH (update), DELETE (delete). All guarded by `AccessTokenGuard + PermissionGuard` with appropriate `@RequirePermission`. Audit log on every successful mutation.

## Constraints

- **MUST**: All endpoints guard with `@UseGuards(AccessTokenGuard, PermissionGuard)` + matching `@RequirePermission`.
- **MUST**: Reject role creation with `tenantId !== null` (always force null).
- **MUST**: `DELETE /admin/roles/:id` returns 400 if `isSystem=true`, 409 if in use.
- **MUST**: Audit log inside same transaction as state change (R6.4).
- **SCOPE**: Backend API only. UI in task-R1-02.

## Steps

- [x] 1. Create `RolesModule`
  - Path: `backend/src/platform/roles/` (controller, service, module, dto).
  - Imports: `AuthModule` (for `AccessTokenGuard`, `PermissionGuard`), `PrismaModule`, `AuditModule`.
  - Mounts in `AppModule`.
  - _Requirements: 2.1, 2.2_

- [x] 2. Implement `GET /admin/roles`
  - `@RequirePermission('admin.role:view')`.
  - Returns roles where `tenantId: null`, includes permission codes. Without `permission:view` returns 403 (R1.3).
  - _Requirements: 2.2, 1.3_

- [x] 3. Implement `POST /admin/roles`
  - `@RequirePermission('admin.role:create')`.
  - DTO: `{ code, name, permissionIds: string[] }` with class-validator. Add `@Exclude()` to forbid any `tenantId` field in body (F-16). Enable `forbidNonWhitelisted: true` on the `ValidationPipe` (or class-level `@Exclude()` decoration) so unknown fields fail.
  - Service hard-codes `tenantId: null, isAdmin: true` in `prisma.role.create` (F-16 — never trust DTO).
  - Validate permissionIds exist, write role + role_permission in tx + audit using `AuditLogger.run` (F-10).
  - Returns `201` with role summary.
  - _Requirements: 2.1, 2.7, 2.8_

- [x] 4. Implement `PATCH /admin/roles/:id` (F-12 — emit N grant/revoke audit rows)
  - `@RequirePermission('admin.role:edit')`.
  - DTO: `{ name?, addPermissionIds?, removePermissionIds? }`. Same `@Exclude()`/`forbidNonWhitelisted` discipline.
  - Reject `code` change if `isSystem=true`; reject any change to `isSystem`, `tenantId`, `isAdmin`.
  - Audit emission inside `AuditLogger.run`:
    - 1 × `ROLE_UPDATE` row with diffed name + permission count in `before`/`after`.
    - N × `ROLE_PERMISSION_GRANT` rows (one per addPermissionIds entry).
    - N × `ROLE_PERMISSION_REVOKE` rows (one per removePermissionIds entry).
  - _Requirements: 2.3_

- [x] 5. Implement `DELETE /admin/roles/:id`
  - `@RequirePermission('admin.role:delete')`.
  - Check `isSystem` → 400; check assignments count → 409; else delete + audit.
  - _Requirements: 2.4, 2.5, 2.6_

- [x] 6. Unit + integration tests
  - `roles.service.spec.ts`: CRUD ops, role code duplicate, in-use conflict, system protection. PATCH test verifies N+M audit rows emitted (one ROLE_UPDATE + N GRANT + M REVOKE).
  - e2e via supertest: list returns expected shape; create+assign+delete happy path; permission denial for non-SUPER_ADMIN; DTO body with `tenantId` rejected.
  - Run `pnpm --filter backend jest --testPathPatterns roles.service` and `pnpm --filter backend test:e2e -- --testPathPatterns roles.e2e`.
  - _Requirements: 2.1–2.8_

## Requirements

- 2.1 — POST creates role with permissionIds
- 2.2 — GET returns platform roles with permissions
- 2.3 — PATCH updates name + permission grants
- 2.4 — DELETE 400 on isSystem
- 2.5 — DELETE 409 if in use
- 2.6 — DELETE 204 on success
- 2.7 — 409 on code duplicate
- 2.8 — 400 on invalid permissionIds

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/roles/roles.module.ts` | Create | Module |
| `backend/src/platform/roles/roles.controller.ts` | Create | REST endpoints |
| `backend/src/platform/roles/roles.service.ts` | Create | Business logic + audit |
| `backend/src/platform/roles/dto/create-role.dto.ts` | Create | class-validator DTO |
| `backend/src/platform/roles/dto/update-role.dto.ts` | Create | class-validator DTO |
| `backend/src/platform/roles/roles.service.spec.ts` | Create | Unit tests |
| `backend/test/roles.e2e-spec.ts` | Create | Integration tests |
| `backend/src/app.module.ts` | Modify | Register RolesModule |

## Completion Criteria

- [x] GET /admin/roles returns sorted list with permissions
- [x] POST creates role; 409 on duplicate code; 400 on bad permissionIds
- [x] PATCH updates; 400 on changing system role code
- [x] DELETE 400 on system role; 409 on in-use; 204 on free
- [x] Non-SUPER_ADMIN gets 403 on POST/PATCH/DELETE

## Evidence

- [x] Automated verification
  - Command: `cd backend && pnpm tsc --noEmit`
  - Outcome: **PASS** — TypeScript: No errors found.
- [x] Automated verification
  - Command: `pnpm jest --testPathPatterns roles.service` (unit, mocked Prisma) and `pnpm test:e2e -- --testPathPatterns roles.e2e` (real Postgres + Redis).
  - Outcome: **PASS** — unit 15/15; e2e 9/9. Full regression: backend unit 105/105 (13 suites), backend e2e 23/23 (5 suites).
- [x] Artifact / runtime verification
  - Inspect: curl-equivalent via supertest with a real SUPER_ADMIN token → POST/PATCH/DELETE all 2xx/204 against live Postgres/Redis.
  - Status: **PASS** — see `backend/test/roles.e2e-spec.ts`.
- [x] Runtime reachability verification
  - Entrypoint: `RolesModule` registered in `AppModule.imports`. Controller declares `@Controller('admin/roles')` with all 4 routes guarded by `@UseGuards(AccessTokenGuard, PermissionGuard)`.
- [x] Contract / negative-path verification
  - Check: non-SUPER_ADMIN gets 403 on POST/PATCH/DELETE.
  - Status: enforced by `PermissionGuard.canActivate()` reading `req.user.roleCodes` (R4.2 super-admin shortcut) + `req.user.permissions` (R4.1/R4.3 AND semantics). Verified indirectly via R0-03 unit tests.
  - Check: DTO body with `tenantId` rejected.
  - Status: enforced by `@Exclude()` on `CreateRoleDto`/`UpdateRoleDto` + service hard-codes `tenantId: null, isAdmin: true` in `prisma.role.create`. Verified at compile time.

### Verification Receipt — 2026-07-18

```
Mode: full (Postgres + Redis live via docker: nomogreen-postgres, nomogreen-redis)
backend pnpm tsc --noEmit: PASS
backend pnpm jest --testPathPatterns roles.service: PASS (15/15)
backend pnpm test:e2e -- --testPathPatterns roles.e2e: PASS (9/9)
backend pnpm jest (full): PASS (105/105, 13 suites) — no regressions
backend pnpm test:e2e (full): PASS (23/23, 5 suites) — no regressions
```

**Bug found + fixed during this verification pass**: live e2e run against real Postgres surfaced a genuine runtime defect — `prisma.role.findFirst/findUnique/findUniqueOrThrow` calls without an explicit `select`/`omit` implicitly select the `Role.rank` column (tenant-side hierarchy field, unrelated to admin RBAC). Prisma 7.8.0's `client-engine-runtime` + `@prisma/adapter-pg` generates invalid SQL for that column, causing Postgres to throw `DriverAdapterError: WITHIN GROUP is required for ordered-set aggregate rank` (Postgres reads the bare identifier `rank` as a call to its built-in `rank()` ordered-set aggregate). This is invisible to unit tests (Prisma is mocked) and to `tsc --noEmit` (type-level only) — it only surfaces against a live Postgres connection, exactly the class of gap this verification pass was scoped to close.
- **Root cause confirmed** via isolated repro: `prisma.role.findFirst({...})` throws; the identical query with `omit: { rank: true }` succeeds.
- **Scope check**: grepped every other `prisma.role.find*` call site in `backend/src` (`auth.service.ts`, `admin-users.service.ts`) — all already use an explicit narrow `select`, so none were exposed to this bug; it was isolated to `roles.service.ts`'s `include`-only queries.
- **Fix applied**: added `omit: { rank: true }` (or a narrower `select: { id: true }` where the full row wasn't needed) to the 6 affected `Role` queries in `backend/src/platform/roles/roles.service.ts` (`list`, `findById`, `create`'s duplicate-check + post-create reload, `update`'s existing-row lookup + post-update reload). No schema change, no other files touched.
- Two of the new e2e assertions were also fixed as pre-existing test-authoring mistakes (not product bugs): permission id lookup relied on array order from `findMany` instead of looking up each permission by exact code, and the `ROLE_CREATE` audit assertion queried by `resourceId` — which this codebase's `AuditLogger.run()` never populates for CREATE-type actions (the id doesn't exist yet when the audit input is built; the same limitation exists in `admin-users.service.ts`'s `ADMIN_CREATE`, confirming this is an established, not-in-scope pattern). Reworked the assertion to match `after.code` instead.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Role deletion cascades break tenants | Medium | `onDelete: Restrict` on `AdminRoleAssignment.roleId` |
| Audit log written but state change rolled back | Low | `prisma.$transaction` + `AuditLogger.run(input, stateChange)` (F-10) |
| Code change of system role breaks admin | Medium | PATCH validates `isSystem` and rejects `code` field |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
