# Task R3-01: Order cancellation compensation

**Requirement:** R3 — Atomic draft and completed cancellation
**Status:** pending
**Priority:** P1
**Estimated Effort:** 5-6 hours
**Dependencies:** tasks/task-R2-01-order-create-complete-api.md
**Spec:** specs/tenant-sales-order-management/

## Context

- **Why**: The selected existing UI permits cancelling draft and completed orders; local status-only cancellation would corrupt stock and debt.
- **Current state**: Sales has no cancel endpoint; old docs make completed immutable, but the approved scope explicitly supersedes that boundary with strict compensation.
- **Target outcome**: Draft cancel is side-effect free; eligible completed cancel appends exact stock/debt compensation and commits one terminal state.

## Constraints

- **MUST**: Use a short Serializable transaction, token tenant/actor, `sales:edit`, `advanced_mode`, transactional `inventory`, conditional `debt`, and all-or-nothing compensation.
- **SHOULD**: Return the existing cancelled order on replay and a typed 409 for the opposite/ineligible terminal transition.
- **MUST NOT**: Delete original movements/ledger/lines, alter average cost, implement Sales Return/refund allocation, compensate an already returned sale, or let aggregate customer balance go negative.
- **SCOPE**: Completed cancellation restores inventory and original sale debt only; cash refund documents remain out of scope.

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

- [ ] 1. Add guarded cancellation route and lifecycle transaction.
  - Replace local-only UI cancellation with one server-authoritative operation.
  - Add `POST /tenant/sales/orders/:id/cancel` using token IDs, `sales:edit`, and `advanced_mode`; implement tenant/channel/deleted/state lookup, Serializable retry, and state-idempotent response.
  - _Requirements: 4.1, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

- [ ] 2. Implement completed stock compensation.
  - Restore sellable quantity without erasing the original transaction history.
  - Reject any completed `SalesReturn`; assert inventory; increment each stock row by persisted `qtyBase`; append exactly one `IN/SALE_CANCEL` movement with sale and line references; preserve `avgCost`.
  - _Requirements: 4.2, 4.3, 4.5, 5.2, 8.3_

- [ ] 3. Implement conditional debt compensation and terminal update.
  - Reverse only the debt originally introduced by the sale and avoid creating unmodeled customer credit.
  - For non-zero debt assert `debt`, conditionally decrement the same tenant customer where `balance >= debtAmount`, append one `ADJUST/DECREASE` ledger with `refType=SALE_CANCEL` and committed balance; any failure aborts stock and status; then set `CANCELLED`.
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 5.2, 5.3, 8.3_

- [ ] 4. Add unit tests for compensation, replay, rollback, and race contracts.
  - Prove draft zero effects, paid/debt completed compensation, unsafe reversal rejection, returned-sale rejection, forced write rollback, and complete-versus-cancel single winner.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 8.2, 8.3_

## Requirements

- 4.1 — Draft cancellation has zero stock/debt effects.
- 4.2 — Completed cancellation appends exact stock/debt compensation.
- 4.3 — Returned sale or unsafe debt reversal rejects without mutation.
- 4.4 — Cancel replay is exact-once; unsupported state is 409.
- 4.5 — Concurrent complete/cancel commits one legal transition.
- 5.1 — `sales:edit` and tenant token enforcement.
- 5.2 — Advanced route plus transactional inventory/debt features.
- 5.3 — Tenant-scoped order/return/stock/customer/ledger writes.
- 5.4 — Authorization/eligibility denial performs no mutation.
- 8.2 — Explicit JSON-safe response.
- 8.3 — Rollback, replay, compensation, and race proof.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/sales.controller.ts` | Modify | Guarded cancel endpoint |
| `backend/src/platform/sales/sales.service.ts` | Modify | Cancellation transaction and compensation |
| `backend/src/platform/sales/sales.controller.spec.ts` | Modify | Cancel metadata/delegation tests |
| `backend/src/platform/sales/sales.service.spec.ts` | Modify | Compensation/replay/race/rollback tests |
| `backend/prisma/schema.prisma` | Read | Sale/return/stock/debt relations and cancel reason |
| `backend/src/platform/entitlements/entitlement.service.ts` | Read | Transactional feature assertions |

## Completion Criteria

- [ ] Draft cancel changes only the order status and repeated cancel creates no new effect.
- [ ] Eligible completed cancel restores every line and original debt exactly once using compensating records.
- [ ] Returned sale, insufficient debt balance, missing feature, cross-tenant ID, or forced write failure leaves status/stock/debt unchanged.
- [ ] Concurrent complete/cancel ends in exactly one terminal state with effect counts consistent with that winner.
- [ ] Endpoint is reachable from existing `SalesModule` and returns canonical detail.

## Evidence

- [ ] Automated verification
  - Command(s): `pnpm --dir backend test -- --runInBand sales.service.spec.ts sales.controller.spec.ts` and `pnpm --dir backend build`
  - Expected proof: Focused suites/build exit 0 with compensation and race cases passing.
- [ ] Artifact / runtime verification
  - Inspect: cancelled `Sale`, original/compensating `StockMovement`, `Stock`, `Customer.balance`, and `DebtLedger` rows.
  - Expect: Original history remains; compensation counts/amounts equal persisted sale lines/debt.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `POST /tenant/sales/orders/:id/cancel` through `SalesController`
  - Expect: Request invokes `SalesService.cancelOrder` and returns `SalesOrderDetail`.
- [ ] Contract / negative-path verification
  - Check: Tenant B ID, returned sale, debt balance below original debt, missing inventory/debt feature, repeat, and concurrent completion.
  - Expect: 403/404/409 as specified and no partial compensation.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Partial compensation corrupts stock/debt | High | One Serializable transaction and forced-failure assertions after each write boundary. |
| Completed cancellation conflicts with later debt receipts/returns | High | Reject returned sale and conditional balance decrement; leave allocation/refund to future workflows. |
| Complete/cancel race duplicates or mismatches effects | High | Legal-state re-read, bounded retry, state-idempotent terminal response, concurrent E2E proof. |
