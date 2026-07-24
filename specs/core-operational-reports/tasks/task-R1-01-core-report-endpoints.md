# Task R1-01: Core report endpoints

**Requirement:** R1, R2, R3
**Status:** done
**Priority:** P1
**Spec:** specs/core-operational-reports/

## Context

The `/bao-cao` navigation entry has no backend read boundary. Add bounded tenant reports using
existing persistence and no schema migration.

## Constraints

- Read-only; no report tables or background jobs.
- Tenant and permission isolation are mandatory.
- Date range maximum is 366 days.

## Steps

1. Add validated date query DTO and ReportsModule/service/controller.
2. Implement stock-summary and sales-summary reads.
3. Add service/controller tests and verification receipt.

## Requirements

- R1, R2, R3

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/reports/` | Add | Read-only report boundary. |
| `backend/src/app.module.ts` | Modify | Module reachability. |

## Risk Assessment

- Medium: large stock/sales datasets; use bounded pagination/top-product limits.
- Low: no writes and no schema changes.

## Runtime reachability verification

AppModule must import ReportsModule and the guarded controller must expose both routes.

## Completion Criteria

- Stock and sales endpoints return tenant-scoped data.
- Invalid date range returns validation error.
- Focused tests, build, Prisma validate, and diff check pass.

## Evidence

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/reports/reports.service.spec.ts src/platform/reports/reports.controller.spec.ts
pnpm --dir backend build
pnpm --dir backend exec prisma validate
```

## Verification Receipt

- Focused tests: **PASS** — 2 suites, 3 tests.
- Backend build: **PASS**.
- Prisma validation: **PASS**.
- `git diff --check`: **PASS**.
