# Task R1-01: Snapshot Handbook context on order create

**Requirement:** R1, R2, R3
**Status:** done
**Priority:** P1
**Spec:** specs/handbook-order-snapshot/

## Context

The Sale schema has snapshot fields but the order DTO and create transaction do not populate them.

## Constraints

- Tenant-scoped disease lookup.
- Snapshot only at order creation; no mutation of completed snapshots.
- Quick sale, AI diagnosis, and recommendation logic remain out of scope.

## Steps

1. Extend order DTO validation.
2. Resolve disease and write snapshot fields in the existing transaction.
3. Add focused regression tests and verification receipt.

## Requirements

- R1, R2, R3

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/dto/create-sales-order.dto.ts` | Modify | Optional snapshot inputs. |
| `backend/src/platform/sales/sales.service.ts` | Modify | Tenant lookup and persistence. |
| `backend/src/platform/sales/sales.service.spec.ts` | Modify | Regression coverage. |

## Risk Assessment

- Low: existing nullable Sale columns; no migration.
- Medium: foreign-tenant disease must be rejected without leaking existence.

## Runtime reachability verification

SalesController → SalesService.createOrder already handles the DTO and transaction.

## Completion Criteria

- Valid disease snapshots name/context/quantity metadata.
- Foreign or missing disease returns structured validation error.
- Existing order flows remain passing.

## Evidence

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sales.service.spec.ts
pnpm --dir backend build
pnpm --dir backend exec prisma validate
```

## Verification Receipt

- Sales service regression suite: **PASS** — 75 tests.
- Backend build: **PASS**.
- Prisma validation: **PASS**.
- `git diff --check`: **PASS**.
