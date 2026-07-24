# Task R1-01: Adjustment list and detail

**Requirement:** R1 — Adjustment list and detail
**Status:** done
**Priority:** P1
**Estimated Effort:** 1-2 days
**Dependencies:** tasks/task-R0-01-adjustment-api-contract.md
**Spec:** specs/stock-adjustment-frontend/

## Context

- **Why**: Deliver this scoped frontend slice without orphaned work.
- **Current state**: Existing inventory routes, userFetch auth boundary, and completed backend adjustment API are available.
- **Target outcome**: Mount the adjustment history/list inside the existing ton-kho inventory surfaces rather than inventing a separate top-level route; create responsive adjustment list/detail components, modify existing inventory list/detail to expose them, show all canonical fields, and hide completion for COMPLETED. Reuse DESIGN.md, ListFilterBar, and DataPagination.

## Constraints

- **MUST**: Stay inside scope_lock and preserve AdjustmentFrontendApi.
- **SHOULD**: Reuse existing inventory components and DESIGN.md tokens.
- **MUST NOT**: Change backend/schema, add dependencies, fabricate tenant/warehouse IDs, or use free-text-only reasons.
- **SCOPE**: Implement only requirements 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 5.1.

## Steps

- [x] 1. Create responsive adjustment list/detail components; modify existing inventory list/detail to expose them; show all canonical fields and hide completion for COMPLETED. Reuse DESIGN.md, ListFilterBar, and DataPagination. Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 5.1.
- [x] 2. Add focused unit/component/runtime verification for this behavior. Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 5.1.

## Requirements

- 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 5.1 — Covered by this task.

## Related Files

| Path | Action | Description |
|---|---|---|
| frontend/components/app/inventory/adjustment-list.tsx | Create / Modify | Relevant implementation or verification surface. |
| frontend/components/app/inventory/adjustment-detail.tsx | Create / Modify | Relevant implementation or verification surface. |
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

**Verification receipt:** `pnpm --dir frontend test` passed (25 files, 98 tests); `pnpm --dir frontend build` passed; focused Biome lint passed for adjustment list/detail, inventory integration, route, and tests. Runtime reachability verified from `/ton-kho` and `/ton-kho/[id]?adjustment=...`; completed records render read-only.
## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Contract or runtime drift | High | Reuse named contract and exact route entrypoint. |
| Responsive/accessibility regression | Medium | Test keyboard labels and mobile/desktop states. |

## Requirement Mapping

_Requirements: 2.1_
_Requirements: 2.2_
_Requirements: 2.3_
_Requirements: 4.1_
_Requirements: 4.2_
_Requirements: 4.3_
_Requirements: 5.1_
