# Verification receipt — partial-returns-refunds R2-01

**Date:** 2026-07-25
**Task:** tasks/task-R2-01-cash-refund-voucher.md
**Branch:** feat/payment-refund
**Result:** PASS

> Supersedes the row `REFUND_VOUCHER fail-closed | SETTLEMENT_NOT_SUPPORTED` in
> `verification-receipt-R1-01.md:44`. R1-01 intentionally shipped a fail-closed stub;
> R2-01 replaces it with a real voucher + ledger write. The R1-01 receipt is kept
> as-is for history and must not be rewritten.

## Commands (run in this worktree, this session)

```bash
# 1. Prisma client generation (was never generated in this worktree)
cd backend && ./node_modules/.bin/prisma generate --config /tmp/prisma-validate.config.ts
# ✔ Generated Prisma Client (v7.8.0)

# 2. Schema validation
cd backend && ./node_modules/.bin/prisma validate --config /tmp/prisma-validate.config.ts
# The schema at prisma/schema.prisma is valid 🚀

# 3. Focused refund/return specs
cd backend && ./node_modules/.bin/jest --runInBand --runTestsByPath \
  src/platform/sales/refund-settlement.spec.ts \
  src/platform/sales/sales-return.service.spec.ts \
  src/platform/purchases/purchase-return.service.spec.ts
# Test Suites: 3 passed, 3 total
# Tests:       37 passed, 37 total

# 4. Lint (root `biome` bin absent; backend-local binary used)
./backend/node_modules/.bin/biome check <8 changed files>
# First run: Found 2 errors (import ordering, safe fix)
./backend/node_modules/.bin/biome check --write <same 8 files>
# Checked 8 files. Fixed 2 files.
./backend/node_modules/.bin/biome check <same 8 files>
# Checked 8 files in 56ms. No fixes applied.  (clean)

# 5. Build
cd backend && ./node_modules/.bin/nest build
# exit 0, no output

# 6. Full backend suite
cd backend && ./node_modules/.bin/jest
# Test Suites: 1 skipped, 54 passed, 54 of 55 total
# Tests:       1 skipped, 479 passed, 480 total
```

Focused specs were re-run **after** the Biome auto-fix (import reorder touched
`sales-return.service.ts` and `purchase-return.service.ts`) and stayed 37/37.

## Coverage proven (design.md § B10)

| Scenario | Test | Assertion |
|---|---|---|
| Cash refund creates voucher + ledger | sales-return.service.spec `issues a cash refund voucher without touching the customer balance` | `paymentVoucher.create` PAYMENT/CUSTOMER, `debtLedger.create` refType `SALE_RETURN_REFUND`, `balanceAfter: null` |
| Supplier direction mirrored | purchase-return.service.spec `collects a refund receipt from the supplier...` | RECEIPT/SUPPLIER, `refPurchaseId`, refType `PURCHASE_RETURN_REFUND` |
| Debt not double-counted (refund side) | both specs above | `tx.customer.updateMany` / `tx.supplier.updateMany` **not called**; `salesReturn.update` gets `debtAdjust: 0n` |
| Debt not double-counted (adjust side) | `partial return restores only requested qty with CAS` | `tx.paymentVoucher.create` **not called** under DEBT_ADJUST_ONLY |
| Mutual exclusion | `rejects combining a refund voucher with a debt adjustment` (both services) | `SETTLEMENT_REQUIRED` |
| Over-refund vs paid | `rejects a refund above the amount actually paid` / `...beyond the unrefunded paid amount` | `REFUND_EXCEEDS_PAID` |
| Prior refunds shrink the cap | `shrinks the refund cap by refunds already issued on the sale` | aggregate 1100n of 1200n paid → voucher amount 100n |
| Idempotent retry | refund-settlement.spec P2002 case + `replays idempotent partial return without double stock write` | `REFUND_ALREADY_APPLIED`; replay writes no voucher |
| Tenant isolation | `rejects foreign-tenant sale as not found`; all aggregate/create args carry `tenantId` | NotFound; no voucher |
| Rollback leaves stock unchanged | `aborts the transaction when the refund is unpayable, after the stock CAS` | `productBatch.updateMany` ran, then throw → voucher/ledger/balance/`salesReturn.update` all not called; single Serializable `$transaction` aborts the CAS |
| Financial audit | both service specs | `AuditAction.SALE_REFUND` / `PURCHASE_REFUND` on `resource: 'payment_voucher'` with voucherId, docNo, amount, method, party |
| Amount parsing | refund-settlement.spec loop over `abc / 1.5 / 0 / -5` | `REFUND_AMOUNT_INVALID` |

## Contract implemented

- `resolveRefundCap = min(amountPaid − priorRefunded, returnTotal)`; 0 when paid cap ≤ 0.
- `resolveRefundAmount`: absent/empty → full cap; > cap or cap ≤ 0 → `REFUND_EXCEEDS_PAID`; unparseable/≤0 → `REFUND_AMOUNT_INVALID`.
- `sumPriorRefunds` aggregates only `status: 'COMPLETED'` vouchers of the refund-only pairing (CUSTOMER+PAYMENT / SUPPLIER+RECEIPT). That pairing is unreachable via `DebtsService`, so settlement receipts are never counted as refunds.
- Idempotency key `refund:<returnId>` on the existing `@@unique([tenantId, idempotencyKey])`; `P2002` → `REFUND_ALREADY_APPLIED`.
- `docNo`: `RFS-` / `RFP-` + 16 uppercase hex.
- **Party balance and `amountPaid` are deliberately not mutated.** The ledger row is `ADJUST` / `INCREASE` with `balanceAfter: null`, i.e. an audit trail entry, not a balance mutation. `debts.service.ts` is untouched — no payment semantics changed silently, no fake payout created.

## Merge-conflict boundary vs Luồng A

Only one shared file was touched: `backend/prisma/schema.prisma`, and only **additively**
— two new enum members on `AuditAction` (`SALE_REFUND`, `PURCHASE_REFUND`). No model,
field, index, or relation was added, renamed, or removed. The migration
`20260725020000_payment_refund_audit/migration.sql` uses
`ALTER TYPE ... ADD VALUE IF NOT EXISTS`, so it is order-independent and re-runnable
against a database that already carries Luồng A's migrations.

If Luồng A also edits `AuditAction`, the conflict is confined to that single enum block
and resolves by keeping both sides' members. No `ProductKind`, Handbook, or Reports file
was modified in this branch.

## Known gaps (disclosed, not worked around)

1. **No e2e coverage.** `backend/test/` contains no spec touching `return/partial` or
   `settlementMode` — grep returns nothing. Acceptance item "tests unit/integration/e2e"
   is met at unit/service level only. Adding an e2e spec needs a live Postgres, which is
   unavailable in this worktree (`backend/.env` is absent and blocked from creation).
2. **No frontend error mapping** for `SETTLEMENT_*` / `REFUND_*` reason codes yet; the
   API surfaces them but the tenant UI has no localized copy.
3. **Migration not applied to a database.** `prisma validate` passes and the SQL is
   idempotent, but no `migrate deploy` was executed — no DB reachable here.
