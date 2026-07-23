# Preflight regression — 2026-07-23

## Completed workflow

- `sale-checkout-kind-gates` closed as `completed/complete` after validator PASS and 85/85 focused sales tests.
- `sale-checkout-fe-gates` was already `completed/complete`.

## Regression results

| Command | Result |
|---|---|
| `pnpm --dir frontend test` | PASS — 19 files, 76 tests |
| `pnpm --dir frontend build` | PASS when run independently |
| `pnpm --dir backend test --runInBand` | 43 suites passed, 368 tests passed; 1 unrelated billing suite fails because `backend/prisma/migrations/20260719000200_admin_billing_foundation/migration.sql` is missing |
| `pnpm --dir backend build` | PASS when run independently |
| combined backend + frontend build | Environment blocker: Turbopack `Operation not permitted` while spawning a process/binding a port in sandbox |

## Scope decision

Proceed with the bounded `product-kind-form-ui` spec. No backend schema/contract change is required by the current evidence.
