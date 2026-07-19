# Task R1-02: Subscription lifecycle API

**Requirement:** R2/R3/R4 — tenant subscription visibility and manual lifecycle
**Status:** done
**Priority:** P1
**Estimated Effort:** L
**Dependencies:** task-R0-01-schema-seed-audit-foundation.md, task-R1-01-plan-catalog-api.md
**Spec:** specs/admin-plan-subscription-management/

## Context

Add admin endpoints for current subscription/history and manual assign/change/renew/cancel. The service is the sole owner of lifecycle transitions and records offline sales context without invoking payment providers.

## Constraints

- **MUST** use the exact `SubscriptionMutation` contract and UTC dates with injected clock; `PAST_DUE` is never effective and manual reference/reason limits are 200/500 characters with CR/LF protection.
- **MUST** close prior effective row and create a new row on plan change; never delete history/data.
- **MUST** use optimistic concurrency and `AuditLogger.run` for every mutation.
- **MUST NOT** create Stripe calls, automatic invoices, retries, refunds, or cleanup jobs.
- **SCOPE** backend API/service/DTO/e2e contract; frontend is R2-02.

## Steps

- [x] 1. Extend `backend/src/platform/billing/billing.service.ts` and create subscription DTOs for read/current/history, assign/change, renew, and cancel routes under `/admin/tenants/:tenantId/subscription`.
  - Select latest non-cancelled row and derive `EXPIRED`; validate active plan, date ordering, reason/reference length, tenant existence, and stale timestamp.
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
- [x] 2. Add audit before/after snapshots and stable error mapping; preserve old rows and tenant data on downgrade/cancel.
  - _Requirements: 4.1, 4.2, 4.3, 6.3_
- [x] 3. Update `backend/src/platform/tenants/tenants.controller.ts`/service response only if needed to expose the subscription summary while keeping existing tenant contract backward compatible.
  - _Requirements: 2.1_

## Requirements

- 2.1–2.3 — current subscription/history and not-found behavior
- 3.1–3.6 — manual assign/change/renew/cancel and no provider automation
- 4.1–4.3 — complete audit history and authorization
- 6.3 — downgrade data preservation

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/billing/billing.service.ts` | Modify | Subscription lifecycle/read logic |
| `backend/src/platform/billing/billing.controller.ts` | Modify | Subscription routes/guards |
| `backend/src/platform/billing/dto/create-subscription.dto.ts` | Create | Assign/change validation |
| `backend/src/platform/billing/dto/renew-subscription.dto.ts` | Create | Renewal validation |
| `backend/src/platform/billing/dto/cancel-subscription.dto.ts` | Create | Cancellation reason validation |
| `backend/src/platform/billing/billing.service.spec.ts` | Modify | Lifecycle/audit unit tests |
| `backend/src/platform/tenants/tenants.controller.ts` | Read / Modify | Preserve tenant detail route if summary is added |
| `backend/src/platform/tenants/tenants.service.ts` | Read / Modify | Existing tenant detail query |

## Completion Criteria

- [x] Admin can read current/history and execute assign/change/renew/cancel with exact status/date semantics.
- [x] Plan change creates two historical rows; renewal extends from `max(endDate, now)`; cancellation denies after effective time.
- [x] Stale/unauthorized/not-found/provider-scope negative paths return correct errors without mutation/audit drift.
- [x] Existing tenant data remains intact after downgrade (no destructive data path introduced).

## Evidence

- [x] Automated verification
  - Command(s): `cd backend && pnpm test -- --runInBand billing.service.spec.ts && pnpm test:e2e -- --runInBand admin-billing.e2e-spec.ts`
  - Receipt: Prisma generate PASS; migration deploy PASS; Biome PASS; build PASS; billing/entitlement targeted tests PASS (19 tests); targeted `admin-billing.e2e-spec.ts` PASS (3 tests); full backend suite PASS (16 suites, 129 tests). The repo's extra `pnpm test -- --runInBand` wrapper is incompatible with Jest pattern parsing, so equivalent `pnpm exec jest --runInBand ...` commands were used.
- [x] Artifact / runtime verification
  - Inspect: `billing.controller.ts` route list and Prisma rows after assign/change/renew/cancel fixture.
  - Expect: one effective row, closed previous row, immutable history, audit rows.
  - Receipt: routes are registered under `BillingModule`; real Postgres fixture created a plan, assigned a subscription, renewed, cancelled, and read immutable history successfully.
- [x] Runtime reachability verification
  - Entrypoint/caller: `/admin/tenants/:tenantId/subscription*`.
  - Expect: route resolves through `BillingModule` and existing tenant detail remains reachable.
  - Receipt: controller exposes GET/POST/renew/cancel with exact auth/permission metadata; tenant detail route was not changed.
- [x] Contract / negative-path verification
  - Check: expired state, inactive plan, stale `expectedUpdatedAt`, unauthorized role, and attempted provider field.
  - Expect: explicit 400/403/404/409 and no partial writes.
  - Receipt: DTO/service paths cover date/reference/reason validation, inactive plan, soft-deleted tenant, stale updates, expiry, and no provider calls; E2E proves unauthenticated 401 and stale 409 without partial lifecycle mutation.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Two concurrent plan changes both become effective | Critical | Conditional update/transaction plus stale conflict test |
| Expired row still grants access | Critical | Central evaluator and exact boundary tests in R0-02/R3-01 |
