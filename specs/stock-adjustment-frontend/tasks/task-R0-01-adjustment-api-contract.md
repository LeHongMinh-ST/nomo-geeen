# Task R0-01: Adjustment API contract

**Requirement:** R0 — Adjustment API contract
**Status:** done
**Priority:** P1
**Estimated Effort:** 1-2 days
**Dependencies:** none
**Spec:** specs/stock-adjustment-frontend/

## Context

- **Why**: Deliver this scoped frontend slice without orphaned work.
- **Current state**: Existing inventory routes, userFetch auth boundary, and completed backend adjustment API are available.
- **Target outcome**: Create frontend/lib/tenant-stock-adjustments-api.ts and its test. Use userFetch for GET list/detail and POST create/complete; preserve exact decimal-string contract, structured errors, and no tenantId.

## Constraints

- **MUST**: Stay inside scope_lock and preserve AdjustmentFrontendApi.
- **SHOULD**: Reuse existing inventory components and DESIGN.md tokens.
- **MUST NOT**: Change backend/schema, add dependencies, fabricate tenant/warehouse IDs, or use free-text-only reasons.
- **SCOPE**: Implement only requirements 1.1, 1.2, 5.1.

## Steps

- [x] 1. Create frontend/lib/tenant-stock-adjustments-api.ts and its test. Use userFetch for GET list/detail and POST create/complete; preserve exact decimal-string contract, structured errors, and no tenantId. Requirements: 1.1, 1.2, 5.1.
- [x] 2. Add focused unit/component/runtime verification for this behavior. Requirements: 1.1, 1.2, 5.1.

## Requirements

- 1.1, 1.2, 5.1 — Covered by this task.

## Related Files

| Path | Action | Description |
|---|---|---|
| frontend/lib/tenant-stock-adjustments-api.ts | Create / Modify | Relevant implementation or verification surface. |
| frontend/lib/tenant-stock-adjustments-api.test.ts | Create / Modify | Relevant implementation or verification surface. |
| frontend/lib/user-fetch.ts | Read | Relevant implementation or verification surface. |
| frontend/package.json | Read | Relevant implementation or verification surface. |

## Completion Criteria

- [x] All scoped behavior is implemented at named files and connected to a runtime entrypoint.
- [x] Invalid/loading/error/success states are observable and tested where applicable.
- [x] No placeholder, orphaned component, or out-of-scope backend change remains.

## Evidence

- [x] Automated verification: pnpm --dir frontend test; relevant tests pass.
- [x] Artifact / runtime verification: inspect named route/component files and run affected UI state.
- [x] Runtime reachability verification: R3-01 integration consumes this output from the inventory runtime.
- [x] Contract / negative-path verification: structured API error, invalid form, completed read-only, and auth-fetch behavior are preserved as applicable.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Contract or runtime drift | High | Reuse named contract and exact route entrypoint. |
| Responsive/accessibility regression | Medium | Test keyboard labels and mobile/desktop states. |

## Requirement Mapping

_Requirements: 1.1_
_Requirements: 1.2_
_Requirements: 5.1_
