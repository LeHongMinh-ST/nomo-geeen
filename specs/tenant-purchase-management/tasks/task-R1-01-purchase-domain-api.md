# Task R1-01: Purchase domain API

**Requirement:** R1 — transactional purchase lifecycle
**Status:** done
**Priority:** P0
**Estimated Effort:** 10–14 hours
**Dependencies:** tasks/task-R0-01-purchase-contract-foundation.md
**Spec:** specs/tenant-purchase-management/

## Context

- **Why**: Completion is the event that makes inventory and supplier payable real.
- **Current state**: Prisma models exist, but no purchase service/controller exists.
- **Target outcome**: Users create/list/detail/edit/cancel drafts and complete once with stock, cost, movement, and debt effects.

## Constraints

- **MUST**: Tenant identity and authoritative quantities, money, stock, and balances are server-derived; preserve approved scope.
- **SHOULD**: Reuse existing NestJS/Prisma, Next.js, userFetch, sales/products, and DESIGN.md patterns.
- **MUST NOT**: Add unapproved returns, advanced workflow, multi-warehouse, or unrelated refactors.
- **SCOPE**: Implement only this task and its mapped requirements.

## Steps
- [x] 1. Implement guarded /tenant/purchases list/detail/create/edit/cancel routes with one default warehouse, product/supplier/conversion validation, Decimal qtyBase, integer-money totals, lifecycle rules, and page size <=20.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 9.1, 10.1, 10.2_
- [x] 2. Implement completion transaction: DRAFT to COMPLETED only; update/create Stock and moving average; create IN/PURCHASE movements; update Supplier.balance and conditional SUPPLIER/PURCHASE/INCREASE DebtLedger; rollback on failure; use Purchase.idempotencyKey with its tenant-scoped unique constraint and canonical payload comparison.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.4, 9.2, 11.1, 11.2_
- [x] 3. Add unit/controller/integration/E2E tests for success, conversion, payments, isolation, denial, duplicate/concurrent completion, and rollback.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 4.2, 4.3, 4.4, 5.2, 6.2, 6.3, 10.3, 11.1, 11.3_


## Requirements

- 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 9.1, 9.2, 10.1, 10.2, 10.3, 11.1, 11.2, 11.3

## Related Files

| Path | Action | Description |
|---|---|---|
backend/src/platform/purchases/purchases.module.ts | Create | Purchase module
| backend/src/platform/purchases/purchases.controller.ts | Create | Guarded routes
| backend/src/platform/purchases/purchases.service.ts | Create | Lifecycle/transaction
| backend/src/platform/purchases/dto/* | Create/Modify | Validated inputs
| backend/src/platform/purchases/*.spec.ts | Create | Unit/controller tests
| backend/test/tenant-purchases.e2e-spec.ts | Create | Persistence/isolation/rollback
| backend/prisma/schema.prisma | Read/Modify only if approved | Retry identity

## Completion Criteria

- [x] Draft operations have zero stock/payable effects.
- [x] Completion atomically persists purchase, movements, stock/cost, and conditional debt.
- [x] Invalid conversion/client fields fail; replay/concurrency cannot duplicate.
- [x] Rollback, tenant, permission, and payment tests pass.

## Evidence

- [x] Automated verification
  - Command(s): pnpm --dir backend test -- --runInBand purchases; pnpm --dir backend test:e2e -- --runInBand tenant-purchases.e2e-spec.ts
  - Expected proof: Success, invalid, duplicate, concurrency, rollback cases pass.
- [x] Artifact / runtime verification
  - Inspect: Purchase/PurchaseLine/Stock/StockMovement/Supplier/DebtLedger rows
  - Expect: One movement per line and correct balances.
- [x] Runtime reachability verification
  - Entrypoint/caller: Authenticated /tenant/purchases registered by PurchasesModule
  - Expect: Request reaches service.
- [x] Contract / negative-path verification
  - Check: Draft effects, invalid conversion, cross-tenant IDs, warehouse error, duplicate completion, forced failure
  - Expect: Stable 403/404/409/422/500 and zero partial effects.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
Double stock | High | Conditional transition/row lock
Wrong average cost | High | Decimal/allocation tests
Partial writes | High | One transaction/forced rollback

## Verification receipt — 2026-07-21

- Unit/domain tests: PASS — 2 suites, 7 tests via pnpm --dir backend exec jest --runInBand purchases.
- E2E: PASS — 1 suite, 2 tests via isolated nomogreen_purchase_e2e database; draft effects, conversion, stock qtyBase/avgCost, debt ledger, replay/idempotency and permission denial verified.
- Backend build: PASS — pnpm --dir backend build.
- Prisma validation: PASS — pnpm --dir backend exec prisma validate.
- Diff check: PASS — git diff --check.
- Concurrency hardening: Serializable completion retries P2034 conflicts up to three attempts.
- Environment note: shared nomogreen database was not modified because its pre-existing migration history contains failed migrations; E2E used a separate database synchronized from the current Prisma schema.
