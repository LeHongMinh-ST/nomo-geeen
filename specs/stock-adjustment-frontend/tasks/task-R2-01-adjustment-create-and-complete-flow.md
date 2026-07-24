# Task R2-01: Adjustment create and complete flow

**Requirement:** R2 — Adjustment create and complete flow
**Status:** done
**Priority:** P1
**Estimated Effort:** 1-2 days
**Dependencies:** tasks/task-R0-01-adjustment-api-contract.md, tasks/task-R1-01-adjustment-list-and-detail.md
**Spec:** specs/stock-adjustment-frontend/

## Context

- **Why**: Deliver this scoped frontend slice without orphaned work.
- **Current state**: Existing inventory routes, userFetch auth boundary, and completed backend adjustment API are available.
- **Target outcome**: Modify adjust-sheet.tsx into a closed-reason typed form using frontend/lib/stock-adjustment-reasons.ts with product/batch, non-zero delta, note, local errors; resolve warehouseId only from the authenticated/default warehouse context and block submission when absent; add explicit confirmation, create/complete calls, disabled pending state, refetch inventory detail/history before navigation, and structured failure preservation.

## Constraints

- **MUST**: Stay inside scope_lock and preserve AdjustmentFrontendApi.
- **SHOULD**: Reuse existing inventory components and DESIGN.md tokens.
- **MUST NOT**: Change backend/schema, add dependencies, fabricate tenant/warehouse IDs, or use free-text-only reasons.
- **SCOPE**: Implement only requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1.

## Steps

- [x] 1. Modify adjust-sheet.tsx into a closed-reason typed form with product/batch, non-zero delta, note, local errors; add explicit confirmation, create/complete calls, disabled pending state, success refresh/navigation, and structured failure preservation. Never fabricate warehouse ID. Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1.
- [x] 2. Add focused unit/component/runtime verification for this behavior. Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1.

## Requirements

- 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1 — Covered by this task.

## Related Files

| Path | Action | Description |
|---|---|---|
| frontend/components/app/inventory/adjust-sheet.tsx | Create / Modify | Relevant implementation or verification surface. |
| frontend/components/app/inventory/adjustment-confirmation.tsx | Create / Modify | Relevant implementation or verification surface. |
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

**Verification receipt:** `pnpm --dir frontend test` passed (26 files, 100 tests); `pnpm --dir frontend build` passed; focused Biome lint passed. Form uses only closed reason codes, blocks absent warehouse context, preserves decimal-string deltas, supports real inventory batches, creates drafts, confirms completion, and propagates structured failures.
## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Contract or runtime drift | High | Reuse named contract and exact route entrypoint. |
| Responsive/accessibility regression | Medium | Test keyboard labels and mobile/desktop states. |

## Requirement Mapping

_Requirements: 3.1_
_Requirements: 3.2_
_Requirements: 3.3_
_Requirements: 3.4_
_Requirements: 4.1_
_Requirements: 4.2_
_Requirements: 5.1_
