# Task R0-01: Purchase contract foundation

**Requirement:** R0 — purchase contract and persistence foundation
**Status:** done
**Priority:** P0
**Estimated Effort:** 3–5 hours
**Dependencies:** none
**Spec:** specs/tenant-purchase-management/

## Context

- **Why**: Backend and frontend need one unambiguous purchase, supplier, conversion, payment, and inventory contract.
- **Current state**: Prisma already has Purchase, Supplier, Stock, StockMovement, ProductUnitConversion, and DebtLedger; APIs are missing.
- **Target outcome**: Canonical DTOs, API types, permission decisions, fixtures, and serialization tests are ready.

## Constraints

- **MUST**: Tenant identity and authoritative quantities, money, stock, and balances are server-derived; preserve approved scope.
- **SHOULD**: Reuse existing NestJS/Prisma, Next.js, userFetch, sales/products, and DESIGN.md patterns.
- **MUST NOT**: Add unapproved returns, advanced workflow, multi-warehouse, or unrelated refactors.
- **SCOPE**: Implement only this task and its mapped requirements.

## Steps
- [x] 1. Define purchase, supplier, inventory DTOs and shared frontend API types; exclude tenantId, qtyBase, stock, balances, and debt balances as authoritative input.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 6.1, 6.4, 7.2, 8.1_
- [x] 2. Confirm exact permission/entitlement codes, module registration points, additive fixtures, and add the approved Purchase.idempotencyKey tenant-unique migration before domain implementation.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 1.4, 6.2, 6.3, 10.1, 10.3_
- [x] 3. Add contract tests for base factor 1, PURCHASE/BOTH conversion, invalid factor, Decimal quantity, money limits, and BigInt mapping.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 10.2_


## Requirements

- 1.4, 3.1, 3.2, 3.3, 3.4, 5.1, 6.1, 6.2, 6.3, 6.4, 7.2, 8.1, 10.1, 10.2, 10.3

## Related Files

| Path | Action | Description |
|---|---|---|
backend/src/platform/purchases/dto/* | Create | Purchase DTOs
| backend/src/platform/suppliers/dto/* | Create | Supplier DTOs
| frontend/lib/tenant-purchases-api.ts | Create | Typed purchase client
| frontend/lib/tenant-suppliers-api.ts | Create | Typed supplier client
| backend/src/platform/*module.ts | Read | Module registration points for R1
| backend/prisma/schema.prisma | Modify | Retry identity field and unique constraint

## Completion Criteria

- [x] Shared contracts reject client-derived authoritative fields.
- [x] Permission, entitlement, registration points, and fixtures are named; actual module registration is owned by R1 once modules exist.
- [x] Conversion/money tests pass without duplicate models.

## Evidence

- [x] Automated verification
  - Command(s): pnpm --dir backend test -- --runInBand; targeted frontend API tests
  - Expected proof: Contract tests pass.
- [x] Artifact / runtime verification
  - Inspect: DTOs, API types, module registration, fixtures
  - Expect: R1/R2 import one contract.
- [x] Runtime reachability verification
  - Entrypoint/caller: Backend root module and R2 API-client imports
  - Expect: No orphaned module/type.
- [x] Contract / negative-path verification
  - Check: Cross-tenant IDs, client qtyBase/totals, invalid conversion, negative money
  - Expect: Rejected before mutation.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
Contract drift | High | Shared types/tests
Wrong permission | High | Verify catalog and denied E2E
Retry race | High | Explicit transaction/schema decision

### Verification receipt — 2026-07-21

- Backend contract unit tests: PASS (4 tests).
- Full backend Jest: PASS (29 suites, 204 tests).
- Prisma validate/generate: PASS; Purchase.idempotencyKey schema and migration validated.
- Frontend purchase API tests: PASS (6 files, 11 tests).
- Frontend lint: PASS.
- Frontend build: PASS; /nhap-hang and /ton-kho routes compiled.
- Diff check: PASS.
- Exact task command note: package script forwarding adds an extra Jest pattern; full-suite proof used equivalent pnpm --dir backend exec jest --runInBand.
- Docs impact: none; contract artifacts and implementation notes are sufficient for this foundation task.
