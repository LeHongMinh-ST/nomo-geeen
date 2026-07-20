# Task R1-01: Quick sale API

**Requirement:** R1 — completed sale persistence and atomic effects
**Status:** done
**Priority:** P1
**Estimated Effort:** 5–7 hours
**Dependencies:** tasks/task-R0-01-sales-contract-foundation.md
**Spec:** specs/tenant-sales-management/
**Contracts:** QuickSaleApi

## Context

- **Why**: Checkout must become a durable business transaction instead of clearing local state.
- **Current state**: Prisma already contains `Sale`, `SaleLine`, `Stock`, `StockMovement`, `DebtLedger`, `Warehouse`, and `DocumentSequence`; no sales service implementation exists.
- **Target outcome**: A valid quick sale commits all required records atomically and rejects unsafe sales without side effects.

## Constraints

- **MUST**: Use one Prisma transaction, tenant-scope every read/write, resolve the default active warehouse server-side, and use server-calculated totals.
- **SHOULD**: Reuse existing Prisma client/service and document sequence conventions.
- **MUST NOT**: Add schema migration, draft/return flow, client-controlled tenant/warehouse scope, or batch allocation policy.
- **SCOPE**: Completed quick sales only; customer is optional except when unpaid amount exists.

## Steps

- [x] 1. Implement `SalesService.createQuickSale` in `backend/src/platform/sales/sales.service.ts`.
  - Business intent: create one completed sale and all financial/inventory consequences together.
  - Code detail: validate tenant products/customer and exactly one `isDefault=true AND deletedAt IS NULL` warehouse; return a stable configuration error for zero/multiple matches; validate each base/conversion unit; derive `qtyBase` server-side; calculate subtotal/discount/total/change/debt; create `Sale`/`SaleLine`; use conditional stock decrement; create `StockMovement` per line, increment `Customer.balance`, and create `DebtLedger` for unpaid customer balance.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.4, 2.5, 5.1, 6.1, 7.1_
- [x] 2. Add idempotency lookup and conflict handling using the existing `Sale.tenantId + idempotencyKey` unique constraint.
  - Business intent: a network retry must not sell twice.
  - Code detail: normalize/sort lines and fingerprint the request from customer, payment, amounts, and normalized lines; same key + equivalent fingerprint returns the existing response; same key + different fingerprint returns `IDEMPOTENCY_CONFLICT`; ensure all writes remain inside the transaction.
  - _Requirements: 4.3, 4.4, 7.1_
- [x] 3. Add `backend/src/platform/sales/sales.service.spec.ts` and `backend/test/tenant-sales.e2e-spec.ts` coverage.
  - Prove success, anonymous paid sale, customer debt, insufficient stock rollback, locked/recalled/missing product, invalid customer, tenant isolation, and duplicate/conflicting idempotency key.
  - _Requirements: 2.3, 4.2, 6.2, 7.1_

## Requirements

- 1.1, 1.2, 1.3, 1.4 — completed sale and tenant/default warehouse resolution
- 2.1, 2.2, 2.3, 2.4, 2.5 — atomic sale, stock, payment, and debt rules
- 4.2, 4.3, 4.4 — tenant isolation and retry safety
- 5.1 — normal-cart API performance target
- 6.1, 6.2 — identity isolation and denial
- 7.1 — transaction rollback

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/sales.service.ts` | Modify | Transactional quick-sale implementation |
| `backend/src/platform/sales/sales.controller.ts` | Modify | Delegate to service and return contract |
| `backend/src/platform/sales/dto/create-quick-sale.dto.ts` | Read | Canonical validated request |
| `backend/src/platform/sales/sales.service.spec.ts` | Create | Unit/business rule tests |
| `backend/test/tenant-sales.e2e-spec.ts` | Create | Persistence, isolation, and rollback tests |
| `backend/prisma/schema.prisma` | Read | Existing sale/stock/debt models; no migration |

## Completion Criteria

- [ ] A valid request returns the canonical completed sale and persists Sale/SaleLine records.
- [ ] Stock decrement and SALE movements are created atomically; insufficient/unsellable products leave all tables unchanged.
- [ ] Unpaid amount requires a tenant customer and creates the correct debt ledger entry; anonymous paid sales work.
- [ ] Idempotency, tenant isolation, permission denial, and rollback tests pass; no Prisma migration is introduced.

## Evidence

- [ ] Automated verification
  - Command(s): `pnpm --dir backend test -- --runInBand sales.service.spec.ts` and `pnpm --dir backend test:e2e -- --runInBand tenant-sales.e2e-spec.ts`
  - Expected proof: unit and e2e tests pass for success and negative paths.
- [ ] Artifact / runtime verification
  - Inspect: `backend/src/platform/sales/sales.service.ts`, `backend/test/tenant-sales.e2e-spec.ts`, persisted `Sale`, `StockMovement`, and `DebtLedger` rows.
  - Expect: one transaction produces consistent rows and no negative stock.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `POST /tenant/sales/quick` from `SalesController` registered by `SalesModule`.
  - Expect: request reaches `SalesService.createQuickSale`.
- [ ] Contract / negative-path verification
  - Check: cross-tenant product/customer, insufficient stock, locked product, duplicate/conflicting idempotency key.
  - Expect: 403/409/422 and zero partial side effects.

### Verification receipt — 2026-07-20

- `pnpm --dir backend test -- --runInBand sales.service.spec.ts` — PASS (1 suite, 3 tests).
- `pnpm --dir backend test:e2e -- --runInBand tenant-sales.e2e-spec.ts` with PostgreSQL/Redis local services — PASS (1 suite, 2 tests).
- `pnpm --dir backend build` — PASS (`nest build` exit 0).
- Artifact proof: `Sale`, `SaleLine`, `Stock`, `StockMovement`, and optional `DebtLedger`/`Customer.balance` writes are handled by one Prisma transaction in `backend/src/platform/sales/sales.service.ts`.
- Runtime proof: authenticated `POST /tenant/sales/quick` created a sale, reduced stock, created one movement, replayed the same idempotency key without duplication, rejected a conflicting payload, and rolled back insufficient stock.
- Negative-path proof: E2E verified `INSUFFICIENT_STOCK` rollback and `IDEMPOTENCY_CONFLICT`; unit tests cover unsellable product and anonymous unpaid rejection.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Overselling under concurrent checkout | High | Transactional conditional stock decrement and concurrency test |
| Partial stock/debt persistence | High | Single Prisma transaction and rollback assertion |
| Duplicate sale on network retry | High | Tenant-scoped unique idempotency key and payload conflict test |
