# Task R1-03: Entitlement enforcement integration

**Requirement:** R5/R6 — backend feature and quota enforcement
**Status:** pending
**Priority:** P1
**Estimated Effort:** L
**Dependencies:** task-R0-02-entitlement-quota-foundation.md, task-R1-02-subscription-lifecycle-api.md
**Spec:** specs/admin-plan-subscription-management/

## Context

The reusable guard exists after R0-02, but protected tenant request/write paths must invoke it and perform quota checks atomically. Current backend lacks a complete tenant controller for every business domain, so integrate with the first existing tenant write entrypoint and add a minimal contract-test host only where no real route exists.

## Constraints

- **MUST** make backend enforcement authoritative; frontend checks are advisory only.
- **MUST** combine quota evaluation with the protected create mutation in a transaction/conditional write.
- **MUST** preserve existing rows and permit reads after downgrade while blocking growth over finite limits.
- **MUST NOT** invent a second entitlement algorithm in a business service.
- **SCOPE** integration/wiring only; evaluator logic belongs to R0-02.

## Steps

- [ ] 1. Add `@RequireFeature`/`@RequireQuota` metadata to the first applicable tenant controller/service and wire `EntitlementsGuard` through its module; if no real route exists, create `backend/src/platform/entitlements/entitlements.contract-host.controller.ts` solely for integration proof.
  - _Requirements: 5.1, 5.2, 6.1, 9.1_
- [ ] 2. Implement the protected create adapter so usage + requested delta + mutation are atomic for users, warehouses, products, customers, orders/month, and storage where each domain is available. Lock/conditionally update the tenant or period-scoped counter in the same transaction; monthly orders use a period-scoped counter.
  - _Requirements: 6.1, 6.2, 6.4_
- [ ] 3. Add integration tests proving missing feature/expired subscription/over-quota requests are 403 and existing overage records remain readable.
  - _Requirements: 5.2, 5.4, 6.3, 6.4_

## Requirements

- 5.1–5.4 — authoritative backend feature enforcement
- 6.1–6.4 — quota enforcement, atomicity, downgrade safety
- 9.1 — guard reachability

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/entitlements/entitlements.guard.ts` | Modify | Complete request metadata/tenant extraction |
| `backend/src/platform/entitlements/entitlements.module.ts` | Modify | Export guard/decorators |
| `backend/src/platform/entitlements/entitlements.contract-host.controller.ts` | Create | Only if no existing tenant route can host contract tests |
| `backend/src/platform/entitlements/entitlements.integration.spec.ts` | Create | Guard/quota integration tests |
| `backend/src/platform/tenants/tenants.module.ts` | Read / Modify | Attach shared enforcement where applicable |
| `backend/src/platform/tenants/tenants.service.ts` | Read / Modify | Existing tenant entrypoint candidate |
| `backend/src/app.module.ts` | Read / Modify | Runtime module reachability |

## Completion Criteria

- [ ] At least one real tenant request/write entrypoint invokes the shared guard; fallback host is clearly test-only if no real route exists.
- [ ] Missing feature, expired subscription, disabled flag, and quota overflow return stable 403 denial contracts.
- [ ] Concurrent finite-quota writes cannot oversubscribe, and downgrade never deletes data or blocks existing reads.
- [ ] No duplicate entitlement logic is introduced in protected services.

## Evidence

- [ ] Automated verification
  - Command(s): `cd backend && pnpm test -- --runInBand entitlements.integration.spec.ts && pnpm build`
  - Expected proof: integration denial/atomicity suite and build pass.
- [ ] Artifact / runtime verification
  - Inspect: controller decorators, module imports, and protected create transaction.
  - Expect: handler cannot run before guard approval and quota mutation is atomic.
- [ ] Runtime reachability verification
  - Entrypoint/caller: real tenant controller, or named contract-host route under `EntitlementsModule`.
  - Expect: request metadata reaches `EntitlementService` and denial is observable at HTTP boundary.
- [ ] Contract / negative-path verification
  - Check: direct API call bypassing UI, absent DB entitlement, concurrent creates, post-downgrade read.
  - Expect: deny/fail-closed, no oversubscription, existing read preserved.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| No current route offers a production enforcement hook | High | Require real-route discovery; otherwise keep contract host explicit and block completion until first route is named |
| Check-then-write race | Critical | Transaction/conditional write test with concurrent requests |
