# Task R0-01-audit-vocabulary-and-contract: Audit vocabulary and tenant event contract

**Requirement:** R1 — Tenant audit vocabulary and event contract
**Status:** done
**Priority:** P1
**Estimated Effort:** 1 day
**Dependencies:** none
**Spec:** specs/tenant-business-audit-coverage/

## Context
- **Why**: Close the approved tenant audit coverage slice.
- **Current state**: Existing AuditLogger, domain transactions, guards, and colocated Jest specs are identified in research.md.
- **Target outcome**: Audit vocabulary and tenant event contract is wired, bounded, reachable, and tested.

## Constraints
- **MUST**: Preserve tenant scope, routes, errors, transactions, and approved scope_lock.
- **SHOULD**: Reuse AuditLogger.run/writeInTx and existing retry patterns.
- **MUST NOT**: Add UI, reports, retention, returns, global interceptor, async queue, or SIEM.
- **SCOPE**: Implement only R1 — Tenant audit vocabulary and event contract.

## Steps
- [x] 1. Add exactly the canonical tenant action set listed in requirements.md through an additive migration
  - Preserve legacy actions and rows
  - _Requirements: 1.1, 1.4_
- [x] 2. Validate actor/resource context and snapshot safety with a maximum of 100 identifiers or summaries
  - Reject invalid action/system actor misuse
  - _Requirements: 1.2, 1.3_
- [x] 3. Add enum/logger tests
  - Prove compatibility and sensitive-key handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

## Requirements
- 1.1 Stable actions
- 1.2 Actor/resource context
- 1.3 Bounded snapshots
- 1.4 Additive migration

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/prisma/schema.prisma | Modify | AuditAction and AuditLog |
| backend/prisma/migrations/ | Create | Additive migration |
| backend/src/platform/audit/audit-logger.service.ts | Modify | Input validation |
| backend/src/platform/audit/audit-logger.service.spec.ts | Modify | Logger tests |

## Completion Criteria
- [x] 1.1 Stable actions
- [x] 1.2 Actor/resource context
- [x] 1.3 Bounded snapshots
- [x] No orphaned provider, route, migration, or audit path remains.

## Evidence
- [x] Automated verification
  - Command(s): pnpm --dir backend test --runInBand --runTestsByPath backend/src/platform/audit/audit-logger.service.spec.ts; pnpm --dir backend exec prisma validate
  - Expected proof: focused tests/build/schema checks pass with counts recorded.
- [x] Artifact / runtime verification
  - Inspect: backend/prisma/schema.prisma, backend/prisma/migrations/, backend/src/platform/audit/audit-logger.service.ts, backend/src/platform/audit/audit-logger.service.spec.ts
  - Expect: backend/src/platform/audit/audit.module.ts exports AuditLogger
- [x] Runtime reachability verification
  - Entrypoint/caller: backend/src/platform/audit/audit.module.ts exports AuditLogger
  - Expect: the audit behavior is registered and invoked from the existing runtime path.
- [x] Contract / negative-path verification
  - Check: invalid action, SYSTEM actor, sensitive snapshot keys
  - Expect: existing denial/rollback/isolation behavior is preserved and no unsafe row is written.

### Verification receipt
- `pnpm --dir backend test --runInBand --runTestsByPath src/platform/audit/audit-logger.service.spec.ts` — PASS, 10 tests.
- `pnpm --dir backend exec prisma validate` — PASS.
- `pnpm --dir backend build` — PASS.
- `git diff --check` — PASS.
- Note: the task command with `backend/src/...` was invalid under `--dir backend`; the equivalent corrected path above was executed.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Enum migration/client drift | High | Focused tests, build, and transaction-preserving implementation. |
| Sensitive or foreign-tenant payload | High | Allow-list snapshots and negative-path assertions. |
