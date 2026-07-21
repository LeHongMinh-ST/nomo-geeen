# Task R1-02: Supplier management

**Requirement:** R1 — tenant supplier records
**Status:** done
**Priority:** P1
**Estimated Effort:** 5–7 hours
**Dependencies:** tasks/task-R0-01-purchase-contract-foundation.md
**Spec:** specs/tenant-purchase-management/

## Context

- **Why**: Expanded scope requires durable suppliers instead of seed picker records.
- **Current state**: Supplier exists in Prisma; picker is seed-backed and no API module is present.
- **Target outcome**: Authorized users search/list/create/update/soft-delete suppliers without breaking history.

## Constraints

- **MUST**: Tenant identity and authoritative quantities, money, stock, and balances are server-derived; preserve approved scope.
- **SHOULD**: Reuse existing NestJS/Prisma, Next.js, userFetch, sales/products, and DESIGN.md patterns.
- **MUST NOT**: Add unapproved returns, advanced workflow, multi-warehouse, or unrelated refactors.
- **SCOPE**: Implement only this task and its mapped requirements.

## Steps
- [x] 1. Implement guarded supplier list/search/create/update/soft-delete routes and service with tenant scope, code/name validation, bounded pagination, and history-preserving soft delete.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 10.1_
- [x] 2. Add unit/controller/E2E coverage for isolation, duplicate code, inactive/deleted supplier, and permission denial; historical purchase detail remains readable.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 1.1, 1.3, 1.4, 6.2, 6.3, 10.3, 11.2_


## Requirements

- 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 10.1, 10.3, 11.2

## Related Files

| Path | Action | Description |
|---|---|---|
backend/src/platform/suppliers/suppliers.module.ts | Create | Supplier module
| backend/src/platform/suppliers/suppliers.controller.ts | Create | Guarded routes
| backend/src/platform/suppliers/suppliers.service.ts | Create | CRUD/search
| backend/src/platform/suppliers/dto/* | Create | Supplier DTOs
| backend/src/platform/suppliers/*.spec.ts | Create | Unit/controller tests
| backend/test/tenant-suppliers.e2e-spec.ts | Create | Isolation/lifecycle E2E

## Completion Criteria

- [x] List/search returns active, non-deleted tenant suppliers with bounded pagination.
- [x] Create/update enforces tenant-unique code; delete is soft.
- [x] Unauthorized/cross-tenant tests pass.

## Evidence

- [x] Automated verification
  - Command(s): pnpm --dir backend test -- --runInBand suppliers; pnpm --dir backend test:e2e -- --runInBand tenant-suppliers.e2e-spec.ts
  - Expected proof: CRUD, validation, isolation, permission tests pass.
- [x] Artifact / runtime verification
  - Inspect: Supplier module and /tenant/suppliers
  - Expect: Purchase picker can call list endpoint.
- [x] Runtime reachability verification
  - Entrypoint/caller: GET /tenant/suppliers from R2-01
  - Expect: Real request reaches service.
- [x] Contract / negative-path verification
  - Check: Duplicate code, deleted/inactive, cross-tenant id, missing permission
  - Expect: 409/404/403 and no mutation.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
Delete breaks history | High | Soft-delete/history test
Cross-tenant lookup | High | Filters/E2E denial

## Verification receipt — 2026-07-21

- Unit/controller tests: PASS — 2 suites, 4 tests via pnpm --dir backend exec jest --runInBand suppliers.
- E2E: PASS — 1 suite, 1 test via isolated nomogreen_purchase_e2e database; CRUD, search, duplicate code, soft-delete, permission denial and historical purchase detail verified.
- Backend build: PASS — pnpm --dir backend build.
- Targeted backend lint: PASS — 15 files.
- Prisma validation: PASS — pnpm --dir backend exec prisma validate.
- Purchase regression tests: PASS — 4 suites, 11 tests via pnpm --dir backend exec jest --runInBand purchases suppliers.
- Diff check: PASS — git diff --check.
- Docs impact: none; API contract and implementation notes capture the new reachable supplier surface.
- Environment note: E2E used the isolated nomogreen_purchase_e2e database because shared nomogreen has pre-existing failed migrations.
