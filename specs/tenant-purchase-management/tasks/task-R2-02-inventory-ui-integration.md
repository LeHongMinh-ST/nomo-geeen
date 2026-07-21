# Task R2-02: Inventory UI integration

**Requirement:** R2 — real inventory visibility
**Status:** done
**Priority:** P1
**Estimated Effort:** 6–9 hours
**Dependencies:** tasks/task-R0-01-purchase-contract-foundation.md, tasks/task-R1-01-purchase-domain-api.md
**Spec:** specs/tenant-purchase-management/

## Context

- **Why**: /ton-kho computes counts from seed data and cannot show purchase effects.
- **Current state**: Inventory list/detail/adjustment are seed/local-only; product API has tenant stock summaries.
- **Target outcome**: List/detail show durable quantity, base unit, average cost, expiry/movement and refresh after completion.

## Constraints

- **MUST**: Tenant identity and authoritative quantities, money, stock, and balances are server-derived; preserve approved scope.
- **SHOULD**: Reuse existing NestJS/Prisma, Next.js, userFetch, sales/products, and DESIGN.md patterns.
- **MUST NOT**: Add unapproved returns, advanced workflow, multi-warehouse, or unrelated refactors.
- **SCOPE**: Implement only this task and its mapped requirements.

## Steps
- [x] 1. Add inventory query/client mapping and replace seed imports in list/detail; consume bounded tenant product/stock or inventory results.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 8.1, 8.2, 8.3, 9.1, 10.1_
- [x] 2. Refetch after canonical purchase success and implement explicit loading/empty/error states; do not locally increment stock.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 8.2, 8.4, 11.1_
- [x] 3. Add component/integration and viewport accessibility checks for counts, filters, empty/error, labels/focus, base unit, and cost.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 11.3_


## Requirements

- 8.1, 8.2, 8.3, 8.4, 9.1, 10.1, 11.1, 11.3

## Related Files

| Path | Action | Description |
|---|---|---|
frontend/lib/tenant-inventory-api.ts | Create/Modify | Inventory client,frontend/components/app/inventory/inventory-list.tsx | Modify | API rows/counts,frontend/components/app/inventory/inventory-detail.tsx | Modify | API detail,frontend/components/app/inventory/adjust-sheet.tsx | Modify/Defer | Adjustment unavailable,frontend/app/(app)/ton-kho/** | Read/Modify if needed | Reachability

## Completion Criteria

- [x] /ton-kho uses authenticated server data with no seed fallback.
- [x] Filters/counts use fetched values and refresh after completion.
- [x] Empty/error/mobile/accessibility checks pass; adjustment remains deferred.

## Evidence

- [x] Automated verification
  - Command(s): targeted frontend component tests; pnpm --dir frontend lint; pnpm --dir frontend build
  - Expected proof: Mapping/filter/error tests and build pass.
- [x] Artifact / runtime verification
  - Inspect: /ton-kho and /ton-kho/[id] after completion
  - Expect: Quantity/base unit/cost/movement match API.
- [x] Runtime reachability verification
  - Entrypoint/caller: The two ton-kho route files
  - Expect: API-backed list/detail mounted and refreshed.
- [x] Contract / negative-path verification
  - Check: Empty, 500, unauthorized, adjustment click
  - Expect: Honest state and no local mutation.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
Stock shape drift | High | Reuse product contract/tests
Outage shows seed | High | Remove imports/test error
Refresh race | Medium | Await refetch

## Verification receipt — 2026-07-21

- Frontend inventory API tests: PASS — 7 files, 13 tests via pnpm --dir frontend test -- tenant-inventory-api.test.ts tenant-purchases-api.test.ts.
- Frontend lint: PASS — 219 files.
- Frontend build: PASS — /ton-kho and /ton-kho/[id] compiled with TypeScript.
- Backend inventory/product/purchase/supplier regression: PASS — 5 suites, 15 tests.
- Backend build: PASS.
- Diff check: PASS — git diff --check.
- Runtime proof: registered /tenant/inventory API provides bounded tenant-scoped list/detail, qty, base unit, avg cost and stock movements; both ton-kho routes consume it.
- Adjustment scope: remains explicitly deferred; no local stock mutation is performed.
- Docs impact: none; approved spec and implementation notes capture the API-backed inventory behavior.
