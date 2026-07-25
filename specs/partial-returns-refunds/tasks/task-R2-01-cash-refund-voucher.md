# Task R2-01: Cash refund voucher

**Requirement:** R8–R12 — Cash refund via PaymentVoucher, paid-vs-debt settlement, over-refund guard, financial audit, rollback
**Status:** done
**Priority:** P1
**Estimated Effort:** 1-2 days
**Dependencies:** tasks/task-R1-01-partial-returns.md (done)
**Spec:** specs/partial-returns-refunds/
Contracts: RefundErrorReasons, RefundSettlementRequestDelta, PartialSalesReturnRequest, PartialPurchaseReturnRequest

## Context

- **Why**: Audit §8.5 item 1 — "Cash refund/payment voucher thực tế — hiện fail-closed, chưa tự tạo payout". Luồng C locked the settlement boundary but deliberately rejected `REFUND_VOUCHER` with `SETTLEMENT_NOT_SUPPORTED`.
- **Current state**: `sales-return.service.ts` and `purchase-return.service.ts` both throw `ConflictException({ reason: 'SETTLEMENT_NOT_SUPPORTED' })` when `resolveSettlementMode` yields `REFUND_VOUCHER`. `PaymentVoucher` / `PaymentVoucherLine` / `DebtLedger` already exist with `@@unique([tenantId, idempotencyKey])` and `refSaleId` / `refPurchaseId`. `AuditAction` has no refund value. No `refundedAmount` column anywhere.
- **Target outcome**: `REFUND_VOUCHER` creates a real `PaymentVoucher` + line + `DebtLedger` audit row inside the existing Serializable transaction, capped by paid amount minus prior refunds, mutually exclusive with `debtAdjust`, without changing `DebtsService` semantics or party balance.

## Constraints

- **MUST**: Reuse existing `PaymentVoucher` / `PaymentVoucherLine` / `DebtLedger` models; run inside the existing Serializable tx; tenant from auth; refund cap per design § B3; structured `ConflictException({ reason })` errors; emit `SALE_REFUND` / `PURCHASE_REFUND` audit in addition to the return audit.
- **SHOULD**: Extract a shared `refund-settlement.ts` helper so sales and purchase paths do not duplicate cap/voucher logic.
- **MUST NOT**: Modify `debts.service.ts` or its CUSTOMER↔RECEIPT direction guard; mutate party `balance` in the refund path; decrement `Sale.amountPaid` / `Purchase.amountPaid`; add a `refundedAmount` column; combine `debtAdjust` with `REFUND_VOUCHER`; touch ProductKind / Handbook / Reports files; add new RBAC permission strings.
- **SCOPE**: Backend payment slice only. Schema change limited to two additive `AuditAction` enum values (design § B9 merge boundary).

## Steps

- [x] 1. Schema + migration: add `SALE_REFUND`, `PURCHASE_REFUND` to `enum AuditAction`; new migration with `ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS`; `prisma validate`.
  - Business: financial event separately auditable from the inventory return event.
  - Code: `backend/prisma/schema.prisma`, `backend/prisma/migrations/2026072502*_payment_refund_audit/migration.sql`.
  - _Requirements: 11.1, 11.2_

- [x] 2. DTO delta: `refundAmount?` (bigint decimal string), `refundMethod?` (`CASH|BANK_TRANSFER|QR`) on both partial-return DTOs.
  - Business: caller can refund a partial slice of the paid amount and choose the payout channel.
  - Code: `dto/create-partial-sales-return.dto.ts`, `dto/create-partial-purchase-return.dto.ts`; `MIXED` not accepted.
  - _Requirements: 8.1, 8.2_

- [x] 3. Shared refund helper: cap resolution (`paidCap`, `economicShare`, `refundCap`), amount parsing/validation, voucher + line + ledger payload builders for both directions.
  - Business: one place owns the money-direction and cap invariants.
  - Code: new `backend/src/platform/sales/refund-settlement.ts` (+ unit spec).
  - _Requirements: 9.1, 9.2, 9.3, 10.1_

- [x] 4. Sales path: replace the `SETTLEMENT_NOT_SUPPORTED` branch with the refund block — prior-refund aggregate, cap assert, `PaymentVoucher` (`PAYMENT`+`CUSTOMER`, `RFS-` docNo, `idempotencyKey='refund:<returnId>'`), `PaymentVoucherLine`, `DebtLedger` (`ADJUST`/`INCREASE`, `balanceAfter=null`, `refType='SALE_RETURN_REFUND'`), `SALE_REFUND` audit; guard `debtAdjust` conflict.
  - Business: customer actually gets cash back with a traceable voucher.
  - Code: `backend/src/platform/sales/sales-return.service.ts`.
  - _Requirements: 8.3, 9.1, 10.2, 11.1, 12.1_

