# Task R2-01: Prove Handbook reachability and rollout safety

**Requirement:** R2 — Integration and verification gate for the Handbook catalog
**Status:** pending
**Priority:** P1
**Estimated Effort:** 0.5-1 day
**Dependencies:** `tasks/task-R0-01-handbook-category-contract.md`, `tasks/task-R1-01-backend-handbook-category.md`, `tasks/task-R1-02-frontend-handbook-category-ui.md`
**Spec:** specs/handbook-core-catalog/

## Context

- **Why**: The category contract spans data, API, and UI. A passing isolated unit test is insufficient if the runtime route does not reach the new catalog or if rollout can strand legacy entries.
- **Current state**: `/so-tay` is reachable through `frontend/app/(app)/so-tay/page.tsx`; backend runtime composes modules from `backend/src/app.module.ts`; current Handbook UI is FE-only.
- **Target outcome**: One integrated proof shows the five categories are reachable, filtered, persisted, tenant-safe, and reversible without changing recommendation behavior.

## Constraints

- **MUST**: Verify the real runtime entrypoints and both package build paths.
- **MUST**: Include a negative path for invalid category/tenant isolation and a migration rollback inspection.
- **SHOULD**: Use the existing Playwright/Browser automation path for responsive UI evidence when a dev server is available.
- **MUST NOT**: Mark the feature complete based on build-only proof or delete legacy Handbook data during cleanup.
- **SCOPE**: Integration/regression verification and implementation notes needed to wire prior outputs; no new product behavior.

## Steps

- [ ] 1. Wire the frontend data source to the backend Handbook contract where the API slice is available, preserving the existing mock fallback only if the repository's current runtime policy requires it.
  - Business intent: the category selected by staff is the same category persisted by the tenant API.
  - Code detail: use the canonical response shape and preserve loading/error/empty behavior; ensure `frontend/app/(app)/so-tay/page.tsx` reaches the final data path.
  - _Requirements: 3.2, 4.3, 5.2_
- [ ] 2. Add an end-to-end/UI regression flow covering list → filter → detail → create/edit category, including a mobile viewport and keyboard/focus checks.
  - Business intent: staff can complete the core advice lookup workflow on the actual runtime surface.
  - Code detail: verify exact labels, no aquaculture/split option, empty state, and unchanged product suggestion order.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3_
- [ ] 3. Run full scoped verification and record migration/rollback evidence before synchronizing task state.
  - _Requirements: 5.1, 5.2, 7.1, 7.2_

## Requirements

- 2.1 — Runtime list reaches all canonical filters.
- 2.2 — Runtime create/edit preserves required category behavior.
- 2.3 — Runtime search includes category label.
- 2.4 — Runtime no-result state preserves context.
- 3.2 — API/UI use the same response contract.
- 4.1 — Responsive/accessibility checks pass.
- 4.2 — Recommendation behavior remains unchanged.
- 4.3 — Integrated regression proof exists.
- 5.1 — Selector performance target is verified or measured.
- 5.2 — Backend filtering/pagination is observed in the runtime contract.
- 7.1 — Unmappable migration rows are observable and retained.
- 7.2 — Rollback evidence shows no destructive data step.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/app/(app)/so-tay/page.tsx` | Modify | Reach the final Handbook data path if API wiring is introduced. |
| `frontend/app/(app)/so-tay/[id]/page.tsx` | Read | Detail route reachability. |
| `frontend/app/(app)/so-tay/them/page.tsx` | Read | Create route reachability. |
| `frontend/app/(app)/so-tay/[id]/sua/page.tsx` | Read | Edit route reachability. |
| `backend/src/app.module.ts` | Read | Backend module registration reachability. |
| `frontend/e2e/handbook-category.spec.ts` | Create | Runtime UI/E2E flow if the repository's E2E location is confirmed; otherwise place beside the existing frontend test convention. |
| `backend/test/tenant-handbook.e2e-spec.ts` | Modify | Final API contract and tenant isolation acceptance proof. |
| `specs/handbook-core-catalog/reports/` | Create | Optional verification receipt or migration report; no implementation code. |

## Completion Criteria

- [ ] Actual frontend routes and backend module entrypoint reach the canonical category contract.
- [ ] Integrated flow proves all five labels, filtering, search, detail, create/edit, and legacy fallback.
- [ ] Negative paths prove invalid category rejection and tenant isolation.
- [ ] Frontend/backend builds and focused tests pass; migration/rollback evidence is recorded.
- [ ] No implementation artifact is orphaned and no legacy Handbook data or pins are deleted.

## Evidence

- [ ] Automated verification (scoped/full)
  - Command(s): `pnpm --dir frontend test`; `pnpm --dir frontend build`; `pnpm --dir backend test`; `pnpm --dir backend build`
  - Expected proof: all applicable commands exit 0 with focused Handbook tests included.
- [ ] Artifact / runtime verification
  - Inspect: `/so-tay`, `/so-tay/them`, `/so-tay/:id`, `/so-tay/:id/sua`, backend Handbook endpoint, and migration output.
  - Expect: one five-value contract is reachable end to end and migration reports mapped/unmapped rows.
- [ ] Runtime reachability verification
  - Entrypoint/caller: frontend app layout → `/so-tay` routes; `backend/src/main.ts` → `backend/src/app.module.ts`.
  - Expect: list/detail/form and API service are imported/mounted/invoked from real runtime paths.
- [ ] Contract / negative-path verification
  - Check: invalid category, missing permission, wrong tenant, legacy unmappable row, rollback rehearsal.
  - Expect: explicit 400/401/403 behavior, no cross-tenant data, retained fallback row, and non-destructive rollback.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| FE mock and backend API diverge at integration | High | Reuse the named `HandbookCategory` contract and run end-to-end response assertions. |
| Migration rollback is assumed but not proven | High | Inspect generated SQL/report and rehearse restore in a disposable database before release. |
| UI verification misses mobile/keyboard regressions | Medium | Use mobile viewport plus focus/label checks and existing Design System rules. |

---

> **Parallel marker**: Not parallel; this is the final integration gate and depends on both implementation slices.
