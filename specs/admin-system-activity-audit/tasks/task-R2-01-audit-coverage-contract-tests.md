# Task R2-01: Audit coverage and contract tests

**Requirement:** R2 — Access, privacy, coverage, and performance verification
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** tasks/task-R0-01-schema-permission-foundation.md, tasks/task-R1-01-audit-query-api.md, tasks/task-R1-02-audit-detail-sanitization.md
**Spec:** specs/admin-system-activity-audit/

## Context

- **Why**: The activity screen is only trustworthy if the API exposes the existing action vocabulary and preserves existing write semantics.
- **Current state**: `AuditAction` is an enum in Prisma; writes are distributed across auth, admin-users, roles, tenants, billing, and provisioning specs.
- **Target outcome**: Contract tests prove action compatibility, permission denial, query performance bounds, and coordination with provisioning.

## Constraints

- **MUST**: Test every current enum value is serializable/displayable and `TENANT_CREATE`/`USER_CREATE` remain compatible with `admin-tenant-provisioning`.
- **SHOULD**: Use a 100,000-row fixture or deterministic query-plan fixture for the 500ms first-page acceptance target.
- **MUST NOT**: Duplicate provisioning mutation implementation or weaken same-transaction audit tests.
- **SCOPE**: Verification and small compatibility fixes only.

## Steps

- [x] 1. Add/extend backend audit contract tests covering enum catalog, list/detail shape, permission denial, masking, and standard errors.
  - _Requirements: 2.2, 3.1, 3.2, 3.3, 7.1, 7.3_
- [x] 2. Add a bounded performance/plan acceptance fixture for 100,000 audit rows and 20-row first page; record Node/PostgreSQL versions and treat an unavailable benchmark environment as an explicit blocker.
  - _Requirements: 6.1, 6.2, 6.3_
- [x] 3. Verify no existing auth/admin/tenant/billing audit tests regress; record any shared migration/seed coordination note.
  - _Requirements: 3.2, 3.3, 7.3_

## Requirements

- 2.2 — Unauthorized requests return no rows.
- 3.1, 3.2, 3.3 — Action compatibility and transaction/coordination guarantees.
- 6.1, 6.2, 6.3 — Performance and bounded query behavior.
- 7.1, 7.3 — Failure and regression verification.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/audit/audit-query.service.spec.ts` | Modify | Contract/filter/performance assertions |
| `backend/src/platform/audit/audit-logger.service.spec.ts` | Read | Preserve write transaction tests |
| `backend/src/platform/auth/auth.service.spec.ts` | Read | Existing login/logout/reuse audit coverage |
| `backend/src/platform/billing/billing-foundation.spec.ts` | Read/Modify | Action catalog compatibility |
| `backend/test/admin-audit.e2e-spec.ts` | Create/Modify | HTTP acceptance fixture if needed |
| `specs/admin-tenant-provisioning/spec.json` | Read | Coordination-only relation |

## Completion Criteria

- [x] Current `AuditAction` values, including provisioning values, are accepted by the read/display contract.
- [x] 401/403, 400, 404, masking, DB failure, and transaction regression tests pass.
- [x] The performance fixture proves a 20-row first page in <=500ms at the service boundary.

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir backend test -- --runInBand audit`; `pnpm --dir backend test:e2e -- --runInBand`
  - Expected proof: audit contract and relevant E2E suites pass.
- [x] Artifact / runtime verification
  - Inspect: test fixture/report and Prisma query plan where available.
  - Expect: bounded `take`, stable order, no all-row materialization.
- [x] Runtime reachability verification
  - Entrypoint/caller: backend audit routes exercised through Nest HTTP test.
  - Expect: real controller/service path, not mocked-only proof for auth boundary.
- [x] Contract / negative-path verification
  - Check: all enum values and provisioning coordination.
  - Expect: no duplicate mutation logic and no removed enum/grant.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Performance target cannot be reproduced locally | Medium | Use deterministic fixture and report environment/plan evidence |
| Parallel spec changes shared seed/migration | High | Keep additive commits and rebase/merge contract checks |

## Verification Receipt

- 2026-07-19: audit unit contract run passed: 4 suites / 20 tests; backend build and Biome passed. The contract covers all current `AuditAction` values, sanitizer behavior, standard 400/404/500 mapping, and guard metadata/401/403 behavior.
- Added opt-in real HTTP fixture at `backend/test/admin-audit.e2e-spec.ts` (`RUN_ADMIN_AUDIT_E2E=1`) with authenticated list/detail, negative paths, masking, and 100,000 rows.
- Blocker resolved: importing `AuthModule` into `AuditModule` restored the Redis-backed guard lifecycle.
- 2026-07-20 fresh acceptance receipt: audit unit `4 suites / 20 tests` PASS; backend build PASS; real `admin-audit.e2e-spec.ts` `3/3` PASS; PostgreSQL 16 + Redis 7 fixture with 100,000 rows and page size 20 reported p95 `36.36ms` at Node `v22.20.0` (service-boundary p95 `51.46ms`). Auth, 401/403, 400, 404, masking, detail, stable ordering, bounded page size, and route reachability passed.
- Compatibility fix: `backend/src/platform/audit/audit.module.ts` imports `AuthModule`; this is the only implementation scope escape and does not bypass guards or alter permissions.
- Regression unit set: `12 suites / 108 tests` PASS. Code review: `9.7/10`, zero critical issues.
- Full repository E2E is intentionally deferred by user request; audit-specific HTTP E2E is PASS (3/3). The pre-existing `auth-login.e2e-spec.ts` SameSite mismatch remains outside this task and is deferred to R4/release verification.
