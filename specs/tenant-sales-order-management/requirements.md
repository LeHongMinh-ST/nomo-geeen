# Requirements: Tenant Sales Order Management

## Introduction

NomoGreen shall replace the mock-backed `/don-ban-hang` experience with a tenant-scoped sales-order workflow using the existing `Sale` aggregate. The feature covers server-backed order list/detail, creation as `DRAFT` or `COMPLETED`, completion of a draft, and cancellation of either a draft or completed order with atomic inventory and customer-debt synchronization.

This spec intentionally advances the order workflow beyond the former Phase 1 quick-sale-only boundary. Sales returns, draft editing, receipt/refund documents, tax, multi-warehouse selection, offline persistence, consultation context, and pricing-tier expansion remain out of scope.

## Requirements

### Requirement 1: Tenant-Scoped Order Query

**Objective:** As a tenant user, I want to find and inspect sales orders, so that I can manage real store transactions instead of mock records.

#### Acceptance Criteria

- **R1.1** When an authorized tenant user requests `GET /tenant/sales/orders`, the Sales Order API shall return only `ORDER` channel sales for that tenant, ordered by `soldAt` descending then `id` descending, with `items`, `page`, `pageSize`, and `total`.
- **R1.2** When `search`, `status`, `page`, or `pageSize` is supplied, the Sales Order API shall search document number and customer snapshot name case-insensitively, apply the status filter, require positive page values, and cap `pageSize` at 20.
- **R1.3** When an authorized tenant user requests `GET /tenant/sales/orders/:id`, the Sales Order API shall return the order, snapshot customer identity, persisted line snapshots, totals, payment/debt fields, note, lifecycle timestamps, and status.
- **R1.4** If an order does not exist, belongs to another tenant, is soft-deleted, or is not an `ORDER` channel sale, the Sales Order API shall return HTTP 404 without revealing which condition failed.

### Requirement 2: Idempotent Order Creation

**Objective:** As a seller, I want to save an order as a draft or complete it immediately, so that I can support delivery-later and checkout workflows from one form.

#### Acceptance Criteria

- **R2.1** When a valid order creation request is submitted with a tenant-scoped idempotency key and status `DRAFT` or `COMPLETED`, the Sales Order API shall persist one `Sale` with channel `ORDER`, one or more validated lines, the selected customer snapshot if present, server-calculated totals, and the submitted note.
- **R2.2** When an order is created as `DRAFT`, the Sales Order API shall persist zero stock movements, make zero stock quantity changes, make zero customer balance changes, and create zero debt-ledger entries.
- **R2.3** If a product, sale unit, customer, amount, discount, payment method, default warehouse, or line is invalid for the caller tenant, the Sales Order API shall return a typed HTTP 422 response and persist no part of the order.
- **R2.4** When an order is created as `COMPLETED`, the Sales Order API shall execute the same inventory, payment, debt, concurrency, and rollback invariants as a draft completion within the creation transaction.
- **R2.5** When an equivalent creation request is retried with the same tenant-scoped idempotency key, the Sales Order API shall return the original order without duplicate sale, line, stock, or debt writes; if the key is reused with a different payload or channel, it shall return HTTP 409.

### Requirement 3: Atomic Draft Completion

**Objective:** As a seller, I want to complete a draft exactly once, so that inventory and customer debt remain correct under retries and concurrent actions.

#### Acceptance Criteria

- **R3.1** When an authorized user completes a `DRAFT` order with valid settlement data, the Sales Order API shall atomically transition it to `COMPLETED`, set `completedAt`, and preserve its persisted customer, lines, prices, discount, and note.
- **R3.2** When completion commits, the Sales Order API shall conditionally decrement default-warehouse stock by each persisted line's base quantity and create exactly one `OUT` and `SALE` stock movement per line with the sale and sale-line references.
- **R3.3** When completion leaves an unpaid amount, the Sales Order API shall require an active tenant customer, increment that customer's balance by the exact debt amount, and create exactly one `SALE`, `INCREASE` debt-ledger entry with the committed `balanceAfter`; otherwise it shall create no debt entry.
- **R3.4** If stock is insufficient or any validation, stock, movement, customer, debt, entitlement, or status write fails, the Sales Order API shall roll back the lifecycle transition and every financial or inventory side effect.
- **R3.5** When the same completion is retried after success, the Sales Order API shall return the existing completed order without repeating side effects; if the order is `CANCELLED`, it shall return HTTP 409.

### Requirement 4: Atomic Cancellation and Compensation

**Objective:** As a seller, I want to cancel an erroneous order safely, so that order status, inventory, and debt do not diverge.

#### Acceptance Criteria

- **R4.1** When a `DRAFT` order is cancelled, the Sales Order API shall transition it to `CANCELLED` without creating stock movements, changing stock, changing customer balance, or creating debt entries.
- **R4.2** When an eligible `COMPLETED` order is cancelled, the Sales Order API shall atomically restore each line's base quantity, create exactly one compensating `IN` and `SALE_CANCEL` stock movement per line, decrement the original customer debt amount when non-zero, create one `ADJUST`, `DECREASE` debt-ledger entry with the committed `balanceAfter`, and transition the order to `CANCELLED`.
- **R4.3** If a completed order has a completed sales return or its customer's current balance is lower than the order's original debt amount, the Sales Order API shall return HTTP 409 and perform no status, inventory, or debt mutation.
- **R4.4** When cancellation of an already `CANCELLED` order is retried, the Sales Order API shall return the existing cancelled order without repeating compensation; when cancellation targets any unsupported state, it shall return HTTP 409.
- **R4.5** When completion and cancellation race for the same draft, the Sales Order API shall commit exactly one legal transition and shall leave no duplicate or partial stock/debt effects.

