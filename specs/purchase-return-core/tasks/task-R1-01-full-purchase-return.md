# Task R1-01: Atomic full purchase return

**Requirement:** R1, R2, R3, R4
**Status:** done
**Priority:** P1
**Spec:** specs/purchase-return-core/

## Context

The purchase receive path is complete, but no runtime document reverses received stock or
supplier debt. A separate service keeps the existing purchase service bounded.

## Constraints

- Full return only; no partial line input.
- Must be tenant-scoped and Serializable.
- Must not mutate the original Purchase.

## Steps

1. Add PurchaseReturn models/migration and `PURCHASE_RETURN` audit vocabulary.
2. Add service/controller/module wiring.
3. Decrement stock/lots, compensate supplier debt, and write movements/audit.
4. Add focused tests and verification receipt.

## Requirements

- R1, R2, R3, R4

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | PurchaseReturn persistence. |
| `backend/src/platform/purchases/purchase-return.service.ts` | Add | Atomic reverse transaction. |
| `backend/src/platform/purchases/purchases.controller.ts` | Modify | Route reachability. |
| `backend/src/platform/purchases/purchases.module.ts` | Modify | Provider wiring. |

## Risk Assessment

- High: stock and supplier debt must rollback together.
- Medium: payment refund is not modeled in this slice.

## Runtime reachability verification

`AppModule` imports `PurchasesModule`; the controller route must resolve the new provider.

## Completion Criteria

- Completed purchase returns once and only once.
- Stock and original batches decrement safely.
- Supplier debt is compensated atomically.
- Original purchase remains unchanged.

## Evidence

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/purchases/purchase-return.service.spec.ts src/platform/purchases/purchases.controller.spec.ts
pnpm --dir backend build
pnpm --dir backend exec prisma validate
```

## Verification Receipt

- Focused tests: **PASS** — 2 suites, 3 tests.
- Backend build: **PASS**.
- Prisma validation: **PASS**.
- `git diff --check`: **PASS**.
