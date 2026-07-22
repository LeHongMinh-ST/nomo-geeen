# Task R0-01: Debt contract foundation

**Requirement:** R0 — shared persistence and API contract
**Status:** done
**Priority:** P0
**Estimated Effort:** 4–6 hours
**Dependencies:** none
**Spec:** specs/tenant-debt-management/
**Contracts:** DEBT_API_V1

## Context
- **Why**: Financial operations need one stable replay-safe contract.
- **Current state**: DebtLedger and PaymentVoucher exist; no idempotency key exists.
- **Target outcome**: schema migration and permission contract are ready for API work.

## Constraints
- **MUST**: preserve existing balance and ledger semantics.
- **SHOULD**: reuse Prisma migration and permission conventions.
- **MUST NOT**: add general cash accounting.
- **SCOPE**: persistence and shared contract only.

## Steps
- [x] Add tenant-scoped PaymentVoucher idempotency key/index and migration. _Requirements: 3.1, 3.2_
- [x] Confirm debt:view and debt:collect seed/guard behavior. _Requirements: 3.3, 3.4_

## Requirements
- 3.1, 3.2, 3.3, 3.4

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/prisma/schema.prisma | Modify | PaymentVoucher replay key |
| backend/prisma/migrations/20260722102000_debt_idempotency/migration.sql | Create | Idempotency migration |
| backend/prisma/seed.ts | Read | Permission seed |
| backend/src/platform/auth/guards/tenant-permission.guard.ts | Read | Permission behavior |

## Completion Criteria
- [x] Prisma validates, isolated forward migration applies, and documented rollback SQL restores the prior schema.
- [x] Idempotency key is tenant-scoped and nullable behavior is documented.
- [x] Existing permission codes are confirmed.

## Evidence
- [x] Automated verification: prisma validate, isolated migrate deploy on temporary database (exit 0), and backend build (exit 0).
- [x] Artifact verification: schema has nullable PaymentVoucher.idempotencyKey and tenant compound unique; migration contains rollback SQL; design contract names DEBT_API_V1.
- [x] Runtime reachability verification: AppModule registers DebtsModule; controller uses existing tenant access and permission guards.
- [x] Contract/negative path: tenant-scoped unique index provides same-tenant conflict and cross-tenant independence; API conflict behavior is completed in R1.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Migration conflict | High | isolated deploy and rollback SQL |
| Duplicate replay semantics | High | unique tenant key and payload comparison |