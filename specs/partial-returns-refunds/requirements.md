# Requirements — partial-returns-refunds (Luồng C)

## Introduction

Extend full sales/purchase return cores with **partial** line returns, enforceable **returnable quantity** caps, **refund/payment/debt ledger** boundaries, and **ProductBatch CAS** consistent with `livestock-cas-recovery`. Original Sale/Purchase documents remain immutable. Livestock health is never silently recovered to `HEALTHY` on return.

Evidence sources: `docs/audit-core-business-catalog-2026-07-22.md` §8.5, `docs/core-business-catalog.md` §11/§13, `specs/sales-return-core`, `specs/purchase-return-core`, `specs/livestock-cas-recovery/design.md` (partial return handoff).

## Requirements

### Requirement 1: Partial sales return

**Objective:** As a tenant user with `sales:edit`, I want to return part of a completed sale by line and batch allocation, so that stock and debt reflect only returned quantity.

#### Acceptance Criteria

- **R1.1** When a tenant-scoped `POST` partial sales return targets a `COMPLETED` sale, the system shall create a completed `SalesReturn` (or equivalent document) with only requested lines/qty in one serializable transaction.
- **R1.2** When requested return `qtyBase` for a sale line (or `SaleLineBatch` allocation) exceeds remaining returnable qty (original sold qty minus sum of prior completed return lines for that sale/line/batch), the system shall reject with a structured reason (e.g. `RETURN_QTY_EXCEEDS_REMAINING`) and shall not mutate stock, batch, debt, or audit.
- **R1.3** When remaining returnable for all lines is zero (fully returned via one full or many partials), the system shall reject further returns with `SALE_ALREADY_RETURNED` or `RETURN_QTY_EXCEEDS_REMAINING` and shall not double-restore stock.
- **R1.4** When partial return succeeds, the system shall restore aggregate `Stock.qty` and each allocated `ProductBatch.qtyOnHand` by returned qty only, append `SALE_RETURN` stock movements, and leave the original `Sale` / `SaleLine` / `SaleLineBatch` rows unchanged.
- **R1.5** When sale is missing, foreign-tenant, draft, cancelled, or soft-deleted, the system shall reject without stock/debt writes.

### Requirement 2: Partial purchase return

**Objective:** As a tenant user with `purchase:edit`, I want to return part of a completed purchase to the supplier, so that stock and supplier debt decrease only for returned qty.

#### Acceptance Criteria

- **R2.1** When a tenant-scoped partial purchase return targets a `COMPLETED` purchase, the system shall create a completed `PurchaseReturn` with requested lines/qty in one serializable transaction.
- **R2.2** When requested `qtyBase` exceeds remaining returnable for that purchase line/batch (received qty minus prior completed purchase-return lines), the system shall reject with structured reason and no mutations.
- **R2.3** When partial purchase return succeeds, the system shall decrement `Stock` and original `ProductBatch` by returned qty (CAS), append `PURCHASE_RETURN` movements, and leave original `Purchase` / lines immutable.
- **R2.4** When purchase is not returnable (status/tenant/missing), the system shall reject without mutations.

### Requirement 3: Refund / payment / debt ledger boundary

**Objective:** As finance operator, I want return stock effects separated from cash refund and debt compensation, so that ledgers stay auditable.

#### Acceptance Criteria

- **R3.1** The system shall treat inventory return and monetary settlement as distinct steps in the domain model: stock/batch movements always on the return document; cash refund only via explicit payment/refund path (PaymentVoucher or approved equivalent), never as a silent side-effect of stock-only return without declared settlement mode.
- **R3.2** When original sale/purchase had `debtAmount > 0`, partial return shall decrease party balance by at most the proportional or line-allocated debt share for returned amount (policy: open question if pro-rata by lineTotal vs explicit `debtAdjust` input), write `DebtLedger` entry with `refType` return document, and never increase balance incorrectly.
- **R3.3** When original document was fully cash-paid (`debtAmount = 0`, `amountPaid > 0`), the system shall not invent customer cash payout unless a refund settlement mode is provided; unpaid design gap must fail closed or require explicit refund voucher (see open questions).
- **R3.4** Debt and payment ledger rows shall be tenant-scoped, append-only, and reference the return document id.

