# Task R1-04-stock-and-handbook-audit-wiring: Stock adjustment and Handbook audit wiring

**Requirement:** R6 — Stock-adjustment and handbook audit coverage
**Status:** done
**Priority:** P1
**Estimated Effort:** 1 day
**Dependencies:** tasks/task-R0-01-audit-vocabulary-and-contract.md, tasks/task-R0-02-audit-context-boundary.md
**Spec:** specs/tenant-business-audit-coverage/

## Context
- **Why**: Close the approved tenant audit coverage slice.
- **Current state**: Existing AuditLogger, domain transactions, guards, and colocated Jest specs are identified in research.md.
- **Target outcome**: Stock adjustment and Handbook audit wiring is wired, bounded, reachable, and tested.

## Constraints
- **MUST**: Preserve tenant scope, routes, errors, transactions, and approved scope_lock.
- **SHOULD**: Reuse AuditLogger.run/writeInTx and existing retry patterns.
- **MUST NOT**: Add UI, reports, retention, returns, global interceptor, async queue, or SIEM.
- **SCOPE**: Implement only R6 — Stock-adjustment and handbook audit coverage.

## Steps
- [x] 1. Wire adjustment draft/complete with reason/delta summary
  - Preserve stock/batch dual-write
  - _Requirements: 6.1, 2.1_
- [x] 2. Wire Handbook create/update with category metadata
  - No sale snapshot/UI
  - _Requirements: 6.2, 2.1_
- [x] 3. Test invalid reason/state/tenant/rollback/sensitive content
  - No success event on failure
  - _Requirements: 6.3, 2.2, 2.3, 9.2, 10.3_

## Requirements
- 6.1 Adjustment
- 6.2 Handbook
- 6.3 Failure

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/src/platform/stock-adjustments/stock-adjustments.service.ts | Modify | Adjustment audit |
| backend/src/platform/stock-adjustments/stock-adjustments.service.spec.ts | Modify | Tests |
| backend/src/platform/stock-adjustments/stock-adjustments.module.ts | Modify | AuditModule |
| backend/src/platform/handbook/handbook.service.ts | Modify | Handbook audit |
| backend/src/platform/handbook/handbook.service.spec.ts | Modify | Tests |
| backend/src/platform/handbook/handbook.module.ts | Modify | AuditModule |

## Completion Criteria
- [x] 6.1 Adjustment
- [x] 6.2 Handbook
- [x] 6.3 Failure
- [x] No orphaned provider, route, migration, or audit path remains.

## Evidence
- [x] Automated verification
  - Command(s): pnpm --dir backend test --runInBand --runTestsByPath backend/src/platform/stock-adjustments/stock-adjustments.service.spec.ts backend/src/platform/handbook/handbook.service.spec.ts
  - Expected proof: focused tests/build/schema checks pass with counts recorded.
- [x] Artifact / runtime verification
  - Inspect: backend/src/platform/stock-adjustments/stock-adjustments.service.ts, backend/src/platform/stock-adjustments/stock-adjustments.service.spec.ts, backend/src/platform/stock-adjustments/stock-adjustments.module.ts, backend/src/platform/handbook/handbook.service.ts, backend/src/platform/handbook/handbook.service.spec.ts, backend/src/platform/handbook/handbook.module.ts
  - Expect: adjustment and Handbook POST/PATCH routes
- [x] Runtime reachability verification
  - Entrypoint/caller: adjustment and Handbook POST/PATCH routes
  - Expect: the audit behavior is registered and invoked from the existing runtime path.
- [x] Contract / negative-path verification
  - Check: invalid reason, completed adjustment, foreign tenant, sensitive metadata
  - Expect: existing denial/rollback/isolation behavior is preserved and no unsafe row is written.

### Verification receipt
- `pnpm --dir backend test --runInBand --runTestsByPath src/platform/stock-adjustments/stock-adjustments.service.spec.ts src/platform/handbook/handbook.service.spec.ts` — PASS, 2 suites / 15 tests.
- `pnpm --dir backend build` — PASS.
- `pnpm --dir backend exec prisma validate` — PASS.
- `git diff --check` — PASS.
- Runtime proof: stock POST and POST :id/complete retain Serializable stock/batch dual-write and write stock audit actions in the same transaction; Handbook POST/PATCH write create/update actions in their existing transaction.
- Negative proof: invalid paths do not reach audit writes; audit failure rejects the mutation; snapshots omit note content and bound line summaries.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Stock dual-write/content leakage | High | Focused tests, build, and transaction-preserving implementation. |
| Sensitive or foreign-tenant payload | High | Allow-list snapshots and negative-path assertions. |
