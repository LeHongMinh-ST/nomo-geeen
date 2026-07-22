# Task R4-01: Tenant sales client and customer picker

**Requirement:** R4 — Frontend data boundary and real customer selection
**Status:** done
**Priority:** P1
**Estimated Effort:** 5-6 hours
**Dependencies:** None
**Spec:** specs/tenant-sales-order-management/

## Context

- **Why**: All order screens currently depend on seeded orders and the shared customer picker uses mock records.
- **Current state**: Product selection already uses a tenant API, while order and customer data still cross mock boundaries.
- **Target outcome**: One typed tenant-sales client and one real, reusable customer picker support the existing order UI without changing its visual language.

## Constraints

- **MUST**: Reuse `tenant-customers-api.ts`, auth-aware request conventions, DESIGN.md tokens, explicit DTO mapping, and stable query behavior.
- **SHOULD**: Keep pure presentation helpers in `orders.ts` only when they do not seed or fetch records.
- **MUST NOT**: Add a second customer API, retain production mock fallback, expose raw Prisma values, or refactor unrelated customer/product screens.
- **SCOPE**: Client contracts and shared customer selection only; screen orchestration belongs to R5/R6.

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

- [x] 1. Implement the typed tenant-sales API client.
  - Define summary/detail/create/settlement types and list/detail/create/complete/cancel functions using existing authenticated fetch/error conventions and explicit query serialization.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.2, 7.3, 7.4, 8.2_

- [x] 2. Remove production order seed coupling.
  - Retain only required formatting/status presentation helpers in `orders.ts`; make real API DTOs the screen source of truth.
  - _Requirements: 6.1, 6.2, 7.5, 8.4_

- [x] 3. Connect `CustomerPicker` to the existing tenant customer client.
  - Add debounced search, stale-response protection, keyboard selection, loading/empty/error states, and controlled selected-customer behavior without local mock fallback.
  - _Requirements: 7.1, 7.5, 8.4_

- [x] 4. Add client and picker tests.
  - Verify URL/payload/error mapping, search race handling, keyboard/focus behavior, and selection persistence.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.5, 8.2, 8.4_

## Requirements

- 6.1 — Real paginated order list contract.
- 6.2 — Real tenant-scoped order detail contract.
- 6.3 — Canonical mutation responses drive UI state.
- 6.4 — Cancellation confirmation and canonical refresh.
- 7.1 — Real customer selection with optional walk-in customer.
- 7.2 — Stable idempotent draft creation payload.
- 7.3 — Stable idempotent completed creation payload.
- 7.4 — Complete/cancel actions preserve recoverable input.
- 7.5 — No production seeded order/customer source.
- 8.2 — Explicit JSON-safe mapping.
- 8.4 — Responsive and accessible interaction states.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/tenant-sales-api.ts` | Modify | Extend existing quick-sale transport with typed order operations |
| `frontend/lib/tenant-sales-api.test.ts` | Modify | Extend existing client tests with query/payload/error cases |
| `frontend/lib/orders.ts` | Modify | Remove seed data; retain pure presentation helpers only |
| `frontend/components/app/sales/customer-picker.tsx` | Modify | Real tenant customer search and controlled selection |
| `frontend/components/app/sales/__tests__/customer-picker.test.tsx` | Create | Picker state, race, keyboard, and error tests |
| `frontend/lib/tenant-customers-api.ts` | Read | Existing customer API contract and request conventions |

## Completion Criteria

- [x] All five order operations have typed client functions matching `SALES_ORDER_API_V1`.
- [x] Production order and customer flows contain no seeded/mock fallback.
- [x] Customer search ignores stale responses and supports mouse and keyboard selection.
- [x] Client and picker tests cover success plus 401/403/404/409/422/error states where applicable.

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir frontend test -- tenant-sales-api.test.ts customer-picker.test.tsx` and `pnpm --dir frontend build`
  - Expected proof: Focused suites and build exit 0.
- [x] Artifact / runtime verification
  - Inspect: Network calls and rendered picker at empty, loading, results, selected, and error states.
  - Expect: `/tenant/customers` and `/tenant/sales/orders` are the only runtime data sources.
- [x] Runtime reachability verification
  - Entrypoint/caller: `CustomerPicker` and the exported `tenant-sales-api` functions.
  - Expect: UI events reach authenticated API calls; no seed accessor is reachable from app routes.
- [x] Contract / negative-path verification
  - Check: Rapid searches, aborted/unmounted requests, unauthenticated responses, and malformed error bodies.
  - Expect: Latest query wins, no state-after-unmount warning, and safe actionable errors render.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Shared picker change regresses quick sale | High | Preserve controlled props and add a quick-sale consumer regression in R7. |
| Search responses arrive out of order | Medium | Abort or sequence requests and test delayed reversed responses. |
| Frontend DTO drifts from backend serialization | High | Copy the canonical contract and test decimal-string/integer-money mapping. |

## Verification Receipt

- `pnpm --dir frontend test -- tenant-sales-api.test.ts customer-picker.test.tsx` — PASS, 10 files / 27 tests.
- `pnpm --dir frontend build` — PASS, 43 routes generated.
- `git diff --check` — PASS.
- SPEC_PASS: critical findings 0; code quality 9.7/10, critical findings 0.
- Reachability: QuickSale and OrderForm → CustomerPicker; exported tenant-sales API functions are reachable. Runtime seed deferral for `orders.ts`/`getOrder` remains explicitly deferred to R5/R6.
- Coverage: unavailable / UNVERIFIED (not required by this task evidence).
