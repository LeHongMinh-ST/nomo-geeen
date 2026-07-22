# Requirements: Tenant Debt Management

## Requirement 1: Debt book
- **R1.1** When an authenticated user with debt:view requests the list, the system shall return tenant-scoped CUSTOMER and SUPPLIER parties with balance and opening balance.
- **R1.2** When filters partyType, search, status, page, or pageSize are supplied, the system shall apply them and cap pageSize at 20.
- **R1.3** When a party detail is requested, the system shall return the authoritative balance, DebtLedger history, and linked PaymentVoucher history newest first.
- **R1.4** If a party is outside the caller tenant or deleted, the system shall return 404 without revealing existence.

## Requirement 2: Receipt and payment transaction
- **R2.1** When a valid CUSTOMER receipt is submitted, the system shall create a RECEIPT voucher and line, decrement Customer.balance, and create one DebtLedger RECEIPT with direction DECREASE and balanceAfter.
- **R2.2** When a valid SUPPLIER payment is submitted, the system shall create a PAYMENT voucher and line, decrement Supplier.balance, and create one DebtLedger PAYMENT with direction DECREASE and balanceAfter.
- **R2.3** When amount is a positive integer no greater than current balance, the system shall accept partial or full settlement using CASH, BANK_TRANSFER, or QR.
- **R2.4** If direction, party, amount, date, or method is invalid, the system shall reject before any financial mutation.
- **R2.5** If any financial write fails, the system shall roll back balance, voucher, line, and ledger together.

## Requirement 3: Authorization and replay
- **R3.1** When an equivalent request is retried with the same tenant-scoped idempotency key, the system shall return the original result without duplicate writes.
- **R3.2** If a key is reused with a different payload, the system shall return 409 and preserve the original state.
- **R3.3** If the caller lacks debt:view or debt:collect, the system shall return 403 and perform no mutation.
- **R3.4** The system shall derive tenant and actor identity from the access token only.

## Requirement 4: Real user workflow
- **R4.1** When /cong-no loads, the UI shall fetch the selected debt direction from the authenticated API and render loading, error, empty, and success states.
- **R4.2** When /cong-no/[id] loads, the UI shall render server balance, DebtLedger entries, and voucher methods.
- **R4.3** When receipt/payment is confirmed, the UI shall submit the correct party, voucher type, amount, and method and refresh the server balance.
- **R4.4** The UI shall preserve DESIGN.md mobile-first rules and shall not use mock data at runtime.

## Requirement 5: Quality and security
- **R5.1** Every endpoint shall enforce tenant isolation and the required permission, with tests for both.
- **R5.2** The list endpoint shall return no more than 20 rows per page and meet a 500ms p95 target measured over at least 30 warm requests for 1,000 parties in acceptance.
- **R5.3** Required backend/frontend build, lint, unit, integration, E2E, rollback, replay, and reachability checks shall be recorded before ready_for_implementation is true.

## Non-Functional Requirements

All money shall be integer VND at the API boundary and BigInt in Prisma persistence. JSON responses shall be JSON-safe.