# Tenant Purchase Management Requirements

## Introduction

NomoGreen shall replace the seed-backed `/nhap-hang` and `/ton-kho` user-app flows with tenant-scoped APIs. Store users shall be able to manage suppliers, create purchase drafts, complete a purchase with purchase-unit conversion, and see the resulting stock and supplier payable consistently.

The first slice follows Simple Mode: one server-selected default warehouse and one completion transaction. Purchase returns, supplier payment vouchers, advanced receiving, and multi-warehouse workflows remain out of scope.

## Requirements

### Requirement 1: Supplier management and lookup
**Objective:** As a tenant owner or authorized store user, I want supplier records available to purchase flows, so that each purchase is linked to a real supplier in my tenant.

#### Acceptance Criteria
- **R1.1** When an authorized tenant user requests suppliers, the system shall return only active, non-deleted suppliers belonging to the verified tenant, with stable pagination and search by code, name, or phone.
- **R1.2** When an authorized tenant user creates or updates a supplier, the system shall validate a tenant-unique code and non-empty name and shall persist the change without allowing a supplier from another tenant to be referenced.
- **R1.3** If a supplier is deleted or inactive, the system shall reject new purchase creation that references it while preserving historical purchase references.
- **R1.4** The supplier API shall require the existing tenant access guard, supplier permission, and the configured supplier feature entitlement for write operations.

### Requirement 2: Purchase draft lifecycle
**Objective:** As a store user, I want to save and inspect a purchase draft, so that I can prepare an incoming goods document before applying stock effects.

#### Acceptance Criteria
- **R2.1** When an authorized user creates a purchase draft with a valid supplier, line, unit, quantity, price, and default warehouse, the system shall persist `DRAFT` purchase and purchase-line records with server-calculated totals.
- **R2.2** While a purchase is `DRAFT`, the system shall not change `Stock`, `StockMovement`, `Supplier.balance`, or supplier `DebtLedger` rows.
- **R2.3** When a user lists or requests purchase details, the system shall return only tenant-scoped records and shall include supplier, product, unit, conversion, payment, totals, and lifecycle fields needed by `/nhap-hang`.
- **R2.4** If a user attempts to edit or cancel a `COMPLETED` or already `CANCELLED` purchase, the system shall reject the transition and leave all financial and inventory records unchanged.

### Requirement 3: Unit conversion and monetary validation
**Objective:** As a store user, I want to enter the supplier's purchase unit, so that inventory is increased in the product base unit without arithmetic ambiguity.

#### Acceptance Criteria
- **R3.1** When a purchase line uses a product base unit, the system shall set `qtyBase` equal to the submitted positive quantity.
- **R3.2** When a purchase line uses a valid product conversion enabled for purchase, the system shall calculate `qtyBase = qty × factorToBase` using Decimal arithmetic and shall store both submitted quantity and derived base quantity.
- **R3.3** If the submitted unit is not the product base unit and has no valid tenant/product conversion with a positive finite factor, the system shall reject the whole purchase with a field-addressable validation error.
- **R3.4** The system shall calculate line totals and document totals from validated integer VND amounts, reject negative discount, shipping, price, or quantity values, and reject a discount greater than the subtotal.
- **R3.5** The frontend shall show the selected purchase unit, conversion factor, derived base quantity, and calculated line/document totals before submission.

### Requirement 4: Atomic purchase completion and stock effects
**Objective:** As a store owner, I want completion to update inventory exactly once, so that stock and purchase records never disagree.

#### Acceptance Criteria
- **R4.1** When a valid `DRAFT` purchase is completed, the system shall atomically set its status to `COMPLETED`, set `completedAt`, increment default-warehouse stock by each line's `qtyBase`, and create one `IN` `StockMovement` per line with reason `PURCHASE` referencing the purchase and line.
- **R4.2** When a purchase is already `COMPLETED`, a repeated completion request shall return the existing completed result without incrementing stock or creating duplicate movements.
- **R4.3** If any completion validation or persistence step fails, the system shall roll back the purchase status, stock, stock movements, supplier balance, and debt ledger effects as one transaction.
- **R4.4** The completion operation shall be safe under concurrent requests for the same purchase and shall never apply stock effects more than once.
- **R4.5** When stock exists for a product and default warehouse, the system shall update its quantity and moving-average cost using the completed purchase's base quantity and allocated line cost; otherwise it shall create the stock row with the purchase cost.

### Requirement 5: Supplier payable and payment effects
**Objective:** As a store owner, I want payment and debt recorded with the purchase, so that supplier balances reflect what remains unpaid.

#### Acceptance Criteria
- **R5.1** When a purchase is completed, the system shall calculate `amountPaid` and `debtAmount` from the validated total and payment input, with `debtAmount = total - amountPaid` when unpaid and never negative.
- **R5.2** If `debtAmount` is greater than zero, the system shall atomically increment the linked supplier's `balance` and create one supplier `DebtLedger` entry with `entryType=PURCHASE`, `direction=INCREASE`, and the purchase reference.
- **R5.3** If the purchase is fully paid, the system shall not create a supplier debt entry and shall leave the supplier balance unchanged.
- **R5.4** The first slice shall not create standalone payment vouchers; payment method and amount paid remain purchase fields until the supplier-payment spec is approved.

