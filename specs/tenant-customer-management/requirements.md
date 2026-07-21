# Tenant Customer Management Requirements

## Introduction

NomoGreen shall replace the seed-backed `/khach-hang` user-app flow with a tenant-scoped Customer API. Store users shall be able to list and search customers, view a customer's contact details, type, and read-only receivable balance, create and update customers, and soft-delete a customer without breaking historical sales or debt references.

This slice follows base_spec §6 and Simple Mode: a customer directory plus a read-only balance. Phone is the practical identifier because farmers often have no customer code. Transaction/order history rendering, debt collection, opening-balance/credit-limit editing, and customer-specific pricing remain out of scope and are owned by the Sales and Debt specs.

## Requirements

### Requirement 1: Customer records and lookup
**Objective:** As a tenant owner or authorized store user, I want customer records available in my tenant, so that I can find a customer quickly by name or phone.

#### Acceptance Criteria
- **R1.1** When an authorized tenant user requests customers, the system shall return only non-deleted customers belonging to the verified tenant, with stable bounded pagination (default page size ≤ 20) and search by name, phone, or code.
- **R1.2** When an authorized tenant user requests a single customer by id, the system shall return that customer only if it belongs to the verified tenant and is not deleted, and shall otherwise return the existing not-found contract.
- **R1.3** The customer list and detail responses shall include id, name, phone, code, address, type, and the server-derived balance, and shall serialize BigInt balance safely.
- **R1.4** The customer list shall order results deterministically (by name, then id) so pagination is stable across requests.

### Requirement 2: Customer creation and update
**Objective:** As a store user, I want to add and edit customers, so that the directory reflects the people I sell to.

#### Acceptance Criteria
- **R2.1** When an authorized user creates a customer with a non-empty name, the system shall persist the customer scoped to the verified tenant with the submitted phone, code, address, and type, defaulting balance and opening balance to zero.
- **R2.2** If a create or update request has an empty or whitespace-only name, the system shall reject it with a field-addressable validation error and shall not persist any change.
- **R2.3** When an authorized user updates a customer, the system shall apply only the submitted contact fields (name, phone, code, address, type) within the verified tenant and shall never change the customer's balance or opening balance.
- **R2.4** When a customer type is provided, the system shall accept only `RETAIL`, `FARMER`, `FARM`, or `AGENT` and shall reject any other value; type may be omitted.
- **R2.5** The system shall treat customer `code` as optional and shall not require or fabricate a code; phone is the practical identifier and may also be omitted.

### Requirement 3: Customer soft delete and retention
**Objective:** As a store owner, I want to remove a customer without losing history, so that past sales and debts remain intact.

#### Acceptance Criteria
- **R3.1** When an authorized user deletes a customer, the system shall set `deletedAt` (soft delete) and shall not physically remove the row.
- **R3.2** After a customer is soft-deleted, the system shall exclude it from list and detail reads while preserving its references from historical sales, sales returns, and debt ledger entries.
- **R3.3** If a delete targets a customer outside the verified tenant or already deleted, the system shall return the existing not-found contract and shall not mutate data.

### Requirement 4: Read-only balance display
**Objective:** As a store user, I want to see how much a customer owes, so that I know their debt status at a glance — without this module changing that number.

#### Acceptance Criteria
- **R4.1** The customer detail and list shall expose the persisted `balance` value as server-derived, read-only data.
- **R4.2** This module shall never create, update, or delete `Customer.balance`, `openingBalance`, `DebtLedger`, or payment records; balance mutation remains owned by the sales/debt flows.
- **R4.3** The frontend shall present balance and a debt/no-debt state derived from the server balance and shall not compute or persist balance locally.

### Requirement 5: Customer API authorization and tenant isolation
**Objective:** As a tenant owner, I want customer data protected by the existing auth model, so that users cannot read or mutate another tenant's directory.

#### Acceptance Criteria
- **R5.1** The customer controller shall derive `tenantId` and `userId` only from the verified tenant access token and shall never accept them as client-controlled body fields.
- **R5.2** The system shall enforce the existing `customer:view` permission on read routes and `customer:create`, `customer:edit`, `customer:delete` on the matching write routes, returning 401/403 without leaking cross-tenant data.
- **R5.3** A request for a customer outside the verified tenant shall return the existing not-found or authorization contract and shall not reveal whether the record exists.
- **R5.4** Customer routes shall not require an unrelated feature entitlement (no `@RequireFeature`), because the customer directory is a core capability of every plan and no customer feature code exists.

### Requirement 6: Real `/khach-hang` workflow
**Objective:** As a store user, I want `/khach-hang` to reflect real customer records, so that I can manage the directory without seed data.

#### Acceptance Criteria
- **R6.1** When `/khach-hang` loads, the frontend shall fetch tenant customers through an authenticated API client and shall show loading, empty, search/pagination, error, and retry states instead of seed data.
- **R6.2** When a user creates or updates a customer, the frontend shall submit the typed contact contract, disable duplicate submission, and navigate or refresh only after the API succeeds.
- **R6.3** If create, update, or delete fails, the frontend shall preserve form input and show the server error without claiming success or mutating local directory state.
- **R6.4** Customer detail shall fetch the server record, show read-only balance, and expose edit and soft-delete actions that refresh from the API on success.

## Non-Functional Requirements

### Requirement 7: Performance & Scalability
**Objective:** As a store user, I want the customer screen to stay responsive, so that lookups during a sale are fast.

#### Acceptance Criteria
- **R7.1** The customer list shall use bounded server pagination with a default page size of 20 or less and shall not load all tenant customers into the browser.
- **R7.2** Search shall use the existing tenant-scoped indexes (`[tenantId, phone]`, `[tenantId, nameSearch]`) where applicable and shall not require a full table scan for common name/phone lookups.

### Requirement 8: Security & Privacy
**Objective:** As a tenant owner, I want customer contact and balance data isolated, so that it stays confidential to my tenant.

#### Acceptance Criteria
- **R8.1** Every customer query or write shall include verified tenant scope.
- **R8.2** The API shall reject client-supplied balance, opening balance, tenantId, or deletedAt values and shall derive them server-side.
- **R8.3** Unauthorized and cross-tenant requests shall not reveal whether the referenced customer exists.

### Requirement 9: Reliability & Verification
**Objective:** As an operator, I want the customer module verified, so that isolation and validation regressions are caught before release.

#### Acceptance Criteria
- **R9.1** Backend unit/controller and E2E tests shall cover create/update validation, soft delete, tenant isolation, and permission denial before the spec is marked ready.
- **R9.2** Frontend client tests and build/lint shall cover the typed customer API client and the migrated list/detail/form/delete flow with no seed fallback.

## Unresolved Questions

- The `Customer` schema does not enforce a unique code (unlike Supplier). This spec deliberately does not promise code uniqueness; if the business later requires it, a migration and a new requirement are needed.
- `nameSearch` is a separate normalized column. This slice may populate it on write for accent-insensitive search, but that is an additive implementation detail, not a contract; if left null, search falls back to name/phone `contains`.
