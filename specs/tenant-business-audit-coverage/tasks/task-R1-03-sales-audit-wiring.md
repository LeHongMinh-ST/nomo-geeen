# Task R1-03-sales-audit-wiring: Sales audit wiring

**Requirement:** R5 — Sales audit coverage
**Status:** done
**Priority:** P1
**Estimated Effort:** 1 day
**Dependencies:** tasks/task-R0-01-audit-vocabulary-and-contract.md, tasks/task-R0-02-audit-context-boundary.md
**Spec:** specs/tenant-business-audit-coverage/

## Context
- **Why**: Close the approved tenant audit coverage slice.
- **Current state**: Existing AuditLogger, domain transactions, guards, and colocated Jest specs are identified in research.md.
- **Target outcome**: Sales audit wiring is wired, bounded, reachable, and tested.

## Constraints
- **MUST**: Preserve tenant scope, routes, errors, transactions, and approved scope_lock.
- **SHOULD**: Reuse AuditLogger.run/writeInTx and existing retry patterns.
- **MUST NOT**: Add UI, reports, retention, returns, global interceptor, async queue, or SIEM.
- **SCOPE**: Implement only R5 — Sales audit coverage.

## Steps
- [x] 1. Wire order and quick-sale success events
  - Only committed transitions
  - _Requirements: 5.1, 2.1_
- [x] 2. Add settlement/stock/debt summaries
  - No raw payment/unbounded lines; cap identifier/summary arrays at 100
  - _Requirements: 5.2, 9.2, 10.3_
- [x] 3. Test denial/stock/debt/tenant/rollback/replay
  - No duplicate success event
  - _Requirements: 5.3, 5.4, 2.2, 2.3, 2.4, 11.2_

## Requirements
- 5.1 Sale events
- 5.2 Safe effects
- 5.3 Denial
- 5.4 Replay

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/src/platform/sales/sales.service.ts | Modify | Order/quick-sale audit |
| backend/src/platform/sales/sales.service.spec.ts | Modify | Tests |
| backend/src/platform/sales/sales.controller.ts | Read/Modify | Context |
| backend/src/platform/sales/sales.module.ts | Modify | AuditModule |
| backend/src/platform/sales/sale-eligibility-policy.ts | Read | Existing gate |

## Completion Criteria
- [x] 5.1 Sale events
- [x] 5.2 Safe effects
- [x] 5.3 Denial
- [x] No orphaned provider, route, migration, or audit path remains.

## Evidence
- [x] Automated verification
  - Command(s): pnpm --dir backend test --runInBand --runTestsByPath backend/src/platform/sales/sales.service.spec.ts backend/src/platform/sales/sale-eligibility-policy.spec.ts
  - Expected proof: focused tests/build/schema checks pass with counts recorded.
- [x] Artifact / runtime verification
  - Inspect: backend/src/platform/sales/sales.service.ts, backend/src/platform/sales/sales.service.spec.ts, backend/src/platform/sales/sales.controller.ts, backend/src/platform/sales/sales.module.ts, backend/src/platform/sales/sale-eligibility-policy.ts
  - Expect: order and quick-sale routes
- [x] Runtime reachability verification
  - Entrypoint/caller: order and quick-sale routes
  - Expect: the audit behavior is registered and invoked from the existing runtime path.
- [x] Contract / negative-path verification
  - Check: locked/recalled/inactive/missing product, insufficient stock, foreign tenant, replay
  - Expect: existing denial/rollback/isolation behavior is preserved and no unsafe row is written.

### Verification receipt
- `pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sales.service.spec.ts src/platform/sales/sale-eligibility-policy.spec.ts` — PASS, 2 suites / 85 tests.
- `pnpm --dir backend build` — PASS.
- `git diff --check` — PASS.
- Runtime proof: SalesController reaches order create/complete/cancel and quick-sale transaction paths; committed success actions are written through the transaction client, while idempotent terminal replays return before another success event.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Replay duplication/payment leakage | High | Focused tests, build, and transaction-preserving implementation. |
| Sensitive or foreign-tenant payload | High | Allow-list snapshots and negative-path assertions. |
