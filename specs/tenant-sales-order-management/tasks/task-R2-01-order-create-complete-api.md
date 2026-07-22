# Task R2-01: Order create and complete API

**Requirement:** R2 — Idempotent creation and atomic completion
**Status:** pending
**Priority:** P1
**Estimated Effort:** 6-8 hours
**Dependencies:** tasks/task-R0-01-sales-order-contract-schema-foundation.md, tasks/task-R1-01-order-query-api.md
**Spec:** specs/tenant-sales-order-management/

## Context

- **Why**: Sellers need both side-effect-free drafts and retry-safe completion from the existing create/detail UI.
- **Current state**: Quick sale already validates products/units/customer and writes stock/debt; purchase lifecycle demonstrates Serializable retry, but sales has no order mutation endpoints.
- **Target outcome**: POST create and complete endpoints persist one order and apply inventory/debt exactly once with full rollback.

## Constraints

- **MUST**: Use `channel=ORDER`, server-calculated totals, token tenant/actor, Serializable transactions, at most three P2034 retries, `inventory` assertion, and conditional `debt` assertion.
- **SHOULD**: Extract shared private preparation/effect helpers so quick sale and order completion cannot drift while retaining the public quick-sale contract.
- **MUST NOT**: Reserve stock for drafts, accept client totals/tenant IDs, mutate persisted draft lines during completion, add quota/audit/sequence behavior, or generate a new retry key after an ambiguous failure.
- **SCOPE**: Implement creation as `DRAFT|COMPLETED` and `DRAFT -> COMPLETED`; draft editing remains out of scope.

**Contracts:** SALES_ORDER_API_V1

```text
Base: /tenant/sales/orders
List: GET /?search=&status=DRAFT|COMPLETED|CANCELLED&page=1&pageSize=20 -> {items: SalesOrderSummary[], page, pageSize, total}
Detail: GET /:id -> SalesOrderDetail
Create: POST / -> {idempotencyKey, status:DRAFT|COMPLETED, customerId?, discountAmount, note?, settlement?, lines:[{productId,unitId,qty,unitPrice}]}
Complete: POST /:id/complete -> {paymentMethod:CASH|BANK_TRANSFER|QR|DEBT, amountPaid}
Cancel: POST /:id/cancel -> SalesOrderDetail
SalesOrderSummary: {id,docNo,status,customerName,customerPhone,itemCount,total,paymentMethod,soldAt,createdAt}
SalesOrderDetail: {id,docNo,channel:ORDER,status,customer:{id,name,phone}|null,warehouseId,subtotal,discountAmount,total,amountPaid,changeAmount,debtAmount,paymentMethod:CASH|BANK_TRANSFER|QR|DEBT|null,note,soldAt,completedAt,createdAt,updatedAt,lines:[{id,productId,productName,unitId,unitName,qty,qtyBase,unitPrice,lineTotal}]}
Errors: 401 unauthenticated; 403 permission or entitlement; 404 non-enumerating tenant or object miss; 409 idempotency, state, race, or compensation conflict; 422 validation, stock, or business-rule failure
Serialization: money is integer VND JSON number within Number.MAX_SAFE_INTEGER; qty and qtyBase are decimal strings; DRAFT rejects settlement; COMPLETED requires settlement
```

## Steps

- [ ] 1. Add create/settlement DTOs and guarded routes.
  - Expose one form contract for draft/direct completion and one settlement contract for completing a persisted draft.
  - Create `create-sales-order.dto.ts` and `complete-sales-order.dto.ts`; validate UUID key/IDs, non-empty lines, positive decimal quantity, integer safe-VND money, payment enum, note bounds, and conditional settlement rules; add `sales:create`/`sales:edit` plus `advanced_mode` routes.
  - _Requirements: 2.1, 2.3, 2.4, 3.1, 5.1, 5.2, 5.3, 5.4, 8.2_

- [ ] 2. Implement side-effect-free creation and channel-aware idempotency.
  - Allow delivery-later drafts without touching stock/debt and protect all sales channels from retry collision.
  - Normalize/order lines, validate tenant products/units/customer/default warehouse, persist snapshots/note/totals, compare normalized payload plus `channel=ORDER`; harden quick-sale replay to require `QUICK_SALE` and return 409 for cross-channel reuse.
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 5.3, 8.3_

