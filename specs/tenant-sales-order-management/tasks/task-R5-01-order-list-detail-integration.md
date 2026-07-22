# Task R5-01: Order list and detail integration

**Requirement:** R5 — Real list, detail, and cancellation UI
**Status:** pending
**Priority:** P1
**Estimated Effort:** 6 hours
**Dependencies:** tasks/task-R1-01-order-query-api.md, tasks/task-R3-01-order-cancellation-compensation.md, tasks/task-R4-01-tenant-sales-client-customer-picker.md
**Spec:** specs/tenant-sales-order-management/

## Context

- **Why**: `/don-ban-hang` and its detail route visually exist but render local seeded records and mutate local state.
- **Current state**: Desktop/mobile layouts, cards, filters, and detail actions are present; no server paging, fetch lifecycle, or canonical cancellation exists.
- **Target outcome**: Existing responsive screens load real tenant orders and reflect canonical server state for query and cancel flows.

## Constraints

- **MUST**: Follow DESIGN.md, preserve current route structure, debounce search, reset paging on query changes, and treat API DTOs as canonical.
- **SHOULD**: Reuse existing skeleton, filter, pagination, sentinel, confirmation, toast, and retry patterns.
- **MUST NOT**: Client-filter a partial page, append duplicate mobile rows, optimistically invent cancelled state, or reimplement API transport in components.
- **SCOPE**: List/detail read paths and cancel action; create/complete orchestration belongs to R6.

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

- [ ] 1. Replace the seeded list pipeline with server query state.
  - Wire debounced search/status/page to the API; use replacement paging on desktop and deduplicated incremental loading on mobile with stale-request protection.
  - _Requirements: 6.1, 7.5, 8.1, 8.4_

- [ ] 2. Map canonical summaries into existing cards and table layouts.
  - Render status/payment/date/customer totals consistently and add loading, empty, inline retry, and pagination/sentinel terminal states.
  - _Requirements: 6.1, 8.2, 8.4_

- [ ] 3. Load real detail by route ID.
  - Replace local lookup with the detail API; render canonical snapshots, settlement/debt, note, lifecycle actions, not-found, forbidden, loading, and retry states.
  - _Requirements: 6.2, 6.3, 8.2, 8.4_

- [ ] 4. Connect cancellation with confirmation and stale-state recovery.
  - Disable duplicate submission, show operation consequences, replace detail with returned canonical DTO, and refetch on a 409 stale transition before showing the actionable error.
  - _Requirements: 4.5, 6.3, 6.4, 7.4, 8.3, 8.4_

- [ ] 5. Add focused list/detail component tests.
  - Cover query reset/races, desktop/mobile pagination semantics, state rendering, confirmation, duplicate-click suppression, canonical response, and conflict recovery.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.4, 8.3, 8.4_

## Requirements

- 4.5 — Repeated or competing cancellation cannot duplicate compensation.
- 6.1 — Server-backed search, filter, desktop paging, and mobile incremental loading.
- 6.2 — Tenant-scoped detail with canonical snapshots and lifecycle data.
- 6.3 — Mutation response is canonical UI state.
- 6.4 — Explicit cancellation confirmation and recoverable feedback.
- 7.4 — Lifecycle actions prevent duplicate submission and preserve recoverability.
- 7.5 — Seeded production data is removed.
- 8.1 — Query performance target is observable.
- 8.2 — JSON-safe DTO consumption.
- 8.3 — Critical lifecycle regression coverage.
- 8.4 — Responsive and accessible state handling.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/components/app/sales/order-list.tsx` | Modify | Server search/filter/paging and fetch states |
| `frontend/components/app/sales/order-card.tsx` | Modify | Canonical summary rendering |
| `frontend/components/app/sales/order-detail.tsx` | Modify | Server detail and cancel action |
| `frontend/app/(app)/don-ban-hang/[id]/page.tsx` | Modify | Route ID to real detail boundary |
| `frontend/components/app/sales/__tests__/order-list.test.tsx` | Create | List query and responsive paging tests |
| `frontend/components/app/sales/__tests__/order-detail.test.tsx` | Create | Detail/cancel lifecycle tests |
| `frontend/components/app/shared/data-pagination.tsx` | Read | Existing desktop pagination behavior |
| `frontend/components/app/shared/load-more-sentinel.tsx` | Read | Existing mobile incremental-load behavior |

## Completion Criteria

- [ ] Search/status/page issue correct server queries and stale responses never overwrite newer results.
- [ ] Desktop replaces pages; mobile appends unique batches and stops at total.
- [ ] Detail displays canonical order, line, settlement, debt, and lifecycle data for the route ID.
- [ ] Cancel requires confirmation, submits once, and renders the returned DTO or recoverable conflict state.
- [ ] Loading, empty, 403/404, error, retry, and success states match DESIGN.md at mobile/tablet/desktop widths.

## Evidence

- [ ] Automated verification
  - Command(s): `pnpm --dir frontend test -- order-list.test.tsx order-detail.test.tsx` and `pnpm --dir frontend build`
  - Expected proof: Focused suites and build exit 0.
- [ ] Artifact / runtime verification
  - Inspect: `/don-ban-hang` and `/don-ban-hang/:id` at 390px, 768px, and 1280px.
  - Expect: Stable layout, correct paging mode, visible focus, and complete fetch/action states.
- [ ] Runtime reachability verification
  - Entrypoint/caller: Next routes `/don-ban-hang` and `/don-ban-hang/[id]`.
  - Expect: Route render reaches list/detail/cancel client functions and returned state reaches visible components.
- [ ] Contract / negative-path verification
  - Check: Rapid filters, mobile repeated sentinel, unknown/foreign ID, cancellation double click, and 409 stale state.
  - Expect: No duplicate rows/mutations, non-enumerating errors, and canonical recovery.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Responsive query modes duplicate or omit rows | High | Reset on query identity, dedupe by ID, stop by total, and test both modes. |
| Stale cancellation UI hides server conflict | High | Render only canonical response and refetch on 409. |
| Mock helper remains reachable | Medium | Remove seed exports in R4 and verify production route imports. |
