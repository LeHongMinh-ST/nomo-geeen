# Verification Receipt — tenant-business-audit-coverage

Date: 2026-07-24
Task: R2-02 Cross-domain verification

## Commands

- `pnpm --dir backend test --runInBand --runTestsByPath src/platform/audit/audit-logger.service.spec.ts src/platform/audit/audit-logger.postgres.integration.spec.ts src/platform/products/products.service.spec.ts src/platform/purchases/purchases.service.spec.ts src/platform/sales/sales.service.spec.ts src/platform/stock-adjustments/stock-adjustments.service.spec.ts src/platform/handbook/handbook.service.spec.ts src/platform/auth/guards/tenant-permission.guard.spec.ts` — PASS; 7 suites, 119 passed tests; PostgreSQL integration is opt-in and skipped in the default run.
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5434/nomogreen_audit_review RUN_POSTGRES_INTEGRATION=1 pnpm --dir backend test --runInBand --runTestsByPath src/platform/audit/audit-logger.postgres.integration.spec.ts` — PASS; 1 live PostgreSQL rollback test.
- `pnpm --dir backend build` — PASS.
- `pnpm --dir backend exec prisma validate` — PASS.
- `git diff --check` — PASS.

## Reachability

- `AppModule` imports `AuthModule` and `AuditModule`.
- `AuthModule` registers and exports `TenantPermissionGuard`, and keeps the `AuthModule`/`AuditModule` forward reference.
- Tenant product, purchase, sales, stock-adjustment, and Handbook controllers use `TenantPermissionGuard`.
- Domain services call `AuditLogger.writeInTx`; the permission guard calls event-only `AuditLogger.log`.
- Prisma enum migration is additive; no audit table or legacy action is removed.

## Contract checks

- Tenant/user identity is derived from verified request context.
- Success audit writes stay inside domain transactions; denial logging does not recurse through authorization.
- Snapshots are bounded/redacted; denial permission arrays retain the first 100 items plus `count` and `truncated`.
- Invalid, foreign-tenant, replay, rollback, and sensitive-key paths retain existing semantics in focused tests.
- No frontend, UI, retention, queue, returns, or external SIEM scope was added.

## Limitations

- PostgreSQL integration is opt-in and runs against an isolated database; the existing local database was not reset because its migration history differs from this workspace.
- Docs impact: none.
