# R1-01 — Livestock sale safety gate

**Status:** done

## Objective

Reject sale of livestock products when the canonical `attrs` state says the stock is
quarantined, sick, dead, or rejected. Preserve the existing generic product flag checks
and keep the policy pure.

## Context

The existing checkout gate handles product lifecycle flags but the catalog requires sick,
quarantined, dead, and rejected livestock to be unsellable. A persistent livestock state
machine is intentionally deferred.

## Constraints

- Use the existing pure sale policy and `Product.attrs`.
- Do not add Prisma entities or harvest/withdrawal date behavior.
- Preserve tenant-scoped product loading and FEFO ordering.

## Steps

1. Add a canonical livestock-state reader and structured policy reason.
2. Reuse the existing policy calls on order create, order complete, and quick sale.
3. Add policy and service regression tests.

## Requirements

- R1, R2, R3

## Related Files

| Path | Action | Purpose |
|---|---|---|
| `backend/src/platform/sales/sale-eligibility-policy.ts` | Modify | Shared livestock gate. |
| `backend/src/platform/sales/sale-eligibility-policy.spec.ts` | Modify | Policy matrix tests. |
| `backend/src/platform/sales/sales.service.ts` | Read | Existing three callers. |
| `backend/src/platform/sales/sales.service.spec.ts` | Read | Service regression coverage. |

## Risk Assessment

- Medium: attrs are flexible JSON, so aliases are accepted only for the state key.
- Low: no schema migration; existing generic product gates remain first.

## Runtime reachability verification

`SalesService` already calls `assertProductSaleEligible` in create-order, complete-order,
and quick-sale paths; extending that policy makes the new gate reachable without new route wiring.

## Completion Criteria

- `LIVESTOCK_SEED` with `attrs.livestockStatus` (or `status`) in `QUARANTINED`, `SICK`, `DEAD`, or `REJECTED` returns structured 422.
- Active/healthy/available livestock remains sellable.
- Gate executes on create, complete, and quick sale before FEFO/stock mutation.
- Existing product flag and tenant isolation behavior remains unchanged.

## Evidence

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sale-eligibility-policy.spec.ts src/platform/sales/sales.service.spec.ts
pnpm --dir backend build
pnpm --dir backend exec prisma validate
```

Expected: all tests pass, build exits 0, Prisma validates.

## Verification Receipt

- Focused sales tests: **PASS** — 2 suites, 91 tests.
- Backend build: **PASS** — `nest build` exit 0.
- Prisma validation: **PASS**.
- `git diff --check`: **PASS**.
