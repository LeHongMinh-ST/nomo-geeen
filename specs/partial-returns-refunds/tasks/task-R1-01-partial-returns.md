# Task R1-01: Partial sales/purchase returns and refund boundary

**Requirement:** R1–R7 — Partial returns, settlement boundary, CAS, tenant/audit/idempotency, tests
**Status:** done
**Priority:** P1
**Estimated Effort:** 3-5 days after livestock-cas-recovery
**Dependencies:** specs/livestock-cas-recovery (CAS full returns done); specs/sales-return-core; specs/purchase-return-core
**Spec:** specs/partial-returns-refunds/
Contracts: PartialSalesReturnRequest, PartialPurchaseReturnRequest, PartialReturnErrorReasons

## Context

- **Why**: Audit §8.5 Luồng C — full returns exist; partial qty caps, multi-return, refund/debt boundary, batch CAS still open.
- **Current state**: `SalesReturnsService.createFullReturn` / `PurchaseReturnsService.createFullReturn`; note-only DTOs; one COMPLETED return per original; purchase path has version CAS; `SalesReturnLine` lacks saleLineId/batchId.
- **Target outcome**: Partial return APIs with remaining-qty enforcement, ProductBatch CAS, audit, idempotency, debt boundary; livestock healthState unchanged on restore.

## Constraints

- **MUST**: Serializable single transaction; tenant from auth; qty ≤ remaining; CAS version; never auto-set HEALTHY.
- **SHOULD**: Reuse full-return service modules; shared remaining-qty helper.
- **MUST NOT**: Start implement while livestock-cas-recovery CAS incomplete without blocker; silent cash refund; mutate original sale/purchase lines.
- **SCOPE**: Backend partial return + tests only; no FE unless later approved. Map all R1–R7 acceptance criteria in scope_lock.

## Steps

- [x] 1. Confirm livestock-cas-recovery R1-01/R1-02 CAS evidence on full returns; if missing keep task blocked.
  - Business: depend on stable batch version contract.
  - Code: read recovery design + full return services.
  - _Requirements: 4.1, 4.2, 4.3_
- [x] 2. Schema: return line linkage (saleLineId/batchId or purchaseLineId), optional idempotencyKey; migration + prisma validate.
  - Business: allocation-accurate partials and safe retries.
  - Code: `backend/prisma/schema.prisma` + migration only after product open Qs decided.
  - _Requirements: 1.1, 2.1, 5.3_
- [x] 3. Remaining-returnable calculator (sum prior completed return lines) + unit tests.
  - Business: no over-return / no double restore.
  - Code: pure helper used inside serializable tx.
  - _Requirements: 1.2, 1.3, 2.2, 7.1_
- [x] 4. `createPartialReturn` sales path: DTO lines, stock IN, batch CAS increment, movements, audit.
  - Business: partial sales return document.
  - Code: `sales-return.service.ts`, DTO, controller.
  - _Requirements: 1.1, 1.4, 1.5, 4.1, 4.4, 4.5, 5.1, 5.2, 5.4_
- [x] 5. `createPartialReturn` purchase path: stock OUT, batch CAS decrement, movements, audit.
  - Business: partial purchase return document.
  - Code: `purchase-return.service.ts`, DTO, controller.
  - _Requirements: 2.1, 2.3, 2.4, 4.2, 5.1, 5.2, 5.4_
- [x] 6. Settlement: debt ADJUST per approved formula; cash REFUND only if product mode approved else fail closed.
  - Business: inventory vs money boundary.
  - Code: DebtLedger; optional PaymentVoucher; no silent payout.
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
- [x] 7. Idempotency replay + permission gates (`sales:edit` / `purchase:edit`).
  - _Requirements: 5.3, 7.2_
- [x] 8. Acceptance tests for R6 cases (qty, CAS, settlement, tenant, health).
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

## Requirements

- 1.1 — Partial sales return create
- 1.2 — Qty exceeds remaining reject
- 1.3 — Fully returned reject further
- 1.4 — Stock/batch restore partial only; original immutable
- 1.5 — Invalid sale reject
- 2.1 — Partial purchase return create
- 2.2 — Purchase qty cap
- 2.3 — Purchase stock/batch decrease
- 2.4 — Invalid purchase reject
- 3.1 — Inventory vs monetary boundary
- 3.2 — Debt adjust partial
- 3.3 — Cash-paid fail-closed / explicit refund
- 3.4 — Tenant ledger refs
- 4.1 — Sales batch CAS
- 4.2 — Purchase batch CAS
- 4.3 — CAS conflict rollback
- 4.4 — No auto HEALTHY
- 4.5 — Server re-read version
- 5.1 — Tenant scope
- 5.2 — Audit
- 5.3 — Idempotency
- 5.4 — Serializable atomicity
- 6.1 — Qty path tests
- 6.2 — CAS tests
- 6.3 — Settlement tests
- 6.4 — Tenant/idempotency tests
- 6.5 — Health unchanged tests
- 7.1 — Concurrency safety
- 7.2 — Permissions

