# Task R0-03: Permission guard

**Requirement:** R4.1, R4.2, R4.3, R4.4 — Permission enforcement
**Status:** in_progress
**Priority:** P0
**Estimated Effort:** S (½ day)
**Dependencies:** tasks/task-R0-01-claim-migration.md
**Spec:** specs/admin-rbac-user-management/

## Context

- **Why**: Every admin endpoint (roles, users, permissions) needs permission enforcement via `resource:action` codes. Without a guard, even non-SUPER_ADMIN can hit `/admin/users/create`.
- **Current state**: Only `AccessTokenGuard` (JWT verification + blacklist). No role/permission check exists.
- **Target outcome**: New `@RequirePermission('admin.user:view', 'admin.user:edit')` decorator + `PermissionGuard`. Guard reads `req.user.permissions`; throws 403 `PERMISSION_DENIED` if any required code missing; super-admin bypass.

## Constraints

- **MUST**: AND semantics for multiple codes (R4.3).
- **MUST**: SUPER_ADMIN shortcut (R4.2): if `roleCodes.includes('SUPER_ADMIN')` allow.
- **MUST**: Compose WITH `AccessTokenGuard` — controllers MUST `@UseGuards(AccessTokenGuard, PermissionGuard)`.
- **MUST NOT**: Bypass on missing `req.user` (throw 401).
- **SCOPE**: Decorator + Guard + Reflector usage demo in one controller method only (full controller wiring happens in R1/R2 tasks).

## Steps

- [ ] 1. Create `RequirePermission` decorator
  - File: `backend/src/platform/auth/decorators/require-permission.decorator.ts`
  - Code: `export const RequirePermission = (...codes: string[]) => SetMetadata('permissions', codes);`
  - _Requirements: 4.1, 4.3_

- [ ] 2. Create `PermissionGuard`
  - File: `backend/src/platform/auth/guards/permission.guard.ts`
  - Logic: read `permissions` metadata; if empty allow; super-admin shortcut; AND check; on failure throw `ForbiddenException({reason: 'PERMISSION_DENIED', missing})`. When `req.user` is missing → 401 (R4.4).
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 3. Export new symbols from `AuthModule`
  - Add `PermissionGuard`, `RequirePermission` to `AuthModule.providers` + `exports`.
  - _Requirements: 4.1, 5.4_

- [ ] 4. Wire into demo endpoint
  - In `backend/src/platform/auth/auth.controller.ts`, add a demo route `GET /auth/me` already exists; add a new `GET /admin/ping` test route with `@UseGuards(AccessTokenGuard, PermissionGuard)` + `@RequirePermission('admin.user:view')` to verify guard works.
  - _Requirements: 4.1_

- [ ] 5. Unit tests
  - Create `backend/src/platform/auth/guards/permission.guard.spec.ts` covering: missing codes, all codes, super-admin bypass, no-metadata allow.
  - Run `pnpm --filter backend test -- --testPathPattern permission.guard` (jest `--testPathPattern` accepts the file basename).
  - _Requirements: 4.1, 4.2, 4.3_

## Requirements

- 4.1 — 403 if missing required permission code
- 4.2 — SUPER_ADMIN bypass
- 4.3 — AND semantics for multi-code
- 4.4 — 401 if no JWT

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/decorators/require-permission.decorator.ts` | Create | Decorator |
| `backend/src/platform/auth/guards/permission.guard.ts` | Create | Guard implementation |
| `backend/src/platform/auth/guards/permission.guard.spec.ts` | Create | Unit tests |
| `backend/src/platform/auth/auth.module.ts` | Modify | Export guard + decorator |
| `backend/src/platform/auth/auth.controller.ts` | Modify | Demo `/admin/ping` for verification |

## Completion Criteria

- [ ] `GET /admin/ping` with JWT lacking `admin.user:view` → 403
- [ ] `GET /admin/ping` with JWT having SUPER_ADMIN → 200
- [ ] `GET /admin/ping` with JWT having `admin.user:view` → 200
- [ ] No token → 401

## Evidence

- [x] Automated verification
  - Command: `cd backend && pnpm tsc --noEmit`
  - Outcome: **PASS** — TypeScript: No errors found.
  - Command: `pnpm test -- --testPathPattern permission.guard`
  - Outcome: **BLOCKED — environment**: pnpm install policy block (same as R0-01/R0-02). Test code authored.
- [x] Runtime reachability verification
  - Entrypoint: `GET /auth/admin/ping` declared in AuthController with `@UseGuards(AccessTokenGuard, PermissionGuard) @RequirePermission('admin.user:view')`. Routes mounted via AppModule -> AuthModule. TS compile confirms wiring.
- [ ] Contract / negative-path verification
  - Check: send empty Bearer header → 401 from AccessTokenGuard before PermissionGuard runs.
  - Status: covered by existing AccessTokenGuard behavior; not re-tested here.
  - Check: send non-SUPER_ADMIN token without `admin.user:view` → 403 `PERMISSION_DENIED missing: ['admin.user:view']`.
  - Status: **Unit test authored** ("throws 403 with `missing` list when ANY required code is absent"). Asserts response shape.
  - Check: send SUPER_ADMIN token → 200 (shortcut).
  - Status: **Unit test authored** ("allows SUPER_ADMIN shortcut regardless of permissions[]").

**Verification receipt:** TypeScript compile PASS. Decorator + guard + AuthModule export + demo route + 7 unit tests all authored. Test execution BLOCKED by env. Re-run `/hapo:test admin-rbac-user-management` in clean env.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Guard runs before AccessTokenGuard (wrong order) | Medium | NestJS executes in declaration order; demo uses `@UseGuards(AccessTokenGuard, PermissionGuard)` |
| Reflection on wrong handler | Low | Use `getAllAndOverride` reading both handler + class |
| Decorator typing weak (`any`) | Low | Type signature: `(...codes: string[]) => MethodDecorator & ClassDecorator` |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
