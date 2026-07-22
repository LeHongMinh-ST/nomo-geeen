# Task R1-01: Order query API

**Requirement:** R1 — Tenant-scoped order query API
**Status:** done
**Priority:** P1
**Estimated Effort:** 4 hours
**Dependencies:** tasks/task-R0-01-sales-order-contract-schema-foundation.md
**Spec:** specs/tenant-sales-order-management/

## Context

- **Why**: Order list/detail screens need a tenant-safe server source with deterministic paging and snapshot data.
- **Current state**: `SalesController` exposes quick sale only; Prisma has the required relations; frontend reads seeded orders.
- **Target outcome**: Guarded list/detail endpoints return explicit `SALES_ORDER_API_V1` DTOs and non-enumerating tenant misses.

## Constraints

- **MUST**: Filter by token tenant, `channel=ORDER`, `deletedAt=null`; use `sales:view` and `advanced_mode`; cap page size at 20.
- **SHOULD**: Follow `PurchasesService.list/findById` while mapping only fields required by the contract.
- **MUST NOT**: Return Prisma records directly, expose another tenant/order channel, add cache, or change quick-sale behavior.
- **SCOPE**: Implement only the behavior mapped to R1 and the approved `scope_lock`.

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

- [x] 1. Add validated order query DTO and guarded controller routes.
  - Enable authorized users to list and open real orders without weakening tenant boundaries.
  - Create `sales-order-query.dto.ts`; add GET collection/item methods with token-derived IDs, `sales:view`, and `advanced_mode` metadata.
  - _Requirements: 1.1, 1.2, 1.4, 5.1, 5.2, 5.3, 5.4_

- [x] 2. Implement list/detail queries and explicit response mapping.
  - Give list/card/detail UI stable snapshots without N+1 customer/product lookups or unsafe serialization.
  - Query tenant/order/non-deleted predicates, deterministic order, case-insensitive doc/customer snapshot search, count plus items, and decimal/money serialization per contract.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.2_

- [x] 3. Add controller/service unit coverage.
  - Prove metadata, filters, page cap, snapshot mapping, wrong-channel exclusion, and non-enumerating tenant miss.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4, 8.2_

## Requirements

- 1.1 — Tenant/channel-scoped deterministic list.
- 1.2 — Validated search, status, page, and maximum page size.
- 1.3 — Explicit snapshot-based order detail.
- 1.4 — Non-enumerating tenant/object miss.
- 5.1 — Token and `sales:view` enforcement.
- 5.2 — `advanced_mode` route entitlement.
- 5.3 — Token-derived tenant and actor boundary.
- 5.4 — Denial without mutation or existence leakage.
- 8.1 — Indexed and capped list query.
- 8.2 — JSON-safe allowlisted DTO mapping.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/dto/sales-order-query.dto.ts` | Create | Validated order list query |
| `backend/src/platform/sales/sales.controller.ts` | Modify | Guarded list/detail routes |
| `backend/src/platform/sales/sales.service.ts` | Modify | Tenant query and response mapper |
| `backend/src/platform/sales/sales.controller.spec.ts` | Modify | Route metadata and delegation tests |
| `backend/src/platform/sales/sales.service.spec.ts` | Modify | Query/filter/mapping/isolation tests |
| `backend/prisma/schema.prisma` | Read | Sale relations and canonical index |

## Completion Criteria

- [x] GET collection returns only tenant `ORDER` rows with correct pagination and total.
- [x] GET detail returns explicit snapshots/lines; cross-tenant or quick-sale IDs return the same 404 shape.
- [x] Invalid query values are bounded or rejected; page size never exceeds 20.
- [x] Routes are reachable through existing `SalesModule`, with permission/feature metadata proved by tests.

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir backend test -- --runInBand sales.service.spec.ts sales.controller.spec.ts` and `pnpm --dir backend build`
  - Expected proof: Focused suites and build exit 0.
- [x] Artifact / runtime verification
  - Inspect: `GET /tenant/sales/orders` and `GET /tenant/sales/orders/:id`
  - Expect: Responses match `SALES_ORDER_API_V1` and exclude unrestricted Prisma fields.
- [x] Runtime reachability verification
  - Entrypoint/caller: `backend/src/app.module.ts` -> `SalesModule` -> `SalesController`
  - Expect: Authenticated GET requests invoke `SalesService.listOrders/findOrder`.
- [x] Contract / negative-path verification
  - Check: Missing token/permission/advanced mode, Tenant B ID, quick-sale ID, invalid status, and pageSize above 20.
  - Expect: 401/403/404/validation response as applicable; no cross-tenant or wrong-channel data leaks.

### Verification receipt - 2026-07-22

- Mode: full-spec.
- Commands: pnpm --dir backend test -- --runInBand sales.service.spec.ts sales.controller.spec.ts; pnpm --dir backend build; git diff --check.
- Result: PASS; 7 focused tests passed, Nest build passed, and diff check clean.
- Artifact proof: SalesOrderQueryDto validates page/pageSize/status/search; SalesController exposes guarded GET orders routes; SalesService filters tenant/channel/deleted rows, orders deterministically, and maps explicit summary/detail DTOs.
- Negative-path proof: tests cover tenant predicate, ORDER channel predicate, search/paging, foreign/quick-sale 404, and sales:view/advanced_mode metadata.
- Reachability proof: AppModule registers SalesModule, which registers SalesController and SalesService.
- Docs impact: none; API implementation is covered by the active spec.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| BOLA through user-supplied order ID | High | Include tenant/channel/deleted predicates and manipulated-ID E2E coverage. |
| List response becomes slow or exposes excess fields | Medium | Use the composite index, maximum 20 rows, explicit selection, and DTO mapping. |
