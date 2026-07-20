# Requirements Document

## Introduction

NomoGreen shall turn the existing mobile-first `/ban-nhanh` screen from a mock-only checkout into a tenant-scoped online quick-sale flow. The first slice creates completed sales only, uses real tenant products, updates stock atomically, and records customer debt when payment is incomplete or fully deferred.

## Scope Lock

In scope: completed quick-sale API, real tenant product picker, cash/transfer/QR/debt payment submission, stock decrement, stock movement, optional existing customer association, debt ledger entry, idempotent retry, UI loading/error/success states, and backend/frontend acceptance verification.

Out of scope: draft orders, sales returns, customer CRUD/search API, supplier/purchase workflows, disease recommendation flow, offline persistence, receipt printing, tax, multi-warehouse selection, and batch allocation policy.

## Requirements

### Requirement 1: Create a completed tenant quick sale
**Objective:** As a store user, I want to submit the current cart as a completed sale, so that the sale is durable and the inventory reflects what was sold.

#### Acceptance Criteria
- **R1.1** When an authenticated tenant user submits one or more valid sale lines, the system shall create one `Sale` with channel `QUICK_SALE`, status `COMPLETED`, server-generated document number, totals calculated from server-side line values, and the authenticated user as creator.
- **R1.2** When the request includes an optional customer identifier, the system shall accept it only when the customer belongs to the authenticated tenant and is not soft-deleted; otherwise it shall return a validation error without persisting the sale.
- **R1.3** When the request omits a customer identifier, the system shall allow an anonymous sale for cash, transfer, or QR payment.
- **R1.4** The system shall resolve exactly one tenant warehouse where `isDefault=true` and `deletedAt IS NULL` server-side, shall return a stable configuration error when zero or multiple matches exist, and shall not accept a client-supplied tenant or warehouse scope.

### Requirement 2: Apply payment, stock, and debt rules atomically
**Objective:** As a store owner, I want checkout side effects to stay consistent, so that stock and debt cannot disagree with the sale.

#### Acceptance Criteria
- **R2.1** When a sale completes, the system shall create a `SaleLine` for every submitted line with product/name/unit snapshots, quantity, server-derived base quantity using the product's base unit or valid conversion, unit price, line total, and price source.
- **R2.2** When a sale completes, the system shall decrement each tenant product's stock in the resolved warehouse and create an `OUT` `StockMovement` with reason `SALE` referencing the sale and line.
- **R2.3** If any line is locked, recalled, inactive, missing, or has insufficient stock, the system shall reject the whole request with a business error and shall leave `Sale`, `SaleLine`, `Stock`, `StockMovement`, and `DebtLedger` unchanged.
- **R2.4** For a fully paid sale, the system shall set `debtAmount` to zero; for a debt or partial payment, it shall require a valid customer, atomically increment that customer's `balance`, and create a tenant-scoped customer `DebtLedger` sale entry for the unpaid amount.
- **R2.5** The system shall calculate `subtotal`, discount, total, amount paid, change, and debt from validated integer monetary values and shall reject negative values or a payment amount greater than the total plus change rules.

### Requirement 3: Make `/ban-nhanh` use real products and the sale API
**Objective:** As a cashier, I want the quick-sale picker and checkout to reflect current tenant data, so that I do not sell stale or fake products.

#### Acceptance Criteria
- **R3.1** When `/ban-nhanh` loads, the product picker shall fetch tenant products through the existing authenticated API client and shall display name, SKU/barcode match, sale price, base unit, and current stock from the API response.
- **R3.2** The picker shall not allow adding products that are out of stock, locked, recalled, inactive, or absent from the current API result.
- **R3.3** When the user confirms payment, the screen shall send the cart, optional customer identifier, payment method, amount paid, and a unique idempotency key to the quick-sale endpoint, show a pending state, and prevent duplicate submits.
- **R3.4** On a successful response, the screen shall show the returned document number/total/payment result, clear the cart, clear the selected customer, and refresh product availability.
- **R3.5** On a failed response, the screen shall preserve the cart and show a Vietnamese actionable error; a retry shall reuse the same idempotency key for the same checkout attempt.

### Requirement 4: Preserve tenant authorization and retry safety
**Objective:** As a platform operator, I want sales writes isolated and retry-safe, so that users cannot affect another tenant or duplicate a checkout.

#### Acceptance Criteria
- **R4.1** The sales endpoint shall require a valid tenant access token and the existing `sales:create` permission plus the `inventory` feature entitlement.
- **R4.2** The system shall reject product, customer, warehouse, and idempotency-key access that crosses tenant boundaries.
- **R4.3** When the same tenant submits the same idempotency key with the same logical payload, the system shall return the original completed sale result without creating another sale or stock movement.
- **R4.4** When the same idempotency key is reused with a different logical payload, the system shall return a conflict and shall not mutate state.

## Non-Functional Requirements

### Requirement 5: Performance & Scalability
**Objective:** As a cashier, I want checkout to remain responsive for normal carts, so that the sale can finish quickly at the counter.

#### Acceptance Criteria
- **R5.1** The quick-sale API shall respond within 1000 ms at the application boundary for a cart of up to 20 lines when the database is healthy, excluding network transit.
- **R5.2** The product picker shall render the first API-backed result set without waiting for a second per-product request.

### Requirement 6: Security & Privacy
**Objective:** As a tenant owner, I want sales data isolated, so that another tenant cannot read or mutate this tenant's business data.

#### Acceptance Criteria
- **R6.1** The system shall derive tenant and user identity only from the verified tenant access token and shall scope every sale-side query and write by that tenant identity.
- **R6.2** The system shall return 403 for a valid tenant user without `sale:create` and shall return 401 for a missing or invalid tenant access token.

### Requirement 7: Reliability & Availability
**Objective:** As a cashier, I want transient failures to be recoverable, so that a failed checkout does not lose my cart or duplicate a successful sale.

#### Acceptance Criteria
- **R7.1** If the sale transaction fails, the system shall roll back all sale, stock, movement, and debt writes and return a stable business or server error shape.
- **R7.2** If the frontend request fails after the cart is built, the system shall retain the cart until the user receives a successful sale response or explicitly clears it.