### Requirement 5: Authorization, Entitlements, and Isolation

**Objective:** As a tenant owner, I want sales-order access constrained by tenant, role, and subscription, so that business data and mutations remain isolated.

#### Acceptance Criteria

- **R5.1** The Sales Order API shall require a valid tenant access token, `sales:view` for list/detail, `sales:create` for creation, and `sales:edit` for completion/cancellation.
- **R5.2** The Sales Order API shall require the existing `advanced_mode` entitlement for all order endpoints, assert `inventory` inside each stock-affecting transaction, and additionally assert `debt` inside a transaction that creates or compensates customer debt.
- **R5.3** The Sales Order API shall derive tenant and actor identity only from the verified access token and shall tenant-scope every order, product, customer, warehouse, stock, movement, and debt query or mutation.
- **R5.4** If authentication, permission, entitlement, tenant ownership, or object-level authorization fails, the Sales Order API shall return HTTP 401, 403, or 404 as appropriate and perform no mutation.

### Requirement 6: Real Order List and Detail UI

**Objective:** As a store user, I want the existing order screens to show live server state, so that I can trust what I see and act on it.

#### Acceptance Criteria

- **R6.1** When `/don-ban-hang` loads, the UI shall fetch the authenticated order list and render distinct loading, retryable error, empty, filtered-empty, and success states without importing seeded orders at runtime.
- **R6.2** When the user searches or changes status, the UI shall query the server, reset desktop pagination to page 1 and mobile accumulation to the first batch, display 10 rows per desktop page, and append up to 8 additional mobile cards per load until `total` is reached.
- **R6.3** When `/don-ban-hang/:id` loads, the UI shall fetch the authenticated order detail and render server snapshots, totals, payment/debt state, note, lifecycle status, loading, retryable error, and not-found behavior.
- **R6.4** When the user starts cancellation from list or detail, the UI shall use the existing two-step inline confirmation, disable duplicate submission, preserve the visible order on failure, show an actionable Vietnamese error, and refresh from the canonical server response on success.

### Requirement 7: Real Create and Lifecycle UI

**Objective:** As a seller, I want the existing order form and detail actions connected to real APIs, so that drafts, checkout, and debt work without losing entered data.

#### Acceptance Criteria

- **R7.1** When the order form opens, the UI shall use real tenant products and real tenant customers, include a valid sale `unitId` for every line, and keep customer selection optional unless an unpaid completion is requested.
- **R7.2** When the user saves a draft, the UI shall submit one stable idempotency key, disable duplicate submission, navigate to the canonical server order on success, and preserve all form state with a retry action on failure.
- **R7.3** When the user completes from the create form or a draft detail, the UI shall collect `CASH`, `BANK_TRANSFER`, `QR`, partial-payment, or full-debt settlement through the existing payment interaction, require a customer for any unpaid amount, and submit the settlement once with retry-safe state.
- **R7.4** When completion or cancellation succeeds, the UI shall replace local lifecycle assumptions with the returned server order, refresh affected product stock and customer debt views where already reachable, and navigate or re-render without a full browser reload.
- **R7.5** The order workflow shall not import mock customer/order records at runtime, and the shared real-customer picker shall preserve the existing `/ban-nhanh` anonymous-customer and selected-customer behavior.

## Non-Functional Requirements

### Requirement 8: Performance, Security, Reliability, and Accessibility

**Objective:** As a system owner, I want the sales-order workflow measurable and recoverable, so that it is safe to release on mobile and desktop.

#### Acceptance Criteria

- **R8.1** The list API shall cap `pageSize` at 20 and achieve p95 response time below 500 ms across at least 30 warm requests against a tenant fixture containing 1,000 orders.
- **R8.2** The API shall return explicit JSON-safe DTOs with integer VND amounts and shall not serialize unrestricted Prisma records or sensitive internal fields.
- **R8.3** The implementation shall provide unit, component/integration, and E2E proof for tenant isolation, permissions, entitlement denial, cross-channel idempotency conflict, draft side-effect freedom, exact-once completion, completed cancellation compensation, insufficient-stock rollback, debt-compensation rejection, and complete-versus-cancel concurrency.
- **R8.4** The UI shall meet `DESIGN.md` requirements for WCAG AA contrast, minimum 16 px body text, minimum 48 by 48 px mobile touch targets, visible labels and focus, keyboard/Escape operation, text-backed statuses, mobile cards, desktop tables, sticky mobile actions, and no sales/inventory/debt API caching.

## Unresolved Questions

- None. The user's explicit selection to preserve the full existing UI authorizes cancellation of completed orders; this spec applies the compensating policy in R4 rather than the older immutable-completed guidance.
