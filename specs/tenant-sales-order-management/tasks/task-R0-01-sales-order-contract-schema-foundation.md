# Task R0-01: Sales order contract schema foundation

**Requirement:** R0 — Shared sales-order contract and schema foundation
**Status:** done
**Priority:** P1
**Estimated Effort:** 3-4 hours
**Dependencies:** none
**Spec:** specs/tenant-sales-order-management/

## Context

- **Why**: Later backend and frontend slices need one stable order shape plus the minimum persistence fields required by the existing UI and safe compensation.
- **Current state**: `Sale` already has channel/status/lines but lacks `note`; the canonical list lacks a channel/status/date index; `StockReason` lacks `SALE_CANCEL`.
- **Target outcome**: An additive Prisma migration and generated client expose the approved schema while the cross-layer `SALES_ORDER_API_V1` contract remains authoritative.

## Constraints

- **MUST**: Add only nullable `Sale.note`, `StockReason.SALE_CANCEL`, and `@@index([tenantId, channel, status, soldAt])` through an additive migration.
- **SHOULD**: Keep existing quick-sale rows and code compatible before and after application deployment.
- **MUST NOT**: Create a second sales-order model, rewrite data, remove enum values, add audit/quota/sequence scope, or make a destructive rollback.
- **SCOPE**: Implement only the approved foundation and `scope_lock`; later tasks own runtime behavior.

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

- [x] 1. Extend the Prisma sales contract and create the named migration.
  - Preserve every existing row while enabling note persistence, indexed queries, and explicit cancellation movements.
  - Modify `backend/prisma/schema.prisma`; create `backend/prisma/migrations/20260722104500_sales_order_lifecycle/migration.sql` with nullable column, enum addition, and composite index only.
  - _Requirements: 1.1, 1.3, 4.2, 8.1_

- [x] 2. Regenerate and validate the Prisma client.
  - Ensure downstream TypeScript sees `note` and `SALE_CANCEL` before service implementation begins.
  - Run Prisma generation and backend build; do not commit unrelated generated artifacts.
  - _Requirements: 1.3, 4.2_

- [x] 3. Verify forward and application rollback compatibility.
  - Prove current quick-sale code still builds and record that application rollback leaves the additive schema in place.
  - _Requirements: 4.2, 8.1_

## Requirements

- 1.1 — Indexed tenant/channel/status list foundation.
- 1.3 — Persisted order note for canonical detail.
- 4.2 — Explicit `SALE_CANCEL` stock movement reason.
- 8.1 — Query index supporting the measured list target.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Add order note, cancel reason, and canonical list index |
| `backend/prisma/migrations/20260722104500_sales_order_lifecycle/migration.sql` | Create | Additive PostgreSQL migration |
| `specs/tenant-sales-order-management/design.md` | Read | Canonical API and persistence invariants |

## Completion Criteria

- [x] Prisma schema exposes nullable `Sale.note`, `SALE_CANCEL`, and the four-column index exactly once.
- [x] Migration applies without rewriting or dropping existing data.
- [x] Prisma generation and backend build pass with current quick-sale code.
- [x] Runtime reachability is explicitly deferred to tasks R1-01, R2-01, and R3-01, which consume the schema through `SalesService`.

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir backend prisma generate` and `pnpm --dir backend build`
  - Expected proof: Both exit 0 and generated Prisma types include the added field/enum.
- [x] Artifact / runtime verification
  - Inspect: `backend/prisma/schema.prisma` and `backend/prisma/migrations/20260722104500_sales_order_lifecycle/migration.sql`
  - Expect: Additive SQL matches the schema and contains no unrelated statements.
- [x] Runtime reachability verification
  - Entrypoint/caller: `backend/src/platform/sales/sales.service.ts` in tasks R1-01, R2-01, and R3-01
  - Expect: Later tasks read/write the new contract; this task creates no orphan runtime module.
- [x] Contract / negative-path verification
  - Check: Build the unchanged quick-sale path and inspect migration rollback risk.
  - Expect: Quick sale remains type-compatible; rollback guidance retains used enum values.

### Verification receipt - 2026-07-22

- Mode: full-spec.
- Commands: pnpm --dir backend exec prisma generate; pnpm --dir backend build; pnpm --dir backend exec prisma validate; git diff --check.
- Result: PASS; Prisma Client generated, schema valid, Nest build passed, and diff check clean.
- Artifact proof: backend/prisma/schema.prisma contains nullable Sale.note, StockReason.SALE_CANCEL, and the composite index; additive migration exists at backend/prisma/migrations/20260722104500_sales_order_lifecycle/migration.sql.
- Reachability proof: generated Prisma types are consumed by the existing SalesService build; lifecycle consumers remain assigned to R1-R3.
- Docs impact: none; this task changes persistence foundation only.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Concurrent debt-spec schema work causes migration conflict | High | Use a unique migration directory and reconcile schema/migration ordering before implementation merge. |
| Removing a used PostgreSQL enum value during rollback loses compatibility | High | Keep the additive schema on application rollback; never destructively drop a used enum value. |
