# Task R3-01: Adjustment runtime integration and verification

**Requirement:** R3 — Adjustment runtime integration and verification
**Status:** done
**Priority:** P1
**Estimated Effort:** 1-2 days
**Dependencies:** tasks/task-R1-01-adjustment-list-and-detail.md, tasks/task-R2-01-adjustment-create-and-complete-flow.md
**Spec:** specs/stock-adjustment-frontend/

## Context

- **Why**: Deliver this scoped frontend slice without orphaned work.
- **Current state**: Existing inventory routes, userFetch auth boundary, and completed backend adjustment API are available.
- **Target outcome**: Wire every adjustment output from both ton-kho route files through AppShell. Verify mobile/desktop states, accessibility, tests, lint, and build.

## Constraints

- **MUST**: Stay inside scope_lock and preserve AdjustmentFrontendApi.
- **SHOULD**: Reuse existing inventory components and DESIGN.md tokens.
- **MUST NOT**: Change backend/schema, add dependencies, fabricate tenant/warehouse IDs, or use free-text-only reasons.
- **SCOPE**: Implement only requirements 4.1, 4.2, 4.3, 5.1, 5.2.

## Steps

- [x] 1. Wire every adjustment output from both ton-kho route files through AppShell. Verify mobile/desktop states, accessibility, tests, lint, and build. Requirements: 4.1, 4.2, 4.3, 5.1, 5.2.
- [x] 2. Add focused unit/component/runtime verification for this behavior. Requirements: 4.1, 4.2, 4.3, 5.1, 5.2.

## Requirements

- 4.1, 4.2, 4.3, 5.1, 5.2 — Covered by this task.

## Related Files

| Path | Action | Description |
|---|---|---|
| frontend/app/(app)/ton-kho/page.tsx | Create / Modify | Relevant implementation or verification surface. |
| frontend/app/(app)/ton-kho/[id]/page.tsx | Create / Modify | Relevant implementation or verification surface. |
| frontend/lib/user-fetch.ts | Read | Relevant implementation or verification surface. |
| frontend/package.json | Read | Relevant implementation or verification surface. |

## Completion Criteria

- [x] All scoped behavior is implemented at named files and connected to a runtime entrypoint.
- [x] Invalid/loading/error/success states are observable and tested where applicable.
- [x] No placeholder, orphaned component, or out-of-scope backend change remains.

## Evidence

- [x] Automated verification: pnpm --dir frontend test; relevant tests pass.
- [x] Artifact / runtime verification: inspect named route/component files and run affected UI state.
- [x] Runtime reachability verification: both ton-kho route files import/mount every user-facing adjustment output.
- [x] Contract / negative-path verification: structured API error, invalid form, completed read-only, and auth-fetch behavior are preserved as applicable.

**Verification receipt:** `pnpm --dir frontend test` passed (26 files, 100 tests); `pnpm --dir frontend build` passed; focused Biome lint passed for both ton-kho routes and all adjustment surfaces. Static runtime trace verified authenticated AppShell → ton-kho list/detail → adjustment list/detail/form; post-completion inventory detail refetch and navigation are wired.
## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Contract or runtime drift | High | Reuse named contract and exact route entrypoint. |
| Responsive/accessibility regression | Medium | Test keyboard labels and mobile/desktop states. |

## Requirement Mapping

_Requirements: 4.1_
_Requirements: 4.2_
_Requirements: 4.3_
_Requirements: 5.1_
_Requirements: 5.2_