### Requirement 4: ProductBatch / SaleLineBatch CAS and livestock health

**Objective:** As inventory integrity owner, I want batch qty mutations on partial return to use the same CAS contract as full returns, without silent health recovery.

#### Acceptance Criteria

- **R4.1** When partial sales return restores batch qty, the system shall read current `ProductBatch.version` inside the serializable transaction and `updateMany` with `id + tenantId + version` and `version: { increment: 1 }` (same shape as `livestock-cas-recovery` R6 / design handoff).
- **R4.2** When partial purchase return decrements batch qty, the system shall CAS on `version` and `qtyOnHand gte` returned qty, then increment `version`.
- **R4.3** When CAS count is 0, the system shall surface conflict (`BATCH_RETURN_CONFLICT` / `STALE_VERSION`) and roll back the entire return transaction.
- **R4.4** The system shall **not** set `healthState` to `HEALTHY` (or call recovery) as part of return; returned livestock qty keeps existing health fields. Damaged-return quarantine is out of scope unless product later approves.
- **R4.5** Optional client `expectedBatchVersion` may be accepted later; if absent, server re-read + CAS inside tx is mandatory (per livestock design).

### Requirement 5: Tenant, audit, idempotency, transaction

**Objective:** As platform owner, I want multi-tenant isolation, auditability, and safe retries.

#### Acceptance Criteria

- **R5.1** All loads and mutations shall filter by auth `tenantId`; body/path tenant must not override auth.
- **R5.2** Successful return shall write audit (`SALE_RETURN` / `PURCHASE_RETURN` or agreed partial action codes) with actor, resource, before/after or return totals/qty summary, in the same transaction as stock/debt when possible.
- **R5.3** When client supplies `idempotencyKey` (tenant-scoped), duplicate submit shall return the original return document without double stock/debt mutation (pattern aligned with Sale/PaymentVoucher uniqueness).
- **R5.4** Stock, batch, movements, return lines, debt ledger, and audit for one return document shall commit or roll back together under `Serializable` isolation.

### Requirement 6: Acceptance tests

**Objective:** As implementer/QA, I want automated proof of caps, CAS, boundary, and isolation.

#### Acceptance Criteria

- **R6.1** Unit/service tests shall cover: partial qty success; over-return reject; second partial up to remaining then reject; full-then-partial reject; purchase mirror paths.
- **R6.2** Tests shall cover batch CAS conflict (version mismatch → no partial commit).
- **R6.3** Tests shall cover debt adjust path and cash-paid path behavior per approved settlement policy.
- **R6.4** Tests shall cover foreign-tenant / wrong-status reject and idempotent replay.
- **R6.5** Tests shall assert healthState unchanged on livestock batch restore.

## Non-Functional Requirements

### Requirement 7: Reliability & security

**Objective:** Fail closed under concurrency and cross-tenant access.

#### Acceptance Criteria

- **R7.1** Concurrent overlapping partial returns on the same sale/purchase shall not over-restore or over-decrement (serializable + returnable sum checks + CAS).
- **R7.2** Permission gates remain `sales:edit` (sales return) and `purchase:edit` (purchase return) unless product expands RBAC later.

## Dependency gate

- **Blocked by** `specs/livestock-cas-recovery/` until full-return batch CAS (R5–R6) and recovery policy (no silent HEALTHY) are implemented and verified.
- **Depends on** `specs/sales-return-core/` and `specs/purchase-return-core/` full-return services as extension points.

## Unresolved questions (requirements)

1. Returnable qty storage: computed sum of return lines vs new `returnedQtyBase` columns / allocation ledger table?
2. Cash refund for paid sales: always PaymentVoucher REFUND, optional on return DTO, or out-of-slice (debt-only like full return today)?
3. Debt on partial: pro-rata by `lineTotal`/`total`, FIFO against remaining debt, or required explicit `debtAdjust`?
4. Multiple partial documents: keep unique “one full return” guard only for full path; partials use remaining-qty only — confirm product wording for `SALE_ALREADY_RETURNED`.
5. Schema: `SalesReturnLine` lacks `batchId` / saleLineId today — migration required for allocation-accurate partials?
