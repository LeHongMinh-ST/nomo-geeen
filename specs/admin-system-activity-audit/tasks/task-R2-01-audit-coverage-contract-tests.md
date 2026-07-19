# Task R2-01: Audit coverage and contract tests

**Requirement:** R2 — Access, privacy, coverage, and performance verification
**Status:** in_progress
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
- [ ] 2. Add a bounded performance/plan acceptance fixture for 100,000 audit rows and 20-row first page; record Node/PostgreSQL versions and treat an unavailable benchmark environment as an explicit blocker.
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

- [ ] Current `AuditAction` values, including provisioning values, are accepted by the read/display contract.
- [ ] 401/403, 400, 404, masking, DB failure, and transaction regression tests pass.
- [ ] The performance fixture proves a 20-row first page in <=500ms at the service boundary or records a concrete blocker without claiming completion.

## Evidence

- [ ] Automated verification
  - Command(s): `pnpm --dir backend test -- --runInBand audit`; `pnpm --dir backend test:e2e -- --runInBand`
  - Expected proof: audit contract and relevant E2E suites pass.
- [ ] Artifact / runtime verification
  - Inspect: test fixture/report and Prisma query plan where available.
  - Expect: bounded `take`, stable order, no all-row materialization.
- [ ] Runtime reachability verification
  - Entrypoint/caller: backend audit routes exercised through Nest HTTP test.
  - Expect: real controller/service path, not mocked-only proof for auth boundary.
- [ ] Contract / negative-path verification
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
- Blocker: the opt-in HTTP run reached the route but failed closed with `503 Auth store unavailable` from `AccessTokenGuard` because the Jest process could not maintain the local Redis connection. The fixture is intentionally skipped by default to avoid mutating a developer DB. The <=500ms performance target and real authenticated HTTP receipt remain unproven.
