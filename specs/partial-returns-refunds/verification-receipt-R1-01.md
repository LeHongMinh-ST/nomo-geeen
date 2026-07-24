# Verification receipt — partial-returns-refunds R1-01

**Date:** 2026-07-25  
**Task:** tasks/task-R1-01-partial-returns.md  
**Result:** PASS

## Commands

```bash
pnpm --dir backend exec prisma generate
# ✔ Generated Prisma Client (v7.8.0)

pnpm --dir backend test -- --runInBand --runTestsByPath \
  src/platform/sales/sales-return.service.spec.ts \
  src/platform/purchases/purchase-return.service.spec.ts \
  src/platform/sales/returnable-qty.spec.ts
# Test Suites: 3 passed, 3 total
# Tests:       18 passed, 18 total

pnpm --dir backend exec tsc -p tsconfig.build.json --noEmit
# exit 0 (no errors)

pnpm --dir backend exec biome check \
  src/platform/sales/sales-return.service.ts \
  src/platform/purchases/purchase-return.service.ts \
  src/platform/sales/returnable-qty.ts \
  src/platform/sales/dto/create-partial-sales-return.dto.ts \
  src/platform/purchases/dto/create-partial-purchase-return.dto.ts \
  src/platform/sales/sales.controller.ts \
  src/platform/purchases/purchases.controller.ts
# Lint: No issues found
```

## Coverage proven

| Case | Evidence |
|------|----------|
| Partial sales qty + CAS | sales-return.service.spec partial restore |
| Over-return | RETURN_QTY_EXCEEDS_REMAINING, no stock |
| Stale CAS | BATCH_RETURN_CONFLICT, no debt |
| Idempotency | replay without stock write |
| Tenant isolation | foreign tenant → Sale not found |
| Debt pro-rata | 600 debt / 1200 total / 1 of 4 → 150 |
| REFUND_VOUCHER fail-closed | SETTLEMENT_NOT_SUPPORTED |
| healthState unchanged | updateMany data lacks healthState |
| Purchase mirror | partial/over/CAS/idempotency/refund |
| Full return still CAS | full path tests retained |

## Design decisions locked (see design.md)

Remaining = sum completed return lines; debt floor(debt×returned/total); cash refund out-of-slice; full blocked if any return; settlement default DEBT_ADJUST_ONLY when debt>0.

## Runtime routes

- `POST tenant/sales/orders/:id/return/partial`
- `POST tenant/purchases/:id/return/partial`
