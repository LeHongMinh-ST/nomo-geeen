# Task R0-01: Schema permission foundation

**Requirement:** R4 — schema & permission foundation
**Status:** done
**Priority:** P1
**Estimated Effort:** S
**Dependencies:** none
**Spec:** specs/admin-tenant-provisioning/

## Context

- **Why**: Tenant provisioning and tenant-user mutations must emit new audit actions and be gated by new permissions that do not exist yet.
- **Current state**: `backend/prisma/schema.prisma` `AuditAction` enum lacks `TENANT_CREATE`/`USER_CREATE`. `backend/prisma/seed-admin-rbac.ts` defines `admin.tenant:{view,edit,approve,export}` and platform `admin.user:*` but no `admin.tenant:create` nor any `admin.tenant-user:*`.
- **Target outcome**: Additive migration adds the two audit values; seed adds new permission codes with Vietnamese labels and grants them to SUPER_ADMIN/SALER only. No existing grant weakened.

## Constraints

- **MUST**: Keep changes additive; the enum migration MUST be a standalone migration deployed before app code emits the new actions (Postgres `ALTER TYPE ... ADD VALUE` is non-transactional).
- **SHOULD**: Add Vietnamese labels consistent with existing catalog wording (e.g. "Tạo cửa hàng", "Xem người dùng cửa hàng").
- **MUST NOT**: Remove or rename existing `AuditAction` values or existing permission codes/grants.
- **SCOPE**: Implement only the behavior mapped to R4 and the approved `scope_lock`; do not add out-of-scope features or leave scoped acceptance criteria unwired.

## Steps

- [x] 1. Add `TENANT_CREATE` and `USER_CREATE` to the `AuditAction` enum in `backend/prisma/schema.prisma` and generate a dedicated additive migration under `backend/prisma/migrations/`.
  - Business intent: allow provisioning flows to write auditable rows.
  - Code detail: separate statements `ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TENANT_CREATE';` and `... 'USER_CREATE';`; run `pnpm prisma:generate`.
  - _Requirements: 4.1_

- [x] 2. Extend `backend/prisma/seed-admin-rbac.ts` with permission codes `admin.tenant:create` and `admin.tenant-user:{view, manage}` (+ VN labels) and grants: SUPER_ADMIN (all three), SALER (all three). No SUPPORT grant (out of scope).
  - Business intent: gate the new APIs and give onboarding roles the right access.
  - Code detail: reuse the existing label map + role-grant arrays; idempotent upsert; do not touch existing grants. `manage` covers create/edit/role-change/deactivate/reactivate/reset-password.
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 3. Verification implementation
  - Run migration + generate + seed against the E2E database; assert new enum values and permission rows exist and existing ones are intact.
  - _Requirements: 4.1, 4.4_

## Requirements

- 4.1 — additive `TENANT_CREATE`/`USER_CREATE` audit enum values, deployed before emitting code
- 4.2 — new permission codes (`admin.tenant:create`, `admin.tenant-user:{view, manage}`) + Vietnamese labels
- 4.3 — grants to SUPER_ADMIN/SALER only (no SUPPORT)
- 4.4 — additive, no weakening of existing permissions/audit values

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Add two `AuditAction` enum values |
| `backend/prisma/seed-admin-rbac.ts` | Modify | New permission codes, labels, and role grants |
| `backend/prisma/migrations` | Create | New additive migration folder for the enum values |

## Completion Criteria

- [x] `AuditAction` contains `TENANT_CREATE` and `USER_CREATE`; migration applies cleanly on a fresh DB.
- [x] Seed inserts `admin.tenant:create`, `admin.tenant-user:view`, `admin.tenant-user:manage` with VN labels and grants to SUPER_ADMIN/SALER only.
- [x] Re-running seed is idempotent and existing permissions/grants are unchanged.
- [x] No orphaned artifacts; downstream tasks (R1-01, R2-01) can reference the new codes/actions.

## Evidence

- [x] Automated verification
  - Command(s): `cd backend && pnpm prisma:generate && pnpm build`
  - Expected proof: Prisma client types include new enum values; build passes.
- [x] Artifact / runtime verification
  - Inspect: generated migration SQL + `seed-admin-rbac.ts` diff; run `pnpm prisma migrate deploy` + seed on E2E DB.
  - Expect: `SELECT unnest(enum_range(NULL::"AuditAction"))` includes the two values; permission rows present.
- [x] Runtime reachability verification
  - Entrypoint/caller: consumed by `TenantsService.create` (R1-01) and `TenantUsersService` (R2-01) via `@RequirePermission` and `AuditLogger`.
  - Expect: new codes/actions referenced by later tasks; not orphaned.
- [x] Contract / negative-path verification
  - Check: re-run seed twice; attempt to reference a non-existent permission.
  - Expect: idempotent, no duplicate rows; existing grants intact.

### Verification Receipt (2026-07-19)

Fresh run from `backend/`:

```
$ pnpm prisma:generate
Generated Prisma Client (v7.8.0) ... in <1s
GEN_EXIT=0  → PASS

$ pnpm build
tsc -p tsconfig.build.json ... done
BUILD_EXIT=0  → PASS

$ pnpm exec prisma migrate deploy
Applying migration `20260719000500_tenant_provisioning_audit_actions`
All migrations have been successfully applied.
DEPLOY_EXIT=0  → PASS

$ pnpm db:seed:rbac
[seed-admin-rbac] Permission rows with admin. prefix: 33 (expected 33)
[seed-admin-rbac] System roles ...: 4 (expected 4)
SEED_EXIT=0  → PASS

$ pnpm db:seed:rbac   # idempotent re-run
[seed-admin-rbac] Permission rows with admin. prefix: 33 (expected 33)
[seed-admin-rbac] System roles ...: 4 (expected 4)
SEED2_EXIT=0  → PASS (unchanged)
```

DB assertions (raw SQL against E2E DB `nomogreen`):

```
ENUM TENANT_CREATE=true USER_CREATE=true
NEW PERMS: admin.tenant-user:manage="Quản lý người dùng cửa hàng",
           admin.tenant-user:view="Xem người dùng cửa hàng",
           admin.tenant:create="Tạo cửa hàng"
SALER GRANTS: ["admin.tenant-user:manage","admin.tenant-user:view","admin.tenant:create"]
EXISTING tenant perms intact count=4 (expect 4)
SUPER_ADMIN materialized grant rows=0 (expect 0)
```

Lint: `pnpm exec biome check prisma/seed-admin-rbac.ts prisma/schema.prisma` → exit 0, no fixes.

Code review: `code-auditor` verdict **PASS**, zero critical; two non-blocking minor notes (redundant `EXCEPTION` handler already covered by `IF NOT EXISTS`; enum appended at DB tail vs mid-list declaration — Prisma matches by label, no drift).

Outcome: all commands PASS; enum + permission codes + SALER grants present and additive; SUPER_ADMIN intentionally not materialized (guard-shortcut); existing grants intact; re-seed idempotent. R0-01 done.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Enum add inside a transactional migration fails on Postgres | High | Standalone additive migration, `ADD VALUE IF NOT EXISTS`, deploy before app code |
| Accidentally dropping existing grants | Medium | Idempotent upsert; diff review; re-run seed test |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
