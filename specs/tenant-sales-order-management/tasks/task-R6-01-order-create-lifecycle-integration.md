# Task R6-01: Order create and lifecycle integration

**Requirement:** R7 - Real create and lifecycle UI
**Status:** pending
**Priority:** P1
**Estimated Effort:** 6 hours
**Dependencies:** tasks/task-R2-01-order-create-complete-api.md, tasks/task-R3-01-order-cancellation-compensation.md, tasks/task-R4-01-tenant-sales-client-customer-picker.md, tasks/task-R5-01-order-list-detail-integration.md
**Spec:** specs/tenant-sales-order-management/

## Context

- Human intent: sellers save drafts, complete orders, and retry safely without losing lines or settlement choices.
- Current state: OrderForm is FE-only and detail lifecycle actions are not canonical; R4 owns the real client boundary.
- Target outcome: create and detail routes invoke SALES_ORDER_API_V1 and render committed server state.

## Constraints

- MUST reuse SALES_ORDER_API_V1, one stable UUID idempotency key per operation, existing payment interaction, and DESIGN.md states.
- MUST require a customer when server-calculated unpaid amount is non-zero; never trust client totals or optimistic terminal state.
- MUST NOT edit persisted drafts, reserve stock during draft save, invent terminal state, or add offline sync.

## Steps

- [ ] 1. Wire OrderForm to real product/customer/unit data and create APIs.
  - Human intent: save draft or direct-complete while preserving seller work across retries.
  - AI details: update frontend/components/app/sales/order-form.tsx to call tenant-sales-api.ts with productId, unitId, decimal qty, integer VND unitPrice, discountAmount, note, optional customer, and settlement.
  - _Requirements: 7.1, 7.2, 7.3, 7.5, 8.2, 8.4_
- [ ] 2. Wire detail completion and cancellation refresh.
  - Human intent: every result reflects server state, including stale lifecycle conflicts.
  - AI details: update order-detail.tsx and don-ban-hang/[id]/page.tsx; disable duplicate submits, refetch on 409, and replace state with returned SalesOrderDetail.
  - _Requirements: 6.3, 6.4, 7.3, 7.4, 8.3, 8.4_
- [ ] 3. Add component tests for draft, payment modes, unpaid-without-customer, stable key, retry, and canonical rendering.
  - _Requirements: 6.3, 6.4, 7.2, 7.3, 7.4, 8.3, 8.4_

## Requirements

- 6.3 - Mutation response is canonical UI state.
- 6.4 - Cancellation confirmation and recoverable feedback.
- 7.1 - Real products/customers/units with optional walk-in customer.
- 7.2 - Stable idempotent draft creation and retry.
- 7.3 - Settlement and debt completion flow.
- 7.4 - Canonical refresh after completion/cancellation.
- 7.5 - No runtime mock source.
- 8.2 - Explicit JSON-safe DTO consumption.
- 8.3 - Lifecycle regression coverage.
- 8.4 - Responsive accessible states.

## Related Files

| Path | Action | Description |
|---|---|---|
| frontend/components/app/sales/order-form.tsx | Modify | Real create orchestration |
| frontend/components/app/sales/order-detail.tsx | Modify | Complete/cancel and canonical refresh |
| frontend/app/(app)/don-ban-hang/[id]/page.tsx | Modify | Route detail boundary |
| frontend/lib/tenant-sales-api.ts | Read | Canonical transport |
| frontend/components/app/sales/__tests__/order-form.test.tsx | Create | Create/retry/settlement tests |
| frontend/components/app/sales/__tests__/order-detail-lifecycle.test.tsx | Create | Complete/cancel/conflict tests |

## Completion Criteria

- [ ] Draft/direct completion use real API, valid units, server totals, and stable key.
- [ ] Unpaid completion requires customer and renders server debt/payment.
- [ ] Duplicate clicks do not duplicate requests; failures preserve input and permit retry.
- [ ] 409 conflicts refetch canonical detail; success needs no full reload.
- [ ] States match DESIGN.md.

## Evidence

- Automated proof: frontend focused tests for form/detail lifecycle and frontend build.
- Artifact/runtime proof: inspect /don-ban-hang/tao and /don-ban-hang/:id after draft, complete, cancel.
- Reachability proof: the Next routes reach OrderForm/OrderDetail and tenant-sales-api.
- Contract/negative proof: duplicate click, same-key retry, unpaid without customer, 401/403/409/422, and stale detail.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Payment UI/API drift | High | One canonical settlement type and tests for every mode. |
| Retry loses form data | High | Keep input/key until canonical success; test failure then retry. |
| Detail action orphaned | Medium | Start runtime test at the Next detail route and assert client call. |
## Runtime reachability verification

- Entrypoint: Next routes /don-ban-hang/tao and /don-ban-hang/[id].
- Proof: rendered route events invoke OrderForm/OrderDetail and tenant-sales-api; no orphan component remains.
