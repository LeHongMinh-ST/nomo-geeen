# Task R1-02-purchase-audit-wiring: Purchase audit wiring

**Requirement:** R4 — Purchase audit coverage
**Status:** done
**Priority:** P1
**Estimated Effort:** 1 day
**Dependencies:** tasks/task-R0-01-audit-vocabulary-and-contract.md, tasks/task-R0-02-audit-context-boundary.md
**Spec:** specs/tenant-business-audit-coverage/

## Context
- **Why**: Close the approved tenant audit coverage slice.
- **Current state**: Existing AuditLogger, domain transactions, guards, and colocated Jest specs are identified in research.md.
- **Target outcome**: Purchase audit wiring is wired, bounded, reachable, and tested.

## Constraints
- **MUST**: Preserve tenant scope, routes, errors, transactions, and approved scope_lock.
- **SHOULD**: Reuse AuditLogger.run/writeInTx and existing retry patterns.
- **MUST NOT**: Add UI, reports, retention, returns, global interceptor, async queue, or SIEM.
- **SCOPE**: Implement only R4 — Purchase audit coverage.

## Steps
- [x] 1. Wire create/update/complete/cancel
  - Keep batch and Serializable behavior
  - _Requirements: 4.1, 2.1_
- [x] 2. Add bounded purchase/batch summary
  - No unrestricted payload; cap identifier/summary arrays at 100
  - _Requirements: 4.2, 4.3, 9.2, 10.3_
- [x] 3. Test invalid batch/tenant/rollback/replay
  - Rejected paths have no success event
  - _Requirements: 4.3, 2.2, 2.3, 2.4, 11.2_

## Requirements
- 4.1 Lifecycle
- 4.2 Bounded context
- 4.3 Failure no success

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/src/platform/purchases/purchases.service.ts | Modify | Lifecycle audit |
| backend/src/platform/purchases/purchases.service.spec.ts | Modify | Tests |
| backend/src/platform/purchases/purchases.controller.ts | Read/Modify | Context |
| backend/src/platform/purchases/purchases.module.ts | Modify | AuditModule |

## Completion Criteria
- [x] 4.1 Lifecycle
- [x] 4.2 Bounded context
- [x] 4.3 Failure no success
- [x] No orphaned provider, route, migration, or audit path remains.

## Evidence
- [x] Automated verification
  - Command(s): pnpm --dir backend test --runInBand --runTestsByPath backend/src/platform/purchases/purchases.service.spec.ts
  - Expected proof: focused tests/build/schema checks pass with counts recorded.
- [x] Artifact / runtime verification
  - Inspect: backend/src/platform/purchases/purchases.service.ts, backend/src/platform/purchases/purchases.service.spec.ts, backend/src/platform/purchases/purchases.controller.ts, backend/src/platform/purchases/purchases.module.ts
  - Expect: purchase routes including complete/cancel
- [x] Runtime reachability verification
  - Entrypoint/caller: purchase routes including complete/cancel
  - Expect: the audit behavior is registered and invoked from the existing runtime path.
- [x] Contract / negative-path verification
  - Check: expired/recalled/BATCH_REQUIRED/foreign tenant/logger failure/replay
  - Expect: existing denial/rollback/isolation behavior is preserved and no unsafe row is written.

### Verification receipt
- `pnpm --dir backend test --runInBand --runTestsByPath src/platform/purchases/purchases.service.spec.ts` — PASS, 9 tests.
- `pnpm --dir backend build` — PASS.
- `git diff --check` — PASS.
- Runtime proof: PurchasesController passes verified user id; create/update/complete/cancel write lifecycle actions through existing transaction clients. Serializable completion replay remains unchanged and terminal replay returns before a second completion audit.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Batch/retry event divergence | High | Focused tests, build, and transaction-preserving implementation. |
| Sensitive or foreign-tenant payload | High | Allow-list snapshots and negative-path assertions. |
