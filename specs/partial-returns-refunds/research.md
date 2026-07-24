# Research — partial-returns-refunds

## Summary

- **Feature**: `partial-returns-refunds` (Luồng C)
- **Discovery Scope**: Extension of full return cores + livestock CAS handoff
- **Key Findings**:
  - Full sales/purchase return services exist; DTOs are note-only; one completed return per original document.
  - `SalesReturnLine` has no `batchId` / `saleLineId`; full sales return restores via `SaleLineBatch` but return lines store product/qty only.
  - Full returns already do debt ADJUST for full `debtAmount`; cash refund / PaymentVoucher refund not modeled on return path.
  - `livestock-cas-recovery` explicitly owns batch version CAS + no silent HEALTHY; partial handoff contract in design.

## Evidence Summary

- **Codebase Scout**: Required
  - Result: Full return atomic paths + schema gaps for partial allocation/idempotency documented below.
  - Relevant files/modules:
    - `backend/src/platform/sales/sales-return.service.ts`
    - `backend/src/platform/purchases/purchase-return.service.ts`
    - `backend/src/platform/debts/debts.service.ts`
    - `backend/prisma/schema.prisma` (`SalesReturn`, `PurchaseReturn`, `SaleLineBatch`, `DebtLedger`, `PaymentVoucher`)
    - `specs/livestock-cas-recovery/design.md` § Partial return contract
  - Existing patterns: Serializable tx; `STOCK_RETURN_CONFLICT` / `BATCH_RETURN_CONFLICT` / `DEBT_RETURN_CONFLICT`; audit `SALE_RETURN` / `PURCHASE_RETURN`; purchase-return already CAS version on decrease (code drift vs sales-return-core task era).
  - Tests: `sales-return.service.spec.ts`, `purchase-return.service.spec.ts`
- **External / Current Research**: Skipped
  - Rationale: Internal domain extension; inventory return + debt patterns already in-repo; no third-party API.
- **Selected Decision**:
  - Extend return services with partial line input + remaining-qty ledger checks + CAS; keep refund cash as separate boundary; block implement until livestock-cas-recovery CAS contract stable.
- **Rejected Alternatives**:
  - Mutate original Sale lines — rejects catalog immutability of completed docs.
  - Auto HEALTHY on livestock return — rejects livestock design / recovery flag.
  - Single mega refund+return API inventing payment rails without debt module reuse — YAGNI; reuse PaymentVoucher when cash refund approved.
- **Remaining Gaps / Questions**:
  - Returnable storage model; cash refund mode; debt pro-rata; SalesReturnLine schema for batches.
- **Downstream Task & Test Implications**:
  - Schema migration likely for return lines + idempotencyKey; heavy service/unit tests; no FE in this spec.

## Codebase Scout

| Area | Finding | Evidence / Path | Implication |
|------|---------|-----------------|-------------|
| Full sales return | One COMPLETED return; restore all lines/batches; full debt | `sales-return.service.ts` | Partial needs remaining-qty; drop unique “any return” guard or specialize |
| Full purchase return | Full lines; batch CAS decrease already in code | `purchase-return.service.ts` | Partial qty + remaining; mirror CAS |
| Schema | SalesReturnLine: productId, qtyBase, lineTotal only | `schema.prisma` | Need saleLineId/batchId for allocation partials |
| Debt | PaymentVoucher + DebtLedger; return uses ADJUST | debts + return services | Boundary: ADJUST vs REFUND voucher |
| Livestock | Recovery flag + CAS handoff for partial | `livestock-cas-recovery/design.md` | Hard dependency; no auto HEALTHY |
| Audit catalog | Partial returns open | audit §8.5 | This feature closes gap #3 |

## Architecture Pattern Evaluation

| Option | Strengths | Risks | Notes |
|--------|-----------|-------|-------|
| A. Multiple partial return docs + sum(return lines) | Natural audit trail; matches multi-doc reality | Need efficient remaining query | **Selected** |
| B. Single mutable return draft | Simpler uniqueness | Conflicts with completed-immutable style | Reject |
| C. Only adjust stock without return doc | Fast | No audit trail | Reject |

## Dependency note

`livestock-cas-recovery` status at discovery: `in_progress` / code phase; tasks R0-01, R1-01, R1-02 not all done. Partial implement **must not** start until CAS on full return paths verified; if contract B incomplete, keep `ready_for_implementation=false` and blocker in `spec.json`.
