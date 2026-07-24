# Task R0-02-audit-context-boundary: Audit context and transactional boundary

**Requirement:** R2 — Transactional audit boundary
**Status:** done
**Priority:** P1
**Estimated Effort:** 1 day
**Dependencies:** tasks/task-R0-01-audit-vocabulary-and-contract.md
**Spec:** specs/tenant-business-audit-coverage/

## Context
- **Why**: Close the approved tenant audit coverage slice.
- **Current state**: Existing AuditLogger, domain transactions, guards, and colocated Jest specs are identified in research.md.
- **Target outcome**: Audit context and transactional boundary is wired, bounded, reachable, and tested.

## Constraints
- **MUST**: Preserve tenant scope, routes, errors, transactions, and approved scope_lock.
- **SHOULD**: Reuse AuditLogger.run/writeInTx and existing retry patterns.
- **MUST NOT**: Add UI, reports, retention, returns, global interceptor, async queue, or SIEM.
- **SCOPE**: Implement only R2 — Transactional audit boundary.

## Steps
- [x] 1. Define context from verified request identity and server metadata
  - No client audit identity
  - _Requirements: 2.1, 10.1_
- [x] 2. Wire AuditModule imports and preserve transaction helpers
  - No global interceptor or queue; preserve the existing AuthModule/AuditModule forwardRef cycle and prove AppModule compilation
  - _Requirements: 2.1, 2.3_
- [x] 3. Test rollback/logger failure/replay
  - Existing responses remain stable
  - _Requirements: 2.2, 2.3, 2.4, 11.1, 11.2_

## Requirements
- 2.1 Same-tx audit
- 2.2 Rollback
- 2.3 Logger fail closed
- 2.4 Replay
- 10.1 Verified identity

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/src/platform/audit/audit-logger.service.ts | Modify | Shared boundary |
| backend/src/platform/audit/audit.module.ts | Modify | Exports |
| backend/src/platform/products/products.module.ts | Modify | Module wiring |
| backend/src/platform/purchases/purchases.module.ts | Modify | Module wiring |
| backend/src/platform/sales/sales.module.ts | Modify | Module wiring |
| backend/src/platform/stock-adjustments/stock-adjustments.module.ts | Modify | Module wiring |
| backend/src/platform/handbook/handbook.module.ts | Modify | Module wiring |
| backend/src/platform/auth/guards/tenant-permission.guard.ts | Read/Modify | Verified context |

## Completion Criteria
- [x] 2.1 Same-tx audit
- [x] 2.2 Rollback
- [x] 2.3 Logger fail closed
- [x] No orphaned provider, route, migration, or audit path remains.

## Evidence
- [x] Automated verification
  - Command(s): pnpm --dir backend build; focused target service/guard tests
  - Expected proof: focused tests/build/schema checks pass with counts recorded.
- [x] Artifact / runtime verification
  - Inspect: backend/src/platform/audit/audit-logger.service.ts, backend/src/platform/audit/audit.module.ts, backend/src/platform/products/products.module.ts, backend/src/platform/purchases/purchases.module.ts, backend/src/platform/sales/sales.module.ts, backend/src/platform/stock-adjustments/stock-adjustments.module.ts, backend/src/platform/handbook/handbook.module.ts, backend/src/platform/auth/guards/tenant-permission.guard.ts
  - Expect: backend/src/app.module.ts composes target modules
- [x] Runtime reachability verification
  - Entrypoint/caller: backend/src/app.module.ts composes target modules
  - Expect: the audit behavior is registered and invoked from the existing runtime path.
- [x] Contract / negative-path verification
  - Check: audit insert failure, forged actor context, replay
  - Expect: existing denial/rollback/isolation behavior is preserved and no unsafe row is written.

### Verification receipt
- `pnpm --dir backend build` — PASS.
- `pnpm --dir backend test --runInBand --runTestsByPath src/platform/audit/audit-logger.service.spec.ts src/platform/auth/guards/tenant-permission.guard.spec.ts` — PASS, 2 suites / 13 tests.
- `pnpm --dir backend exec prisma validate` — PASS.
- `git diff --check` — PASS.
- Runtime proof: AppModule compiles with AuditModule wired into products, purchases, sales, stock-adjustments, and handbook modules; AuthModule/AuditModule forwardRef remains intact.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Nest circular dependency | High | Focused tests, build, and transaction-preserving implementation. |
| Sensitive or foreign-tenant payload | High | Allow-list snapshots and negative-path assertions. |