<!-- contract:PartialSalesReturnRequest -->
```json
{
  "idempotencyKey": "string?",
  "note": "string?",
  "settlementMode": "DEBT_ADJUST_ONLY | NONE | REFUND_VOUCHER?",
  "debtAdjust": "bigint-string?",
  "lines": [
    {
      "saleLineId": "uuid",
      "batchId": "uuid?",
      "qtyBase": "decimal-string"
    }
  ]
}
```

<!-- contract:PartialPurchaseReturnRequest -->
```json
{
  "idempotencyKey": "string?",
  "note": "string?",
  "settlementMode": "DEBT_ADJUST_ONLY | NONE | REFUND_VOUCHER?",
  "debtAdjust": "bigint-string?",
  "lines": [
    {
      "purchaseLineId": "uuid",
      "batchId": "uuid?",
      "qtyBase": "decimal-string"
    }
  ]
}
```

<!-- contract:PartialReturnErrorReasons -->
```text
SALE_NOT_RETURNABLE | PURCHASE_NOT_RETURNABLE
RETURN_QTY_EXCEEDS_REMAINING
SALE_ALREADY_RETURNED | PURCHASE_ALREADY_RETURNED
STOCK_RETURN_CONFLICT | BATCH_RETURN_CONFLICT | STALE_VERSION
DEBT_RETURN_CONFLICT
SETTLEMENT_REQUIRED | SETTLEMENT_NOT_SUPPORTED
```

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/sales-return.service.ts` | Modify | Partial sales return + remaining + CAS |
| `backend/src/platform/sales/sales-return.service.spec.ts` | Modify | Acceptance tests sales |
| `backend/src/platform/sales/dto/create-sales-return.dto.ts` | Modify | Partial lines DTO |
| `backend/src/platform/sales/sales.controller.ts` | Modify | Route for partial |
| `backend/src/platform/purchases/purchase-return.service.ts` | Modify | Partial purchase return |
| `backend/src/platform/purchases/purchase-return.service.spec.ts` | Modify | Acceptance tests purchase |
| `backend/src/platform/purchases/dto/create-purchase-return.dto.ts` | Modify | Partial lines DTO |
| `backend/src/platform/purchases/purchases.controller.ts` | Modify | Route wiring |
| `backend/src/platform/debts/debts.service.ts` | Read | Settlement patterns |
| `backend/prisma/schema.prisma` | Modify | Return line linkage + idempotency if approved |
| `specs/livestock-cas-recovery/design.md` | Read | CAS + no HEALTHY contract |

## Completion Criteria

- [x] Partial sales and purchase returns accept multi-line qty under remaining caps
- [x] Over-return and fully-returned paths reject with structured reasons, zero side effects
- [x] Batch CAS conflict rolls back entire document
- [x] Debt/refund boundary matches approved settlementMode (fail closed if cash not approved)
- [x] healthState unchanged on livestock batch restore
- [x] Idempotent replay safe; tenant isolation proven
- [x] Focused tests + build + prisma validate pass with receipt

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sales-return.service.spec.ts src/platform/purchases/purchase-return.service.spec.ts`
  - Expected proof: PASS including partial/over/CAS/debt/idempotency/health cases
  - **Result 2026-07-25:** Test Suites: 3 passed; Tests: 18 passed. Receipt: `specs/partial-returns-refunds/verification-receipt-R1-01.md`
- [x] Artifact / runtime verification
  - Inspect: return rows + stock movements + debt ledger for partial qty; original sale/purchase unchanged
- [x] Runtime reachability verification
  - Entrypoint/caller: sales/purchases controller return routes resolve partial service methods
  - Expect: providers wired in SalesModule / PurchasesModule
- [x] Contract / negative-path verification
  - Check: foreign tenant, over qty, stale version, cash refund without mode
  - Expect: structured errors, no stock/debt mutation

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| livestock CAS not ready | High | Blocker until recovery CAS done |
| Debt formula wrong | High | Product open Q; fail closed |
| Schema missing batch on SalesReturnLine | High | Migration first after decision |
| Double restore race | High | Serializable + remaining sum in tx |
