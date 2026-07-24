# Task R1-01: Atomic full sales return

**Requirement:** R1, R2, R3, R4, R5
**Status:** done
**Priority:** P1
**Spec:** specs/sales-return-core/

## Context

The schema has SalesReturn and SaleLineBatch, but no runtime endpoint. Existing cancellation
logic is not a return document and cannot represent an immutable original sale plus return audit.

## Constraints

- Full return only; no partial line input.
- Must be tenant-scoped and Serializable.
- Must restore exact batch allocations before aggregate stock is considered complete.
- Must not change the original Sale.

## Steps

1. Add `SalesReturnsService` and a guarded `POST /tenant/sales/orders/:id/return` boundary.
2. Add `SALE_RETURN` audit vocabulary and migration.
3. Restore stock/batches, compensate debt, create return document, and write movements.
4. Add service/controller tests and build/Prisma evidence.

## Requirements

- R1, R2, R3, R4, R5

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/sales-return.service.ts` | Add | Atomic return transaction. |
| `backend/src/platform/sales/sales-return.service.spec.ts` | Add | Positive and negative paths. |
| `backend/src/platform/sales/sales.controller.ts` | Modify | Route reachability. |
| `backend/src/platform/sales/sales.module.ts` | Modify | Provider wiring. |
| `backend/prisma/schema.prisma` | Modify | Audit action vocabulary. |

## Risk Assessment

- High: stock and debt compensation must rollback together; use Serializable transaction.
- Medium: payment refund is not modeled; explicitly keep it out of scope.

## Runtime reachability verification

`AppModule` imports `SalesModule`; controller route must resolve `SalesReturnsService` through
the module provider graph.

## Completion Criteria

- Completed sale returns once and only once.
- Stock and all SaleLineBatch quantities restored.
- Customer debt compensation is atomic.
- Original sale remains unchanged.
- Tests, build, Prisma validation, and diff check pass.

## Evidence

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sales-return.service.spec.ts src/platform/sales/sales.controller.spec.ts
pnpm --dir backend build
pnpm --dir backend exec prisma validate
```

## Verification Receipt

- Focused tests: **PASS** — 2 suites, 6 tests.
- Backend build: **PASS**.
- Prisma validation: **PASS**.
- `git diff --check`: **PASS**.
