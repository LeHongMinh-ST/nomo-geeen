# Task R7-01: Sales order acceptance and reachability

**Requirement:** R8 - Performance, security, reliability, and accessibility
**Status:** pending
**Priority:** P1
**Estimated Effort:** 5 hours
**Dependencies:** tasks/task-R0-01-sales-order-contract-schema-foundation.md, tasks/task-R1-01-order-query-api.md, tasks/task-R2-01-order-create-complete-api.md, tasks/task-R3-01-order-cancellation-compensation.md, tasks/task-R4-01-tenant-sales-client-customer-picker.md, tasks/task-R5-01-order-list-detail-integration.md, tasks/task-R6-01-order-create-lifecycle-integration.md
**Spec:** specs/tenant-sales-order-management/

## Context

- Human intent: release confidence covers the complete user-visible workflow.
- Current state: focused proof exists, but no final gate covers isolation, reachability, transaction safety, performance, and accessibility together.
- Target outcome: acceptance tests prove every scoped entrypoint and record blockers.

## Constraints

- MUST test GET/POST /tenant/sales/orders and /don-ban-hang, /don-ban-hang/tao, /don-ban-hang/:id with tenant A/B.
- MUST cover denial, cross-tenant/wrong-channel 404, idempotency conflict, draft zero effects, race, rollback, SALE_CANCEL, and DECREASE ledger.
- SHOULD measure 30 warm list requests against 1,000 orders and p95 below 500 ms.
- MUST NOT add scope, cache order/inventory/debt, mutate production data, or call build-only proof complete when E2E is unavailable.

## Steps

- [ ] 1. Extend backend/test/tenant-sales.e2e-spec.ts with list/detail/create/complete/cancel, tenant A/B, permissions/features, replay/conflict, stock/debt/movement/ledger, rollback, and race.
  - _Requirements: 1.1, 1.2, 1.4, 2.2, 2.5, 3.2, 3.3, 3.4, 3.5, 4.2, 4.3, 4.5, 5.1, 5.2, 5.3, 5.4, 8.3_
- [ ] 2. Add route/accessibility checks at 390px, 768px, and 1280px; verify DataPagination, LoadMoreSentinel, labels/focus/Escape/keyboard, all API states, no seeded imports/cache.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 8.2, 8.4_
- [ ] 3. Run benchmark, query-plan inspection, focused suites/builds, and final reconciliation.
  - _Requirements: 8.1, 8.3, 8.4_

## Requirements

- 8.1 - Capped indexed list p95 below 500 ms on stated fixture.
- 8.2 - Safe explicit DTOs and no raw Prisma serialization.
- 8.3 - Unit/component/integration/E2E proof of critical paths.
- 8.4 - Responsive accessible state proof.

## Related Files

| Path | Action | Description |
|---|---|---|
| backend/test/tenant-sales.e2e-spec.ts | Modify | Tenant HTTP/persistence acceptance |
| frontend/components/app/sales/__tests__/order-acceptance.spec.tsx | Create | Route UI/accessibility acceptance |
| frontend/components/app/shared/data-pagination.tsx | Read | Desktop paging primitive |
| frontend/components/app/shared/load-more-sentinel.tsx | Read | Mobile incremental-load primitive |

## Completion Criteria

- [ ] All canonical API/UI entrypoints are exercised from real callers.
- [ ] Isolation, authorization, idempotency, exact-once effects, rollback, compensation, and race pass.
- [ ] 30 warm requests against 1,000 orders report p95 below 500 ms or a concrete blocker.
- [ ] Three viewport checks prove responsive accessibility and no runtime mock/cache path.
- [ ] Reconciliation has exact commands/artifacts.

## Evidence

- Automated proof: backend tenant-sales E2E, frontend acceptance test, backend/frontend builds.
- Artifact/runtime proof: inspect HTTP responses, Sale/StockMovement/Customer/DebtLedger rows, viewport artifacts, benchmark/query-plan output.
- Reachability proof: start at SalesModule/SalesController and the three Next routes; every task output is invoked.
- Contract/negative proof: tenant B, missing permission/feature, wrong channel, replay, insufficient stock/debt, return, race, sentinel repeat, keyboard/focus.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| E2E database/browser unavailable | High | Record blocker and keep readiness false; do not substitute build-only evidence. |
| Fixture overlap | Medium | Use isolated tenant fixtures and scoped setup/teardown. |
| Performance not reproducible | Medium | Fix fixture size, warm-up count, query shape, and p95 calculation. |
## Runtime reachability verification

- Entrypoints: SalesModule/SalesController and Next routes /don-ban-hang, /don-ban-hang/tao, /don-ban-hang/[id].
- Proof: HTTP and UI acceptance tests reach every prior task output and report any unavailable environment.
