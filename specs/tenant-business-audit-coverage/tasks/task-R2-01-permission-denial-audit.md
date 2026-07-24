# Task R2-01-permission-denial-audit: Permission-denial audit

**Requirement:** R7 — Permission-denial audit coverage
**Status:** done
**Priority:** P1
**Estimated Effort:** 1 day
**Dependencies:** tasks/task-R0-01-audit-vocabulary-and-contract.md, tasks/task-R0-02-audit-context-boundary.md
**Spec:** specs/tenant-business-audit-coverage/

## Context
- **Why**: Close the approved tenant audit coverage slice.
- **Current state**: Existing AuditLogger, domain transactions, guards, and colocated Jest specs are identified in research.md.
- **Target outcome**: Permission-denial audit is wired, bounded, reachable, and tested.

## Constraints
- **MUST**: Preserve tenant scope, routes, errors, transactions, and approved scope_lock.
- **SHOULD**: Reuse AuditLogger.run/writeInTx and existing retry patterns.
- **MUST NOT**: Add UI, reports, retention, returns, global interceptor, async queue, or SIEM.
- **SCOPE**: Implement only R7 — Permission-denial audit coverage.

## Steps
- [x] 1. Add recursion-safe writer from verified identity
  - Bound route/permission context
  - _Requirements: 7.1, 7.3, 10.1_
- [x] 2. Emit one denial while preserving 401/403
  - No guarded writer path
  - _Requirements: 7.1, 7.3, 11.1_
- [x] 3. Test identity/grant/redaction/logger failure/foreign tenant
  - No bypass or sensitive row; if denial logging fails, preserve the original 403 and do not retry through TenantPermissionGuard
  - _Requirements: 7.2, 7.3, 10.3, 11.1_

## Requirements
- 7.1 Denial
- 7.2 Redaction
- 7.3 Safety

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/src/platform/auth/guards/tenant-permission.guard.ts | Modify | Denial path |
| backend/src/platform/auth/guards/tenant-permission.guard.spec.ts | Modify | Tests |
| backend/src/platform/audit/audit-logger.service.ts | Read/Modify | Safe writer |
| backend/src/platform/audit/audit.module.ts | Modify | Boundary |
| backend/src/app.module.ts | Read | Composition |

## Completion Criteria
- [x] 7.1 Denial
- [x] 7.2 Redaction
- [x] 7.3 Safety
- [x] No orphaned provider, route, migration, or audit path remains.

## Evidence
- [x] Automated verification
  - Command(s): pnpm --dir backend test --runInBand --runTestsByPath backend/src/platform/auth/guards/tenant-permission.guard.spec.ts
  - Expected proof: focused tests/build/schema checks pass with counts recorded.
- [x] Artifact / runtime verification
  - Inspect: backend/src/platform/auth/guards/tenant-permission.guard.ts, backend/src/platform/auth/guards/tenant-permission.guard.spec.ts, backend/src/platform/audit/audit-logger.service.ts, backend/src/platform/audit/audit.module.ts, backend/src/app.module.ts
  - Expect: all tenant controllers using TenantPermissionGuard
- [x] Runtime reachability verification
  - Entrypoint/caller: all tenant controllers using TenantPermissionGuard
  - Expect: the audit behavior is registered and invoked from the existing runtime path.
- [x] Contract / negative-path verification
  - Check: no identity, foreign token, missing grant, audit DB failure
  - Expect: existing denial/rollback/isolation behavior is preserved and no unsafe row is written.

### Verification receipt
- `pnpm --dir backend test --runInBand --runTestsByPath src/platform/auth/guards/tenant-permission.guard.spec.ts` — PASS, 1 suite / 5 tests.
- `pnpm --dir backend build` — PASS.
- `pnpm --dir backend exec prisma validate` — PASS.
- `git diff --check` — PASS.
- Runtime proof: AppModule imports AuthModule and AuditModule; AuthModule registers TenantPermissionGuard and imports AuditModule through forwardRef; tenant controllers reach the guard before protected handlers.
- Negative proof: missing identity/user preserves 401 without audit; missing grant writes one bounded PERMISSION_DENIED event; logger failure preserves 403 and does not recurse through the guard.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Guard recursion/authorization drift | High | Focused tests, build, and transaction-preserving implementation. |
| Sensitive or foreign-tenant payload | High | Allow-list snapshots and negative-path assertions. |
