# Task R0-02: Entitlement and quota foundation (P)

**Requirement:** R0 — reusable backend entitlement contract
**Status:** done
**Priority:** P1
**Estimated Effort:** L
**Dependencies:** task-R0-01-schema-seed-audit-foundation.md
**Spec:** specs/admin-plan-subscription-management/

## Context

No central service currently decides whether a tenant has a usable subscription, feature, or quota. Create the reusable backend boundary described by `EffectiveEntitlement` and `EntitlementDenial`.

## Constraints

- **MUST** fail closed for missing/expired/cancelled/unavailable entitlement.
- **MUST** evaluate `TenantFeatureFlag` as explicit enabled/disabled override without bypassing subscription validity.
- **MUST** use an injected clock and bounded indexed lookup; no global cache is required.
- **MUST NOT** delete or mutate tenant data during downgrade.
- **SCOPE** evaluator/guard/quota primitives and tests; protected business route wiring is R1-03.

## Steps

- [x] 1. Create `backend/src/platform/entitlements/entitlement.constants.ts`, `entitlement.service.ts`, DTO/types, and `entitlement-denial.exception.ts` implementing the canonical contracts in `design.md`.
  - Derive expiry at `now`, select the latest non-cancelled effective row, and expose stable denial reasons.
  - _Requirements: 2.2, 5.1, 5.2, 5.3, 5.4_
- [x] 2. Create `backend/src/platform/entitlements/entitlements.guard.ts` and decorator metadata for required feature/quota; create `entitlements.module.ts` and register it from `backend/src/app.module.ts`.
  - Guard must use server-derived authenticated tenant context; route/body IDs must match it and never be trusted as the sole tenant selector.
  - _Requirements: 5.1, 5.2, 6.1, 9.1_
- [x] 3. Create `backend/src/platform/entitlements/entitlement.service.spec.ts` covering expiry, cancellation, flag overrides, unlimited quota, downgrade overage, and unavailable lookup.
  - _Requirements: 5.2, 5.3, 5.4, 6.2, 6.3_

## Requirements

- 2.2 — effective subscription selection and explicit no-entitlement state
- 5.1, 5.2, 5.3, 5.4 — feature evaluation and fail-closed denial
- 6.1, 6.2, 6.3 — quota dimensions, unlimited values, downgrade safety
- 9.1 — backend guard boundary

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/entitlements/entitlement.constants.ts` | Create | Canonical metadata and denial codes |
| `backend/src/platform/entitlements/entitlement.service.ts` | Create | Effective subscription/feature/quota evaluator |
| `backend/src/platform/entitlements/entitlements.guard.ts` | Create | Reusable tenant request guard |
| `backend/src/platform/entitlements/entitlements.module.ts` | Create | Nest module/export boundary |
| `backend/src/platform/entitlements/entitlement.service.spec.ts` | Create | Pure evaluator tests |
| `backend/src/app.module.ts` | Modify | Register entitlements module |
| `backend/prisma/schema.prisma` | Read | Existing relations/quota fields |

## Completion Criteria

- [x] Service returns the canonical effective-entitlement shape for active, trial, expired, cancelled, and absent states.
- [x] Feature/flag and all six quota dimensions have deterministic stable denial behavior.
- [x] Guard is importable by a tenant controller and fails closed on lookup failure.
- [x] Unit tests prove expired denial, quota overflow, downgrade preservation, and no data deletion.

## Evidence

- [x] Automated verification
  - Command(s): `cd backend && pnpm test -- --runInBand entitlement.service.spec.ts && pnpm build`
  - Receipt: `pnpm exec jest --runInBand platform/entitlements/entitlement.service.spec.ts` PASS (10 tests); `pnpm build` PASS; full backend suite PASS (15 suites, 119 tests).
- [x] Artifact / runtime verification
  - Inspect: `backend/src/platform/entitlements/entitlements.module.ts` export and `backend/src/app.module.ts` import.
  - Expect: service/guard are reachable from Nest DI.
  - Receipt: `EntitlementsModule` is registered in `AppModule` and exports service/guard; `entitlement-denial.exception.ts` is a dedicated contract artifact.
- [x] Runtime reachability verification
  - Entrypoint/caller: `EntitlementsGuard.canActivate()` from later protected tenant route task R1-03.
  - Expect: metadata is read and service approval is required before handler execution.
  - Receipt: guard requires server-derived tenant context, rejects tenant mismatch, requires server-derived quota usage, and fail-closes on lookup failure. Protected business route wiring remains deferred to R1-03.
- [x] Contract / negative-path verification
  - Check: expired subscription, disabled feature flag, finite quota overflow, and database lookup error.
  - Expect: HTTP-layer exception maps to `EntitlementDenial` with 403 semantics; no allow-by-default.
  - Receipt: targeted tests and review pass; no atomic-write claim made for this foundation task.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Expiry boundary grants access | Critical | Inject clock; test exact end/trial timestamps |
| Quota helper is used without atomic write | High | Document API split and require R1-03 transaction integration test |

---

> **Parallel marker:** Can proceed after R0-01 while API work waits for exported contracts.
