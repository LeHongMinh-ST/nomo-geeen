# Task R2-02-cross-domain-verification: Cross-domain verification and reachability

**Requirement:** R8 — Verification and reachability
**Status:** done
**Priority:** P1
**Estimated Effort:** 1 day
**Dependencies:** tasks/task-R1-01-product-audit-wiring.md, tasks/task-R1-02-purchase-audit-wiring.md, tasks/task-R1-03-sales-audit-wiring.md, tasks/task-R1-04-stock-and-handbook-audit-wiring.md, tasks/task-R2-01-permission-denial-audit.md
**Spec:** specs/tenant-business-audit-coverage/

## Context
- **Why**: Close the approved tenant audit coverage slice.
- **Current state**: Existing AuditLogger, domain transactions, guards, and colocated Jest specs are identified in research.md.
- **Target outcome**: Cross-domain verification and reachability is wired, bounded, reachable, and tested.

## Constraints
- **MUST**: Preserve tenant scope, routes, errors, transactions, and approved scope_lock.
- **SHOULD**: Reuse AuditLogger.run/writeInTx and existing retry patterns.
- **MUST NOT**: Add UI, reports, retention, returns, global interceptor, async queue, or SIEM.
- **SCOPE**: Implement only R8 — Verification and reachability.

## Steps
- [x] 1. Run focused suites and inspect action/module wiring
  - Record counts and negatives
  - _Requirements: 8.1, 8.3, 9.1, 9.2, 10.2_
- [x] 2. Run build/Prisma validation/migration inspection
  - Record fixture limitations
  - _Requirements: 8.2, 11.3_
- [x] 3. Write verification receipt
  - Match final status
  - _Requirements: 8.1, 8.2, 8.3, 11.3_

## Requirements
- 8.1 Focused proof
- 8.2 Build/migration
- 8.3 Reachability
- 9.1/9.2 Bounded
- 10.2 Read boundary
- 11.3 Receipt

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/src/app.module.ts | Read | Runtime composition |
| backend/src/platform/audit/audit-logger.service.spec.ts | Read | Logger proof |
| backend/src/platform/products/products.service.spec.ts | Read | Product proof |
| backend/src/platform/purchases/purchases.service.spec.ts | Read | Purchase proof |
| backend/src/platform/sales/sales.service.spec.ts | Read | Sales proof |
| backend/src/platform/stock-adjustments/stock-adjustments.service.spec.ts | Read | Stock proof |
| backend/src/platform/handbook/handbook.service.spec.ts | Read | Handbook proof |
| backend/src/platform/auth/guards/tenant-permission.guard.spec.ts | Read | Denial proof |
| specs/tenant-business-audit-coverage/reports/verification-receipt.md | Create | Final receipt |

## Completion Criteria
- [x] 8.1 Focused proof
- [x] 8.2 Build/migration
- [x] 8.3 Reachability
- [x] No orphaned provider, route, migration, or audit path remains.

## Evidence
- [x] Automated verification
  - Command(s): pnpm --dir backend test --runInBand --runTestsByPath backend/src/platform/audit/audit-logger.service.spec.ts backend/src/platform/products/products.service.spec.ts backend/src/platform/purchases/purchases.service.spec.ts backend/src/platform/sales/sales.service.spec.ts backend/src/platform/stock-adjustments/stock-adjustments.service.spec.ts backend/src/platform/handbook/handbook.service.spec.ts backend/src/platform/auth/guards/tenant-permission.guard.spec.ts; pnpm --dir backend build; pnpm --dir backend exec prisma validate
  - Expected proof: focused tests/build/schema checks pass with counts recorded.
- [x] Artifact / runtime verification
  - Inspect: backend/src/app.module.ts, backend/src/platform/audit/audit-logger.service.spec.ts, backend/src/platform/products/products.service.spec.ts, backend/src/platform/purchases/purchases.service.spec.ts, backend/src/platform/sales/sales.service.spec.ts, backend/src/platform/stock-adjustments/stock-adjustments.service.spec.ts, backend/src/platform/handbook/handbook.service.spec.ts, backend/src/platform/auth/guards/tenant-permission.guard.spec.ts, specs/tenant-business-audit-coverage/reports/verification-receipt.md
  - Expect: existing tenant controllers and TenantPermissionGuard from AppModule
- [x] Runtime reachability verification
  - Entrypoint/caller: existing tenant controllers and TenantPermissionGuard from AppModule
  - Expect: the audit behavior is registered and invoked from the existing runtime path.
- [x] Contract / negative-path verification
  - Check: audit failure rollback, denial semantics, foreign IDs, sensitive keys, replay
  - Expect: existing denial/rollback/isolation behavior is preserved and no unsafe row is written.

### Verification receipt
- Aggregate focused command — PASS; 7 suites / 116 tests.
- `pnpm --dir backend build` — PASS.
- `pnpm --dir backend exec prisma validate` — PASS.
- `git diff --check` — PASS.
- Final receipt: `specs/tenant-business-audit-coverage/reports/verification-receipt.md`.
- Reachability: AppModule -> Auth/Audit/domain modules -> tenant controllers/guard -> audited services and denial logger.
- Limitation: focused tests use mocked Prisma transactions; no live PostgreSQL rollback run.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Cross-domain regression/false completion | High | Focused tests, build, and transaction-preserving implementation. |
| Sensitive or foreign-tenant payload | High | Allow-list snapshots and negative-path assertions. |
