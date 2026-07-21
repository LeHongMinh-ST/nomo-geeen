# Task R3-01: Supplier reachability & end-to-end verification

**Requirement:** R8 — Reachability, seed-removal proof, and full-slice verification
**Status:** pending
**Priority:** P2
**Estimated Effort:** S
**Dependencies:** R1-01, R2-01
**Spec:** specs/tenant-supplier-management/

## Context

- **Why**: The slice is only "done" when the API-backed screens are reachable from the running app, no mock path survives, and back+front verification passes together.
- **Current state**: After R1-01 (backend hardened) and R2-01 (UI wired), the `/nha-cung-cap` surface should render API data and the seed modules should be unused by it.
- **Target outcome**: A single verification receipt proves list/detail/create/update/soft-delete work end to end, the supplier picker still works, and `@/lib/suppliers`/`@/lib/debts` are gone from the supplier surface.

## Constraints

- **MUST**: Verify against the running stack (or the closest available runtime); record real command output as proof; treat a Prisma P3009 DB-migration failure as an explicit environment blocker rather than a pass.
- **SHOULD**: Reuse R1-01/R2-01 evidence commands; add only the cross-cutting reachability checks here.
- **MUST NOT**: Add new product behavior; mark done on stale or partial evidence.
- **SCOPE**: Implement only R8 verification and the approved `scope_lock`.

## Steps

- [ ] 1. Prove `/nha-cung-cap` renders API-backed data end to end
  - Business intent: confirm the user-facing supplier workflow is real, not mock.
  - Code detail: run the stack; exercise list → search → detail → create → update → soft-delete against a seeded tenant; capture request/response or screen proof for each step.
  - _Requirements: 8.1, 8.3_

- [ ] 2. Prove no seed/mock path survives and the picker still works
  - Business intent: guarantee the migration is complete and nothing regressed.
  - Code detail: `grep -R "@/lib/suppliers\|@/lib/debts"` over the supplier surface returns nothing; verify `purchase/supplier-picker.tsx` still lists suppliers from the API.
  - _Requirements: 8.2_

- [ ] 3. Consolidate the verification receipt
  - Business intent: single source of proof for closeout.
  - Code detail: record backend (R1-01) + frontend (R2-01) command outputs plus the reachability checks; if a Prisma P3009 DB failure blocks E2E, record it as an explicit environment blocker with the failing command.
  - _Requirements: 8.3_

## Requirements

- 8.1 — The full supplier workflow runs API-backed end to end from `/nha-cung-cap`.
- 8.2 — No `@/lib/suppliers`/`@/lib/debts` import remains and the supplier picker still works.
- 8.3 — A consolidated verification receipt records real proof (or an explicit environment blocker).

## Related Files

| Path | Action | Description |
|---|---|---|
| `specs/tenant-supplier-management/reports/` | Create | Verification receipt / evidence log |
| `frontend/app/(app)/nha-cung-cap/**` | Modify | Only if a reachability gap is found |
| `backend/src/platform/suppliers/**` | Modify | Only if a reachability gap is found |

## Completion Criteria

- [ ] List/detail/create/update/soft-delete proven API-backed from `/nha-cung-cap`.
- [ ] Grep proof shows no seed/mock import in the supplier surface; picker still works.
- [ ] Consolidated verification receipt exists with real command output or an explicit blocker.
- [ ] No orphaned screen/route; every migrated component is reached from a `nha-cung-cap` route.

## Evidence

This section is both the task-level test plan and the proof checklist. Keep it short, exact, and executable.
Select the proof by task risk; do not run every test type for every task.

- Logic/data/validator task: include unit tests.
- Stateful UI/component task: include component or integration tests.
- Cross-module/API/state flow task: include integration tests.
- User-facing end-to-end workflow: include E2E/UI flow verification.
- Layout/theme/responsive task: include visual/runtime viewport checks.
- Interactive UI task: include accessibility checks when keyboard, focus, labels, or ARIA can regress.
- Scaffold/release task: include smoke build/test/dev-server checks.
- Performance/security checks are required only when the requirement, risk, or touched surface calls for them.

- [ ] Automated verification (full slice)
  - Command(s): `cd backend && npx jest suppliers` , `cd frontend && npx jest tenant-suppliers-api && npm run build`
  - Expected proof: backend + frontend suites PASS and build succeeds; counts non-zero.
- [ ] Artifact / runtime verification
  - Inspect: running `/nha-cung-cap` list/detail/form and network calls to `/tenant/suppliers`
  - Expect: create/update/soft-delete round-trip against the API with correct payable and status.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `frontend/app/(app)/nha-cung-cap/**` routes and `purchase/supplier-picker.tsx`
  - Expect: every migrated component is imported from a live route; picker still resolves suppliers from the API.
- [ ] Contract / negative-path verification
  - Check: `grep -R "@/lib/suppliers\|@/lib/debts" frontend/app/(app)/nha-cung-cap frontend/components`; cross-tenant/soft-deleted supplier not visible.
  - Expect: no matches; deleted/cross-tenant suppliers excluded end to end.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Prisma P3009 blocks running E2E/runtime proof | High | Record explicit environment blocker with failing command; keep unit/build proof and defer runtime step |
| Partial migration leaves a mock path in one screen | Medium | Grep gate over the whole supplier surface before marking done |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
