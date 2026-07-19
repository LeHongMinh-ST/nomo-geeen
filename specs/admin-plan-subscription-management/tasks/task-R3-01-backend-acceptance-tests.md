# Task R3-01: Backend acceptance tests

**Requirement:** R8/R9 and cross-cutting acceptance
**Status:** pending
**Priority:** P1
**Estimated Effort:** L
**Dependencies:** task-R1-02-subscription-lifecycle-api.md, task-R1-03-entitlement-enforcement-integration.md
**Spec:** specs/admin-plan-subscription-management/

## Context

Add the required automated coverage across evaluator, lifecycle, permission, quota, and audit boundaries. Tests must prove business outcomes rather than only mocks.

## Constraints

- **MUST** cover expired status, quota overflow, plan change, downgrade preservation, unauthorized mutation, stale lifecycle, and audit atomicity.
- **MUST** use repository Jest/e2e configuration and deterministic injected clock/fixtures.
- **SHOULD** include indexed/paged query assertions and a bounded performance fixture where feasible.
- **MUST NOT** weaken existing auth/tenant tests or mark required tests as skipped.

## Steps

- [ ] 1. Create/extend `backend/src/platform/billing/billing.controller.spec.ts`, `backend/src/platform/billing/billing.service.spec.ts`, and `backend/src/platform/entitlements/entitlement.service.spec.ts` for DTO, route metadata, state, feature, quota, and audit cases.
  - _Requirements: 4.1, 4.2, 4.3, 5.2, 6.1, 6.3, 9.2, 9.4_
- [ ] 2. Create `backend/test/admin-billing.e2e-spec.ts` covering guarded plan CRUD, tenant current/history, assign/change/renew/cancel, expired denial, quota denial, and stale conflict.
  - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5, 5.2, 6.1, 9.4_
- [ ] 3. Add concurrency/atomicity and deterministic 100k-row page/lookup evidence: seed 100,000 subscriptions, warm up 30 requests, measure 100 requests, record p95 and environment; do not introduce a new test framework.
  - _Requirements: 6.4, 8.1, 8.2, 9.4_

## Requirements

- 4.1–4.3 — audit and unauthorized mutation
- 5.2 — expired/feature denial
- 6.1, 6.3, 6.4 — quota overflow, downgrade preservation, atomicity
- 8.1, 8.2 — query bounds/performance
- 9.2, 9.4 — validation and required test matrix

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/billing/billing.controller.spec.ts` | Create | Route guard/contract tests |
| `backend/src/platform/billing/billing.service.spec.ts` | Modify | Plan/lifecycle/audit tests |
| `backend/src/platform/entitlements/entitlement.service.spec.ts` | Modify | Evaluator/quota cases |
| `backend/test/admin-billing.e2e-spec.ts` | Create | HTTP/database acceptance suite |
| `backend/test/jest-e2e.json` | Read | Existing e2e setup |
| `backend/test/admin-tenants.e2e-spec.ts` | Read / Modify | Reuse tenant fixtures without regression |

## Completion Criteria

- [ ] Required six scenarios and negative permission/stale/audit cases execute and pass.
- [ ] Plan change proves prior row/history and downgrade proves data preservation.
- [ ] Quota concurrency cannot exceed finite limit; endpoint pagination/lookup has bounded evidence.
- [ ] Existing backend test suites remain green.

## Evidence

- [ ] Automated verification
  - Command(s): `cd backend && pnpm test -- --runInBand && pnpm test:e2e -- --runInBand admin-billing.e2e-spec.ts`
  - Expected proof: all unit/e2e tests pass with named scenarios.
- [ ] Artifact / runtime verification
  - Inspect: Jest output, seeded DB rows, audit rows, and denial payloads.
  - Expect: concrete proof for expiry, overflow, plan change, stale, and audit atomicity.
- [ ] Runtime reachability verification
  - Entrypoint/caller: Nest routes and `EntitlementsGuard` integration host/real tenant route.
  - Expect: tests exercise HTTP/DI path, not only isolated helper calls.
- [ ] Contract / negative-path verification
  - Check: no permission, expired/cancelled, disabled feature, over quota, invalid date, provider field.
  - Expect: 401/403/400/409 with no partial state.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Mock-heavy tests miss transaction behavior | High | Include e2e rows/audit assertions and concurrency test |
| Existing fixtures assume no subscription | Medium | Add explicit neutral fixtures and preserve old suite setup |
