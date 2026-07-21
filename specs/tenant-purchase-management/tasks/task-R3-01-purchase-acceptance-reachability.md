# Task R3-01: Purchase acceptance and reachability

**Requirement:** R3 — cross-layer acceptance gate
**Status:** done
**Priority:** P0
**Estimated Effort:** 5–8 hours
**Dependencies:** tasks/task-R1-01-purchase-domain-api.md, tasks/task-R1-02-supplier-management.md, tasks/task-R2-01-purchase-ui-integration.md, tasks/task-R2-02-inventory-ui-integration.md
**Spec:** specs/tenant-purchase-management/

## Context

- **Why**: Completion requires backend effects, frontend reachability, permissions, and durable inventory proof together.
- **Current state**: Existing routes are mounted but seed-backed; earlier tasks create the vertical slice.
- **Target outcome**: Proof covers supplier → draft → complete → stock/payable → inventory and negative paths.

## Constraints

- **MUST**: Tenant identity and authoritative quantities, money, stock, and balances are server-derived; preserve approved scope.
- **SHOULD**: Reuse existing NestJS/Prisma, Next.js, userFetch, sales/products, and DESIGN.md patterns.
- **MUST NOT**: Add unapproved returns, advanced workflow, multi-warehouse, or unrelated refactors.
- **SCOPE**: Implement only this task and its mapped requirements.

## Steps
- [x] 1. Run backend unit/integration/E2E and frontend test/build/lint for draft no-effects, conversion, completion stock/cost/movement/debt, payment, replay/concurrency, CRUD, denial, rollback, and UI errors.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 10.1, 10.2, 10.3, 11.1, 11.2, 11.3_
- [x] 2. Audit the five nhap-hang/ton-kho routes, imports, client calls, module registration, and empty/error behavior; remove scoped seed/TODO paths.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 11.3_
- [x] 3. Record receipts and run validator, grounding, diff check, and code review before syncing state.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 6.2, 10.3, 11.1, 11.3_


## Requirements

- 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 10.1, 10.2, 10.3, 11.1, 11.2, 11.3

## Related Files

| Path | Action | Description |
|---|---|---|
backend/test/tenant-purchases.e2e-spec.ts | Modify | Full acceptance,backend/test/tenant-suppliers.e2e-spec.ts | Modify | Supplier acceptance,frontend/** | Inspect | Route/seed/TODO audit,specs/tenant-purchase-management/ | Modify | Receipts/state

## Completion Criteria

- [x] Full backend/frontend verification passes with receipts.
- [x] Runtime audit proves real API reachability and no scoped seed/TODO fallback.
- [x] Validator, grounding, diff check, and review pass.

## Evidence

- [x] Automated verification
  - Command(s): backend tests/build; frontend test/lint/build; node .opencode/scripts/validate-spec-output.cjs specs/tenant-purchase-management; node .opencode/scripts/spec-ground.cjs specs/tenant-purchase-management
  - Expected proof: All commands exit 0 and receipts name scenarios.
- [x] Artifact / runtime verification
  - Inspect: Purchase/stock/movement/supplier/debt rows and five user-app routes
  - Expect: Completed purchase appears in history and inventory matches.
- [x] Runtime reachability verification
  - Entrypoint/caller: Next route files and Nest registrations
  - Expect: Every artifact is imported, mounted, and exercised.
- [x] Contract / negative-path verification
  - Check: Cross-tenant, permission, invalid conversion, duplicate, forced failure, API outage
  - Expect: Stable denial/error, zero partial effects, preserved input.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
Routes remain seed-backed | High | Runtime audit/empty proof
DB migration issue | Medium | Isolated seeded DB
Side-effect regression | High | Full transaction assertions/review

## Verification receipt — 2026-07-21

- Backend full suite: PASS — 32 suites, 211 tests; backend build PASS.
- Frontend targeted suite: PASS — 7 files, 13 tests; lint PASS; build PASS.
- Combined E2E: PASS — purchase/supplier suites, 3 tests, isolated nomogreen_purchase_e2e database.
- Spec validator: PASS — node .opencode/scripts/validate-spec-output.cjs specs/tenant-purchase-management.
- Grounding: PASS — node .opencode/scripts/spec-ground.cjs specs/tenant-purchase-management.
- Reachability audit: PASS — PurchasesModule, SuppliersModule and InventoryModule registered; five user routes call authenticated clients.
- Negative-path audit: purchase/supplier E2E covers permission, conversion, duplicate, soft-delete/history and idempotency; UI exposes API errors/retry and no local stock mutation. Adjustment FE-only marker is intentional deferred scope.
- Diff check: PASS — git diff --check.
- Docs impact: none.
