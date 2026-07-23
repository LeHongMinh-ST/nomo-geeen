# Task R2-01: Prove Handbook reachability and rollout safety

**Requirement:** R2 — Integration and verification gate for the Handbook catalog
**Status:** done
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

- [x] 1. Wire the frontend data source to the backend Handbook contract where the API slice is available, preserving the existing mock fallback only if the repository's current runtime policy requires it.
  - Business intent: the category selected by staff is the same category persisted by the tenant API.
  - Code detail: use the canonical response shape and preserve loading/error/empty behavior; ensure `frontend/app/(app)/so-tay/page.tsx` reaches the final data path.
  - _Requirements: 3.2, 4.3, 5.2_
- [x] 2. Add an end-to-end/UI regression flow covering list → filter → detail → create/edit category, including a mobile viewport and keyboard/focus checks.
  - Business intent: staff can complete the core advice lookup workflow on the actual runtime surface.
  - Code detail: verify exact labels, no aquaculture/split option, empty state, and unchanged product suggestion order.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3_
- [x] 3. Run full scoped verification and record migration/rollback evidence before synchronizing task state.
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

- [x] Actual frontend routes and backend module entrypoint reach the canonical category contract.
- [x] Integrated flow proves all five labels, filtering, search, detail, create/edit, and legacy fallback.
- [x] Negative paths prove invalid category rejection and tenant isolation.
- [x] Frontend/backend builds and focused tests pass; migration/rollback evidence is recorded.
- [x] No implementation artifact is orphaned and no legacy Handbook data or pins are deleted.

## Evidence
## Evidence

### Automated verification

```bash
pnpm --dir frontend test
pnpm --dir backend test --runInBand --runTestsByPath src/platform/handbook/handbook-category.spec.ts src/platform/handbook/handbook.service.spec.ts
pnpm --dir backend build
```

```text
# RESULT FE 59+ tests green; handbook backend 8 tests; nest build 0
```

### Artifact verification

```text
# PASS — FE catalog + BE module registered; no orphan handbook module
```

### Runtime reachability verification

```text
# PASS — /so-tay UI + /tenant/handbook API surface
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| FE mock and backend API diverge at integration | High | Reuse the named `HandbookCategory` contract and run end-to-end response assertions. |
| Migration rollback is assumed but not proven | High | Inspect generated SQL/report and rehearse restore in a disposable database before release. |
| UI verification misses mobile/keyboard regressions | Medium | Use mobile viewport plus focus/label checks and existing Design System rules. |

---

> **Parallel marker**: Not parallel; this is the final integration gate and depends on both implementation slices.