### Requirement 6: Purchase API authorization and tenant isolation
**Objective:** As a tenant owner, I want purchase data protected by the existing auth model, so that users cannot read or mutate another tenant's inventory or payable.

#### Acceptance Criteria
- **R6.1** The purchase and supplier controllers shall derive `tenantId` and `userId` only from the verified tenant access token and shall never accept them as client-controlled body fields.
- **R6.2** The system shall enforce the existing `purchase:*`, `supplier:*`, and `inventory` permission/entitlement boundaries on each route, returning 401/403 without leaking cross-tenant data.
- **R6.3** A request for a purchase, supplier, product, conversion, warehouse, stock, or debt party outside the verified tenant shall return the existing not-found or authorization contract and shall not mutate data.
- **R6.4** Completion shall accept a client idempotency key or equivalent stable retry contract and shall return a conflict for the same key with a different logical payload.

### Requirement 7: Real `/nhap-hang` workflow
**Objective:** As a store user, I want `/nhap-hang` to reflect real purchase records, so that I can create, complete, inspect, and cancel purchases without seed data.

#### Acceptance Criteria
- **R7.1** When `/nhap-hang` loads, the frontend shall fetch tenant purchases and suppliers through authenticated API clients and shall show loading, empty, pagination/filter, error, and retry states.
- **R7.2** When a user saves a draft or completes a purchase, the frontend shall submit the typed supplier, lines, conversion, totals, and payment contract, disable duplicate submission, and navigate or refresh only after the API succeeds.
- **R7.3** If creation or completion fails, the frontend shall preserve the form lines and show the server error without claiming success or mutating local stock/purchase state.
- **R7.4** Purchase detail shall fetch the server record and expose only valid lifecycle actions; completion and cancellation shall refresh from the API.

### Requirement 8: Real `/ton-kho` inventory visibility
**Objective:** As a store user, I want `/ton-kho` to show stock produced by purchases and sales, so that inventory decisions use durable data.

#### Acceptance Criteria
- **R8.1** When `/ton-kho` loads, the frontend shall fetch tenant products with stock and inventory details from the API rather than importing seed products or seed inventory.
- **R8.2** The inventory list shall calculate filters and alert counts from the fetched stock and batch/expiry fields, and shall refresh after a successful purchase completion.
- **R8.3** Inventory detail shall show current server quantity, base unit, average cost, and stock movements, and shall not apply local-only adjustment effects in this slice.
- **R8.4** If inventory loading fails, the page shall show an actionable error and shall not display seed values as if they were current tenant data.

## Non-Functional Requirements

### Requirement 9: Performance & Scalability
**Objective:** As a store user, I want purchase and inventory screens to remain usable, so that normal retail operations are not delayed by unnecessary requests.

#### Acceptance Criteria
- **R9.1** The purchase list and inventory list shall use bounded server pagination with a default page size of 20 or less and shall not load all tenant history into the browser.
- **R9.2** For a purchase containing at most 100 lines, the API shall complete validation and persistence within 1000 ms at the service layer in the project integration test environment, excluding database startup.

### Requirement 10: Security & Privacy
**Objective:** As a tenant owner, I want financial and inventory data isolated, so that purchase records and supplier balances remain confidential.

#### Acceptance Criteria
- **R10.1** Every purchase, supplier, stock, movement, and debt query or write shall include verified tenant scope or a relation constrained by verified tenant scope.
- **R10.2** The API shall reject client-supplied totals, `qtyBase`, supplier balance, stock quantity, or debt balance when they differ from server-derived values.
- **R10.3** Unauthorized and cross-tenant requests shall not reveal whether the referenced record exists.

### Requirement 11: Reliability & Availability
**Objective:** As an operator, I want failed purchase operations to be diagnosable and retryable, so that inventory cannot require manual repair after transient errors.

#### Acceptance Criteria
- **R11.1** If completion fails after any write begins, the system shall roll back all effects and return a stable error reason suitable for frontend retry.
- **R11.2** The system shall write auditable `StockMovement` and `DebtLedger` references for every completed purchase effect and shall preserve completed purchase history from supplier deletion.
- **R11.3** Backend unit/integration tests and frontend build/lint/test checks shall cover successful, unauthorized, duplicate, conversion-invalid, and rollback paths before the spec is marked ready.

## Unresolved Questions

- The existing schema has no explicit purchase idempotency key column. The approved design adds the smallest nullable Purchase.idempotencyKey field with a tenant-scoped unique constraint and migration; the client key is required for mutation retries.
- Existing frontend inventory adjustment UI is seed/local-only; this spec intentionally keeps adjustment mutation deferred while replacing visibility with server data.
