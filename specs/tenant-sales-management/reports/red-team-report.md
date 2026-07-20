# Red Team Review — 2026-07-20

**Scope:** `specs/tenant-sales-management/`
**Review mode:** Red Team required (5 task files; transactional stock/debt and authorization keywords)
**Findings:** 6 (4 accepted, 2 rejected)
**Severity breakdown:** 0 Critical, 4 High, 2 Medium

## Finding 1: Customer balance was not updated
- **Severity:** High
- **Location:** Requirements §Requirement 2, R2.4; Design §Components and Interfaces / Backend service
- **Flaw:** The draft required a `DebtLedger` row but did not require updating the existing `Customer.balance` field.
- **Failure scenario:** A debt sale creates a ledger entry while customer list/detail reads the stale balance, causing the UI to under-report receivables.
- **Evidence:** Original requirement said “create a ... `DebtLedger` sale entry” and the design listed only “DebtLedger for unpaid amount”.
- **Suggested fix:** Require an atomic `Customer.balance` increment and carry it into the service task.
- **Disposition:** Accept
- **Rationale:** Existing schema has `Customer.balance`; omitting it breaks the domain invariant.
- **Applied To:** `requirements.md` R2.4; `design.md` backend service; `tasks/task-R1-01-quick-sale-api.md`.

## Finding 2: Unit conversion was underspecified
- **Severity:** High
- **Location:** Requirements §Requirement 2, R2.1; Design §Backend service
- **Flaw:** The contract accepted `unitId` and `qty` but did not explicitly require server-side conversion to base quantity.
- **Failure scenario:** A client submits one carton while stock is stored as individual units; the API decrements one instead of the configured conversion factor.
- **Evidence:** Original R2.1 only said “quantity, base quantity” without specifying who derives base quantity or validating the conversion.
- **Suggested fix:** Validate base/conversion unit ownership and derive `qtyBase` server-side.
- **Disposition:** Accept
- **Rationale:** The product schema already models conversions and inventory is stored in base units.
- **Applied To:** `requirements.md` R2.1; `design.md` backend service; `tasks/task-R1-01-quick-sale-api.md`.

## Finding 3: Idempotency payload comparison was not implementable
- **Severity:** High
- **Location:** Requirements §Requirement 4, R4.3–R4.4; Design §Backend service
- **Flaw:** “Same logical payload” was required without defining normalization or storage/comparison behavior.
- **Failure scenario:** The same cart with reordered lines or numeric formatting differences is treated as a conflict, while a materially different request may be treated as the same key.
- **Evidence:** Original text required equivalent/different logical payloads but named no canonicalization procedure.
- **Suggested fix:** Define a normalized fingerprint over sorted lines and scalar fields; compare it before returning the prior result.
- **Disposition:** Accept
- **Rationale:** This is required for deterministic retry behavior without adding a migration.
- **Applied To:** `design.md` backend service; `tasks/task-R1-01-quick-sale-api.md`.

## Finding 4: Client-controlled price policy was ambiguous
- **Severity:** High
- **Location:** Design `QuickSaleApi` contract and Requirements R2.5
- **Flaw:** The request includes `unitPrice`, but the draft simultaneously says totals are server-side without stating whether manual price overrides are allowed.
- **Failure scenario:** Implementers either trust a client price without a policy or silently replace the cashier's intentional manual price, causing financial discrepancy.
- **Evidence:** Contract contains `unitPrice`, while R2.5 says the system calculates totals from validated monetary values only.
- **Suggested fix:** Keep `unitPrice` as an intentional cashier override for this slice, validate it as a non-negative integer, and calculate all totals from that accepted value; defer price-floor/role policy to a pricing/RBAC spec.
- **Disposition:** Reject
- **Rationale:** The existing sales UX explicitly supports manual price editing; adding price-floor policy would expand scope. The task already states server validation and calculation.

## Finding 5: Default warehouse selection lacked active/deleted invariant
- **Severity:** Medium
- **Location:** Requirements R1.4 and Design §Backend service
- **Flaw:** The draft said “default active warehouse” in design but did not repeat the exact invariant in the requirement/task contract.
- **Failure scenario:** A tenant with multiple/default soft-deleted warehouses gets an ambiguous or invalid stock target.
- **Evidence:** Requirements only said “default active warehouse server-side”; no deterministic selection rule was stated.
- **Suggested fix:** Select the unique `isDefault=true AND deletedAt IS NULL` warehouse; fail with a stable configuration error if zero or multiple matches exist.
- **Disposition:** Accept
- **Rationale:** This is a small clarification that prevents silent stock routing errors.
- **Applied To:** `requirements.md` R1.4; `design.md` backend service; `tasks/task-R1-01-quick-sale-api.md`.

## Finding 6: Mock customer picker can produce invalid debt IDs
- **Severity:** Medium
- **Location:** Research “Remaining Gaps / Questions”; Task R2-02 Risk Assessment
- **Flaw:** The spec acknowledges customer picker mock data but does not make the UX consequence explicit for debt checkout.
- **Failure scenario:** Cashier selects a seed customer, chooses debt, and receives a backend invalid-customer error every time in a real tenant.
- **Evidence:** `frontend/components/app/sales/customer-picker.tsx` imports `customers` from `frontend/lib/customers.ts`, while the spec sends `customerId` to the real API.
- **Suggested fix:** Either include customer API work or explicitly disable/label debt for mock customer IDs until a customer spec lands.
- **Disposition:** Reject
- **Rationale:** Customer API is outside the user's requested product-picker/sales slice. The canonical scope already permits anonymous paid checkout and requires backend validation; a later customer-management spec must own this UX transition.

## Summary Table

| # | Finding | Severity | Disposition | Applied To |
|---|---|---|---|---|
| 1 | Customer balance omitted | High | Accept | requirements, design, R1 task |
| 2 | Unit conversion underspecified | High | Accept | requirements, design, R1 task |
| 3 | Idempotency normalization underspecified | High | Accept | design, R1 task |
| 4 | Manual price policy ambiguous | High | Reject | Existing UX supports manual price; scope expansion |
| 5 | Default warehouse invariant incomplete | Medium | Accept | requirements, design, R1 task |
| 6 | Mock customer picker debt failure | Medium | Reject | Customer API is out of scope |
