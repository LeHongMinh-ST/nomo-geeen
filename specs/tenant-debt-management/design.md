# Design: Tenant Debt Management

## Canonical Contracts & Invariants

<!-- contract:DEBT_API_V1 -->
GET /tenant/debts?partyType=CUSTOMER|SUPPLIER&search=&status=ALL|OWING|PAID&page=1&pageSize=20
GET /tenant/debts/:partyType/:partyId
POST /tenant/debts/vouchers
POST body: voucherType, partyType, partyId, amount, method, occurredAt?, note?, idempotencyKey
Response: JSON-safe voucher, balanceAfter, ledger, entries, and linked voucher history.

- Tenant and actor identity come only from the access token.
- CUSTOMER + RECEIPT and SUPPLIER + PAYMENT are the only valid pairs.
- Amount is positive integer and no greater than current balance.
- One Prisma transaction contains conditional balance decrement, voucher, line, and DECREASE ledger.
- DebtLedger.balanceAfter equals the committed Customer/Supplier balance.
- Equivalent replay returns the original result; conflicting replay returns 409. Equality is over partyType, partyId, voucherType, amount, method, occurredAt, and note.
- Completed vouchers are immutable.

## Transaction flow

sequenceDiagram: UI -> API -> Prisma transaction -> database commit/rollback -> UI

## Authorization, performance, and rollback
- GET requires debt:view; POST requires debt:collect.
- Invalid or cross-tenant parties return 404 without existence leakage.
- Page size is capped at 20; acceptance measures p95 over at least 30 warm requests for 1,000 parties with pageSize 20 against a 500ms target.
- A forced voucher/ledger failure must leave no balance or document mutation.

## Traceability
| Requirement | Design owner |
|---|---|
| R1.1-R1.4 | DebtService list/detail and GET controller |
| R2.1-R2.5 | voucher transaction and Prisma invariants |
| R3.1-R3.4 | migration, replay comparison, and guards |
| R4.1-R4.4 | tenant debt API client and debt routes |
| R5.1-R5.3 | unit, integration, E2E, build, lint, and reachability |