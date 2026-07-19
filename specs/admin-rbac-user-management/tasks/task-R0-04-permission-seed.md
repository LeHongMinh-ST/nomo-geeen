# Task R0-04: Permission seed

**Requirement:** R1.1, R1.4 — permission catalog seed (idempotent)
**Status:** in_progress
**Priority:** P0
**Estimated Effort:** S (½ day)
**Dependencies:** tasks/task-R0-01-claim-migration.md
**Spec:** specs/admin-rbac-user-management/

## Context

- **Why**: Without a permission catalog, RBAC has nothing to grant. Need seeded `permission` rows matching the admin endpoint taxonomy (user, role, permission, tenant, billing, report, support).
- **Current state**: `permission` table is empty. System roles in existing schema are tenant-scoped (`OWNER`, `STAFF`) — NOT for platform admins.
- **Target outcome**: Idempotent seed script + system roles `SUPER_ADMIN`, `SUPPORT`, `BILLING` with `tenantId=NULL` + `isSystem=true`. SUPER_ADMIN granted all permission codes. Re-runnable without duplicates.

## Constraints

- **MUST**: UPSERT semantics — re-run safe.
- **MUST**: System roles have `tenantId=NULL` and `isSystem=true`.
- **MUST NOT**: Create user-defined permissions via API (read-only catalog).
- **SCOPE**: Seed script + 3 system roles + permission rows.

## Steps

- [ ] 1. Create seed script
  - File: `backend/prisma/seed-admin-rbac.ts`
  - Permission taxonomy (F-01): codes use prefix `admin.` to avoid collision with 10 existing tenant codes (`dashboard`, `product`, `purchase`, `inventory`, `sales`, `customer`, `supplier`, `debt`, `report`, `setting`). Resources: `user, role, permission, tenant, billing, report, support`. Actions: `view, create, edit, delete, approve, export, deactivate, reactivate, reset_password, reply`. Each (resource, applicable-action) pair becomes a code. Count: see design §7 — variable per resource (e.g. `admin.user` has 7 actions, `admin.report` has 2). Expected total = 36 codes (sum of applicable actions across 7 admin resources). Confirm count in this step before seeding.
  - Use `prisma.permission.upsert` for each code (`where: {code}`, `update: {}`, `create: {...}`).
  - _Requirements: 1.1, 1.4_

- [ ] 2. Seed 3 system roles
  - SUPER_ADMIN, SUPPORT, BILLING with `tenantId: null`, `isAdmin: true`, `isSystem: true`.
  - Grant: SUPER_ADMIN = all admin codes (via shortcut in code, not via grant rows); SUPPORT = `admin.*:view, admin.user:edit, admin.support:reply, admin.support:edit`; BILLING = `admin.billing:*, admin.user:view, admin.report:view`.
  - _Requirements: 1.1_

- [ ] 3. Wire into bootstrap
  - Add script call to existing bootstrap (look at task-R5-01 of admin-authentication or create new `pnpm seed:rbac` package script).
  - _Requirements: 1.1_

- [ ] 4. Verify
  - Run `pnpm --filter backend prisma:seed:rbac` then `psql ... -c "SELECT count(*) FROM permission WHERE code LIKE 'admin.%'"` → expected count (36) and `SELECT count(*) FROM role WHERE is_system=true AND is_admin=true AND tenant_id IS NULL;` → 3.
  - Run twice; second run still same counts (no duplicates).
  - _Requirements: 1.1, 1.4_

## Requirements

- 1.1 — seed permission rows from taxonomy
- 1.4 — UPSERT idempotent

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/seed-admin-rbac.ts` | Create | Seed script |
| `backend/package.json` | Modify | Add `seed:rbac` script |

## Completion Criteria

- [ ] First run creates 42 `permission` rows + 3 system roles with grants
- [ ] Second run creates 0 new rows (UPSERT)
- [ ] SUPER_ADMIN role linked to ALL 42 permission rows

## Evidence

- [ ] Automated verification
  - Command: `pnpm --filter backend seed:rbac && psql $DATABASE_URL -c "SELECT count(*) FROM permission; SELECT count(*) FROM role WHERE is_system=true AND tenant_id IS NULL;"`
  - Expected: `42` permissions; `3` system roles
- [ ] Artifact / runtime verification
  - Inspect: `prisma.permission.findMany()` returns sorted by resource
  - Expect: codes match taxonomy
- [ ] Runtime reachability verification
  - Entrypoint: `pnpm seed:rbac`
  - Expect: exits 0; row counts correct
- [ ] Contract / negative-path verification
  - Check: re-run seed; expect 0 additional rows (UPSERT no-op)
  - Expect: `42` permissions unchanged

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Seed runs against prod unexpectedly | Low | Use `NODE_ENV` check; only run in dev/staging |
| Permission code collision | Low | UUID-generated; idempotency keyed on `code` unique |
| SUPER_ADMIN gets stale grants after taxonomy change | Medium | Seed re-issues ALL grants on each run (delete-all then re-grant for SUPER_ADMIN) |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
