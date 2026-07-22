# Task R1-02: Debt transaction and acceptance tests

**Requirement:** R2, R3, R5
**Status:** done
**Priority:** P0
**Estimated Effort:** 8–12 hours
**Dependencies:** tasks/task-R1-01-debt-domain-api.md
**Spec:** specs/tenant-debt-management/
**Contracts:** DEBT_API_V1

## Context
- **Why**: Financial mutations require persisted-state proof.
- **Current state**: Unit coverage exists, but debt E2E and rollback/replay proof are absent.
- **Target outcome**: isolated PostgreSQL tests cover both directions and failures.

## Constraints
- **MUST**: use real Prisma/PostgreSQL state for E2E.
- **SHOULD**: follow existing sales/purchases E2E fixtures.
- **MUST NOT**: weaken existing tests or use fake persistence as E2E proof.
- **SCOPE**: debt tests and fixtures only.

## Steps
- [x] Add service/controller tests for success, validation, authorization, and replay. _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3_
- [x] Add backend/test/tenant-debts.e2e-spec.ts for both parties, history, isolation, and rollback. _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.5, 3.4, 5.1_
- [x] Add 1,000-party list performance evidence. _Requirements: 5.2, 5.3_

## Requirements
- 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/src/platform/debts/debts.service.spec.ts | Modify | Domain tests |
| backend/src/platform/debts/debts.controller.spec.ts | Modify | Permission tests |
| backend/test/tenant-debts.e2e-spec.ts | Create | Isolated DB acceptance |
| backend/test/tenant-sales.e2e-spec.ts | Read | Fixture pattern |
| backend/test/tenant-purchases.e2e-spec.ts | Read | Fixture/rollback pattern |

## Completion Criteria
- [x] Forced failure leaves no balance, voucher, line, or ledger mutation.
- [x] Equivalent replay creates one result; conflicting replay returns 409.
- [x] Both directions, permissions, and tenant isolation pass.
- [x] Performance result is recorded as p95 over at least 30 warm requests against 1,000 parties with pageSize 20, including database/runtime details.

## Evidence
- [x] Automated verification: pnpm --dir backend exec jest --runInBand debts; pnpm --dir backend test:e2e -- --runInBand tenant-debts.e2e-spec.ts.
- [x] Artifact verification: inspect isolated Customer/Supplier and financial rows.
- [x] Runtime reachability verification: HTTP E2E traverses AppModule, guards, controller, service, and Prisma.
- [x] Contract/negative path: invalid method, overpayment, replay, tenant, permission, and rollback.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Shared DB contamination | High | isolated database and deterministic cleanup |
| Flaky latency | Medium | warm-up and fixed fixture |