# Task R1-01: Debt domain API

**Requirement:** R1, R2, R3
**Status:** done
**Priority:** P0
**Estimated Effort:** 10–14 hours
**Dependencies:** tasks/task-R0-01-debt-contract-foundation.md
**Spec:** specs/tenant-debt-management/
**Contracts:** DEBT_API_V1

## Context
- **Why**: Users need authoritative debt books and receipt/payment mutations.
- **Current state**: Sales and purchases create INCREASE entries; debt query/mutation coverage is incomplete.
- **Target outcome**: guarded list/detail/voucher routes work for both directions.

## Constraints
- **MUST**: use one Prisma transaction and token-derived tenant.
- **SHOULD**: follow customers, suppliers, sales, and purchases patterns.
- **MUST NOT**: trust client balances or permit overpayment.
- **SCOPE**: backend debt module and direct unit/controller tests.

## Steps
- [x] Implement validated debt DTOs and direction mapping. _Requirements: 1.2, 2.3, 2.4_
- [x] Implement tenant-filtered list/detail and JSON-safe DebtLedger/PaymentVoucher mapping. _Requirements: 1.1, 1.3, 1.4_
- [x] Implement guarded voucher transaction: balance decrement, voucher, line, DECREASE ledger, replay, rollback. _Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 3.4_

## Requirements
- 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/src/platform/debts/debts.module.ts | Create/Modify | Module |
| backend/src/platform/debts/debts.controller.ts | Create/Modify | Guarded routes |
| backend/src/platform/debts/debts.service.ts | Create/Modify | Queries and transaction |
| backend/src/platform/debts/dto/debt.dto.ts | Create/Modify | DTOs |
| backend/src/platform/debts/debts.service.spec.ts | Create/Modify | Unit tests |
| backend/src/platform/debts/debts.controller.spec.ts | Create | Controller tests |
| backend/src/app.module.ts | Modify | Module registration |

## Completion Criteria
- [x] CUSTOMER and SUPPLIER list/detail return authoritative data.
- [x] Accepted receipt/payment creates exactly one voucher, line, and DECREASE ledger atomically.
- [x] Invalid, unauthorized, cross-tenant, overpayment, and replay paths leave no partial mutation. Replay equality compares partyType, partyId, voucherType, amount, method, occurredAt, and note.
- [x] DebtsModule is registered and routes are reachable.

## Evidence
- [x] Automated verification: debt unit suite 5/5 pass; pnpm --dir backend build pass.
- [x] Artifact verification: service reads tenant-scoped Customer/Supplier and maps PaymentVoucher lines and DebtLedger BigInt fields.
- [x] Runtime reachability verification: AppModule -> DebtsModule -> guarded DebtsController -> DebtsService -> PrismaService.
- [x] Contract/negative path: direction/overpayment/replay 422/409 unit cases pass; 403/tenant E2E is covered by R1-02.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Concurrent settlement | High | conditional update and transaction |
| Wrong party direction | High | DTO enum and invariant check |
| BigInt JSON failure | Medium | explicit response mapper |