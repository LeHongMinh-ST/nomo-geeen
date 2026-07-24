# Task R1-01 — Persist and enforce sale regulatory dates

**Status:** done

## Context

The catalog audit found regulatory attributes but no enforcement. The existing sales policy is pure and shared by all tenant sale paths.

## Constraints

- Preserve behavior when dates are omitted.
- Do not calculate dates from prescriptions or create regulatory master data.
- Do not mutate stock or debt before the gate passes.

## Steps

## Implementation Steps

1. Add nullable sale-line date snapshots and a Prisma migration.
2. Extend order and quick-sale line DTOs.
3. Add pure PHI and withdrawal checks and wire them to create, complete, and quick-sale flows.
4. Add focused negative-path tests and run build/spec validation.

## Requirements

- R1 → DTO fields and `SaleLine` snapshots.
- R2 → `assertSaleRegulatoryDates` PHI check.
- R3 → `assertSaleRegulatoryDates` withdrawal check.
- R4 → completion re-checks persisted line dates.
- R5 → shared service integration for order and quick sale.

## Risk Assessment

- Date-only values are normalized to UTC day precision.
- Missing regulatory attributes or event dates remain non-blocking by contract.
- Existing full-suite Redis integration remains environment-dependent.

## Runtime reachability verification

- Order create invokes the policy before `sale.create`.
- Order completion invokes the policy before stock allocation.
- Quick sale invokes the policy before stock decrement.

## Completion Criteria

- DTOs validate optional regulatory dates.
- Sale lines persist both snapshots.
- PHI and veterinary withdrawal gates reject restricted dates with structured reasons.
- Order create, order completion, and quick sale all enforce the gate.
- Focused policy/service tests pass.

## Related Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`
- `backend/src/platform/sales/dto/`
- `backend/src/platform/sales/sale-eligibility-policy.ts`
- `backend/src/platform/sales/sales.service.ts`

## Verification & Evidence

- `pnpm --dir backend exec prisma validate`
- `pnpm --dir backend test -- --runInBand sale-eligibility-policy sales.service`
- `node .opencode/scripts/validate-spec-output.cjs specs/sale-regulatory-date-gates`

Receipt:

- `pnpm --dir backend exec prisma validate` — PASS.
- `pnpm --dir backend build` — PASS.
- `pnpm --dir backend test -- --runInBand sale-eligibility-policy sales.service` — PASS, 96 tests.
- `REDIS_URL=redis://127.0.0.1:6379 pnpm --dir backend test --runInBand` — PASS, 49 suites / 404 tests, 1 skipped.
- `node .opencode/scripts/validate-spec-output.cjs specs/sale-regulatory-date-gates` — PASS.
- `node .opencode/scripts/validate-docs.cjs docs` — PASS.