- [ ] 3. Implement shared atomic completion effects.
  - Ensure direct completion and draft completion produce identical stock/debt results and never partial writes.
  - In a short Serializable transaction assert `inventory`, re-read tenant order/state, validate settlement, conditionally decrement stock, write one referenced OUT/SALE movement per line, conditionally assert `debt`, increment customer balance/write one SALE/INCREASE ledger, then set `COMPLETED/completedAt`; retry P2034 up to three times.
  - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 5.2, 5.3, 8.3_

- [ ] 4. Add focused unit/controller regression tests.
  - Prove draft zero effects, direct/draft completion parity, settlement rules, exact-once replay, rollback, cross-channel conflict, permissions, and entitlements.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 8.2, 8.3_

## Requirements

- 2.1 — Persist one validated order and snapshot lines.
- 2.2 — Draft creation has zero stock/debt effects.
- 2.3 — Typed validation rejects invalid tenant/business input atomically.
- 2.4 — Direct completed creation uses the completion invariants.
- 2.5 — Equivalent replay is exact-once; mismatched or cross-channel replay is 409.
- 3.1 — Legal atomic `DRAFT -> COMPLETED` transition.
- 3.2 — Conditional stock decrement and one referenced movement per line.
- 3.3 — Exact optional debt mutation and ledger.
- 3.4 — Full rollback on any failure.
- 3.5 — Completion replay without duplicate effects.
- 5.1 — Method-specific permissions.
- 5.2 — Advanced route and transactional inventory/debt entitlements.
- 5.3 — Token-derived tenant/actor and tenant predicates.
- 5.4 — Denial performs no mutation.
- 8.2 — Explicit JSON-safe response mapping.
- 8.3 — Unit/integration proof for critical mutation cases.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/dto/create-sales-order.dto.ts` | Create | Validated create order payload |
| `backend/src/platform/sales/dto/complete-sales-order.dto.ts` | Create | Validated settlement payload |
| `backend/src/platform/sales/sales.controller.ts` | Modify | Create and complete routes/metadata |
| `backend/src/platform/sales/sales.service.ts` | Modify | Creation, shared completion, idempotency, retry |
| `backend/src/platform/sales/sales.controller.spec.ts` | Modify | Route permissions/feature/delegation |
| `backend/src/platform/sales/sales.service.spec.ts` | Modify | Mutation, rollback, replay, entitlement tests |
| `backend/src/platform/entitlements/entitlement.service.ts` | Read | Transaction-aware feature assertion |

## Completion Criteria

- [ ] Draft persists canonical snapshots/note/totals and creates zero stock/debt effects.
- [ ] Direct completion and draft completion write exactly one sale effect set and return the same DTO shape.
- [ ] Equivalent create/complete retry returns the original state; changed/cross-channel key returns 409.
- [ ] Insufficient stock, missing feature, invalid customer/unit/product/payment, or forced write failure leaves order/state/effects unchanged.
- [ ] Existing `POST /tenant/sales/quick` remains reachable and its focused tests pass.

## Evidence

- [ ] Automated verification
  - Command(s): `pnpm --dir backend test -- --runInBand sales.service.spec.ts sales.controller.spec.ts` and `pnpm --dir backend build`
  - Expected proof: Focused suites and build exit 0, including quick-sale regression.
- [ ] Artifact / runtime verification
  - Inspect: persisted `Sale`, `SaleLine`, `Stock`, `StockMovement`, `Customer`, and `DebtLedger` rows.
  - Expect: Draft has no effects; completed order has server totals and exact referenced effects.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `POST /tenant/sales/orders` and `POST /tenant/sales/orders/:id/complete` through `SalesController`
  - Expect: Requests reach `SalesService.createOrder/completeOrder`; quick sale still reaches its original method.
- [ ] Contract / negative-path verification
  - Check: Tenant B product/customer/order IDs, missing permission/features, key reuse across quick/order, insufficient stock, cancelled completion, and forced ledger failure.
  - Expect: 403/404/409/422 as specified and zero partial writes.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Concurrent completion duplicates stock or debt | High | Serializable transaction, legal-state re-read, bounded P2034 retry, exact persisted-count tests. |
| Shared helper refactor regresses quick sale | High | Preserve quick DTO/response and run existing unit/E2E regression, including cross-channel keys. |
| Entitlement checked outside mutation becomes stale | High | Assert `inventory` and conditional `debt` using the same Prisma transaction client before effects. |
