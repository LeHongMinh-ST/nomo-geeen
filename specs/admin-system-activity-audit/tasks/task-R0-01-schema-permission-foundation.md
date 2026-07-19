# Task R0-01: Schema and permission foundation

**Requirement:** R0 — Shared audit query foundation
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** none
**Spec:** specs/admin-system-activity-audit/

## Context

- **Why**: The existing `AuditLog` write model has no dedicated viewer permission or proven global newest-first query index.
- **Current state**: `backend/prisma/schema.prisma`, `backend/prisma/seed-admin-rbac.ts`, and `backend/src/app.module.ts` expose the existing audit write module.
- **Target outcome**: The database/RBAC foundation supports guarded audit reads without removing existing enum values or grants.

## Constraints

- **MUST**: Add `admin.audit:view` through the existing additive RBAC seed/catalog path and grant it only to intended platform admin roles according to current RBAC conventions.
- **SHOULD**: Add only an additive `createdAt` index when query-plan evidence shows existing indexes are insufficient.
- **MUST NOT**: Remove/rename existing `AuditAction` values, weaken existing permissions, or add tenant-user access to platform audit data.
- **SCOPE**: Foundation only; query behavior belongs to R1 tasks.

## Steps

- [x] 1. Update `backend/prisma/seed-admin-rbac.ts` with `admin.audit:view`, Vietnamese label/group metadata, and role grants.
  - _Requirements: 2.1, 3.1_
- [x] 2. Inspect the audit query/index baseline; defer additive migration because R1 query shape and EXPLAIN fixture do not exist yet.
  - _Requirements: 6.3_
- [x] 3. Keep `AuditModule` export/import wiring compatible and add foundation tests for seed/catalog/index expectations.
  - _Requirements: 3.2, 7.3_

## Requirements

- 2.1 — Audit endpoints use explicit `admin.audit:view` permission.
- 3.1 — Current `AuditAction` values remain displayable.
- 3.2 — Existing transactional audit guarantees are preserved.
- 6.3 — Query ordering/filtering is index-aware.
- 7.3 — Foundation is covered by automated checks.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Audit indexes/enums remain additive and compatible |
| `backend/prisma/seed-admin-rbac.ts` | Modify | Permission catalog, labels, and role grants |
| `backend/prisma/migrations/20260719000600_admin_audit_query_index/migration.sql` | Create | Additive index migration only if justified |
| `backend/src/platform/audit/audit.module.ts` | Read/Modify | Preserve exported audit boundary |
| `backend/src/platform/billing/billing-foundation.spec.ts` | Modify | Extend foundation assertions if shared enum/catalog assertions need coverage |

## Completion Criteria

- [x] `admin.audit:view` is seeded idempotently and appears in the permission catalog with a Vietnamese label; existing unrelated role grants are not reconciled.
- [x] Existing audit enum values and role grants remain intact; no index migration is needed before R1 query evidence.
- [x] Foundation tests pass and no audit write path is changed to bypass transaction behavior.

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir backend test -- --runInBand`; `pnpm --dir backend build`
  - Expected proof: exit 0; seed/schema assertions pass.
- [x] Artifact / runtime verification
  - Inspect: `backend/prisma/schema.prisma`, `backend/prisma/seed-admin-rbac.ts`, migration SQL.
  - Expect: permission and any index are additive; audit enum values are unchanged.
- [x] Runtime reachability verification
  - Entrypoint/caller: `backend/src/app.module.ts` → `AuditModule`.
  - Expect: query tasks can import the same exported module without duplicate module registration.
- [x] Contract / negative-path verification
  - Check: permission catalog/role seed and unauthorized audit request fixture.
  - Expect: only intended admin roles receive `admin.audit:view`.

### Verification receipt

- `pnpm --dir backend test -- --runInBand`: command wrapper forwards an extra `--`, so Jest reports `No tests found`; repo script equivalent executed as `pnpm --dir backend test --runInBand` with `17 suites / 136 tests` passing outside the sandbox where Docker Redis is reachable.
- `pnpm --dir backend build`: PASS.
- `pnpm --dir backend test --runInBand billing-foundation`: PASS, `1 suite / 7 tests`.
- Artifact inspection: `admin.audit:view` catalog/label/group path, SALER grant, non-destructive role seeding, unchanged `AuditAction` vocabulary, unchanged `AuditModule`/`AppModule` boundary, and existing audit transaction tests verified.
- Index decision: no migration added; current R0 has no audit query shape to justify a global `createdAt` index. R1 owns query-plan/EXPLAIN evidence.
- Quality review: spec findings resolved; no critical scope issue. Full test/build proof recorded above.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Permission accidentally granted too broadly | High | Assert role-specific seed output and 403 tests |
| Migration conflicts with provisioning spec | Medium | Keep migration additive and coordinate shared Prisma files |

---

> **Parallel marker**: This task may run with frontend-only discovery, but API tasks depend on its permission contract.