- [x] 5. Purchase path: mirror with `RECEIPT`+`SUPPLIER`, `RFP-` docNo, `refType='PURCHASE_RETURN_REFUND'`, `PURCHASE_REFUND` audit.
  - Business: shop records cash recovered from supplier on a partial purchase return.
  - Code: `backend/src/platform/purchases/purchase-return.service.ts`.
  - _Requirements: 8.4, 9.1, 10.2, 11.1, 12.1_

- [x] 6. Structured errors: `P2002` on voucher insert → `REFUND_ALREADY_APPLIED`; missing debt party → `REFUND_PARTY_MISSING`.
  - Business: concurrent double refund and orphaned party are rejected, not silently written.
  - Code: both return services; `ConflictException({ reason })`.
  - _Requirements: 10.3, 10.4_

- [x] 7. Verification implementation
  - Tests per design § B10: direction pair, no double count, over-refund, prior-refund accumulation, debtAdjust conflict, rollback, idempotent replay, tenant isolation, P2002.
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 8. Verification receipt + `spec.json` / `task_registry` sync.
  - Business: state layer matches proven reality before closeout.
  - Code: `specs/partial-returns-refunds/verification-receipt-R2-01.md`, `spec.json`.
  - _Requirements: 11.3_

## Requirements

- 8.1 — `refundAmount` optional; omit ⇒ full cap
- 8.2 — `refundMethod` optional; default `CASH`; `MIXED` rejected
- 8.3 — Sales `REFUND_VOUCHER` creates `PAYMENT`+`CUSTOMER` voucher
- 8.4 — Purchase `REFUND_VOUCHER` creates `RECEIPT`+`SUPPLIER` voucher
- 9.1 — Refund cap = `min(amountPaid − priorRefunds, returnDoc.total)`
- 9.2 — Over cap ⇒ `REFUND_EXCEEDS_PAID`, zero side effects
- 9.3 — Non-positive explicit amount ⇒ `REFUND_AMOUNT_INVALID`
- 10.1 — Party balance never mutated by refund; `balanceAfter=null`
- 10.2 — `REFUND_VOUCHER` and `debtAdjust` mutually exclusive ⇒ `SETTLEMENT_REQUIRED`
- 10.3 — Voucher unique-key collision ⇒ `REFUND_ALREADY_APPLIED`
- 10.4 — Missing customer/supplier ⇒ `REFUND_PARTY_MISSING`
- 11.1 — `SALE_REFUND` / `PURCHASE_REFUND` audit emitted alongside return audit
- 11.2 — Enum migration deployed before emitting code
- 11.3 — Verification receipt with fresh evidence
- 12.1 — Same Serializable tx as stock writes
- 12.2 — Refund failure rolls back stock / batch / balance
- 12.3 — Idempotent replay creates no second voucher
- 12.4 — Tenant isolation proven

<!-- contract:RefundErrorReasons -->
```text
REFUND_EXCEEDS_PAID
REFUND_AMOUNT_INVALID
REFUND_ALREADY_APPLIED
REFUND_PARTY_MISSING
```

<!-- contract:RefundSettlementRequestDelta -->
```json
{
  "settlementMode": "DEBT_ADJUST_ONLY | NONE | REFUND_VOUCHER?",
  "refundAmount": "bigint-string?",
  "refundMethod": "CASH | BANK_TRANSFER | QR?"
}
```

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | `AuditAction` += `SALE_REFUND`, `PURCHASE_REFUND` (enum only) |
| `backend/prisma/migrations/2026072502*_payment_refund_audit/migration.sql` | Create | `ALTER TYPE ... ADD VALUE IF NOT EXISTS` |
| `backend/src/platform/sales/refund-settlement.ts` | Create | Shared cap + voucher/ledger payload builders |
| `backend/src/platform/sales/refund-settlement.spec.ts` | Create | Pure unit tests for cap logic |
| `backend/src/platform/sales/sales-return.service.ts` | Modify | Refund block replacing fail-closed branch |
| `backend/src/platform/sales/sales-return.service.spec.ts` | Modify | Refund acceptance tests |
| `backend/src/platform/sales/dto/create-partial-sales-return.dto.ts` | Modify | `refundAmount`, `refundMethod` |
| `backend/src/platform/purchases/purchase-return.service.ts` | Modify | Mirror refund block |
| `backend/src/platform/purchases/purchase-return.service.spec.ts` | Modify | Refund acceptance tests |
| `backend/src/platform/purchases/dto/create-partial-purchase-return.dto.ts` | Modify | `refundAmount`, `refundMethod` |
| `backend/src/platform/debts/debts.service.ts` | Read | Voucher conventions; MUST NOT modify |
| `backend/src/platform/reports/reports.service.ts` | Do not touch | Out of bounds this slice |

## Completion Criteria

- [x] `settlementMode=REFUND_VOUCHER` creates `PaymentVoucher` + `PaymentVoucherLine` + `DebtLedger` per design § B1
- [x] Party balance and `amountPaid` unchanged by refund; no debt double count
- [x] Over-refund / insufficient paid / invalid amount rejected with structured reasons and zero committed side effects
- [x] Refund failure rolls back stock and batch mutations
- [x] Idempotent replay and tenant isolation proven; `debtAdjust` + `REFUND_VOUCHER` rejected
- [x] Refund path reachable from the existing partial-return routes (no new route, no orphaned service)
- [x] `prisma validate`, build, Biome, focused + full backend tests pass with receipt

## Evidence

Logic/data slice: unit + service-level integration tests, schema validation, build, lint.

- [x] Automated verification
  - Command(s):
    ```bash
    pnpm --dir backend prisma validate
    pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/refund-settlement.spec.ts src/platform/sales/sales-return.service.spec.ts src/platform/purchases/purchase-return.service.spec.ts
    pnpm --dir backend build
    pnpm biome check backend/src/platform/sales backend/src/platform/purchases
    pnpm --dir backend test
    ```
  - Expected proof: all PASS; refund cases present (direction pair, cap, over-refund, conflict, rollback, replay, tenant)
- [x] Artifact / runtime verification
  - Inspect: created `PaymentVoucher` (`voucherType`/`partyType`/`docNo` prefix/`idempotencyKey`), `PaymentVoucherLine`, `DebtLedger` row with `balanceAfter=null`; customer/supplier `balance` and original `amountPaid` unchanged
  - Expect: exactly one voucher per return document; no balance write in refund mode
- [x] Runtime reachability verification
  - Entrypoint/caller: `POST tenant/sales/orders/:id/return/partial`, `POST tenant/purchases/:id/return/partial` with `settlementMode=REFUND_VOUCHER`
  - Expect: refund helper invoked from both services inside the existing Serializable tx; no new route, no orphaned module
- [x] Contract / negative-path verification
  - Check: `refundAmount` > cap; `refundAmount` ≤ 0; `refundAmount` + `debtAdjust`; foreign tenant; missing customer; duplicate voucher key (P2002); refund rejection after stock writes
  - Expect: `REFUND_EXCEEDS_PAID` / `REFUND_AMOUNT_INVALID` / `SETTLEMENT_REQUIRED` / `REFUND_PARTY_MISSING` / `REFUND_ALREADY_APPLIED`; zero committed mutation on stock, batch version, balance

### Verification result — 2026-07-25 (PASS)

Full receipt: `specs/partial-returns-refunds/verification-receipt-R2-01.md`.
`pnpm` is unusable in this worktree (RTK shim failure + `ERR_PNPM_IGNORED_BUILDS`),
so binaries were invoked directly from `backend/node_modules/.bin`.

```bash
cd backend && ./node_modules/.bin/prisma validate --config /tmp/prisma-validate.config.ts
# The schema at prisma/schema.prisma is valid 🚀

cd backend && ./node_modules/.bin/jest --runInBand --runTestsByPath \
  src/platform/sales/refund-settlement.spec.ts \
  src/platform/sales/sales-return.service.spec.ts \
  src/platform/purchases/purchase-return.service.spec.ts
# Test Suites: 3 passed, 3 total
# Tests:       37 passed, 37 total

cd backend && ./node_modules/.bin/nest build
# exit 0

./backend/node_modules/.bin/biome check <8 changed files>
# Checked 8 files in 56ms. No fixes applied.

cd backend && ./node_modules/.bin/jest
# Test Suites: 1 skipped, 54 passed, 54 of 55 total
# Tests:       1 skipped, 479 passed, 480 total
```

PASS — automated verification, artifact assertions (voucher/line/ledger payloads and
`balance`/`amountPaid` non-mutation asserted at mock level), runtime reachability
(refund helper called from both existing partial-return routes, no new route), and all
negative paths (`REFUND_EXCEEDS_PAID`, `REFUND_AMOUNT_INVALID`, `SETTLEMENT_REQUIRED`,
`REFUND_ALREADY_APPLIED`, foreign tenant, post-CAS rollback).

Gap disclosed: no e2e spec exists for `return/partial` anywhere in `backend/test/`, and
the migration was not applied to a live database — no Postgres reachable in this worktree.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Reusing `DebtsService.createVoucher` would 422 on direction guard and mutate balance | High | Return services write vouchers directly with inverse pairing; `debts.service.ts` untouched (design § B1) |
| Double counting debt + refund on one return | High | Modes mutually exclusive; `SETTLEMENT_REQUIRED` when combined (design § B2) |
| Over-refund across multiple partial returns | High | In-tx aggregate over CUSTOMER+PAYMENT / SUPPLIER+RECEIPT vouchers; no new column (design § B3) |
| Emitting new `AuditAction` before enum migration deploys | High | Migration is step 1, `ADD VALUE IF NOT EXISTS` |
| Schema overlap with Luồng A | Medium | Enum-additive change only; merge boundary documented (design § B9) |
| Reports aggregation drift | Medium | `amountPaid` never mutated; Reports files untouched (design § B6) |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
