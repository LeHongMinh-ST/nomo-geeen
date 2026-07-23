# Task R1-02: Update Handbook category filters and forms

**Requirement:** R1 — Frontend Handbook category slice
**Status:** done
**Priority:** P1
**Estimated Effort:** 1-1.5 days
**Dependencies:** `tasks/task-R0-01-handbook-category-contract.md`
**Spec:** specs/handbook-core-catalog/

## Context

- **Why**: Store staff currently filter by Trồng trọt, Chăn nuôi, and Thủy sản; those labels do not express the five core-value categories.
- **Current state**: `frontend/lib/handbook.ts` and `frontend/components/app/handbook/handbook-list.tsx` own the mock type, labels, filters, and search; `disease-form.tsx` owns create/edit fields.
- **Target outcome**: `/so-tay` and create/edit routes use the exact five-category contract and retain all existing advice/recommendation fields.

## Constraints

- **MUST**: Render exactly the five approved labels plus `Tất cả`; `Chưa phân loại` may render only for legacy data and is not a new-write option.
- **MUST**: Keep `suggestProducts`, pin ordering, ingredient/tag matching, stock state, route structure, and existing Design System behavior.
- **SHOULD**: Reuse `ListFilterBar`, existing card/table/detail components, and existing Be Vietnam Pro/primary tokens.
- **MUST NOT**: Add an aquaculture filter, split the first category, or duplicate category literals in components.
- **SCOPE**: Frontend category type/catalog/filter/form/mock wiring and UI tests; API client wiring may be completed by the final integration task when the backend slice exists.

## Steps

- [x] 1. Replace the three-domain Handbook type/labels/options in `frontend/lib/handbook.ts` with the canonical catalog and update mock entries with explicit categories while preserving disease details and suggestion metadata.
  - Business intent: mock/demo Handbook reflects the approved business taxonomy.
  - Code detail: keep selector/search functions typed; unknown legacy data renders fallback; do not change `suggestProducts` ranking.
  - _Requirements: 1.1, 1.2, 1.3, 4.2, 5.1_
- [x] 2. Update `frontend/components/app/handbook/handbook-list.tsx`, cards/detail, and `frontend/components/app/handbook/disease-form.tsx` to use the canonical options, labels, required validation, and empty-state behavior.
  - Business intent: staff can browse and maintain advice by the same five groups used in the store.
  - Code detail: preserve `/so-tay`, `/so-tay/:id`, and `/so-tay/:id/sua` routes; retain search by name/alias/subject and add category label matching; use accessible labels and >=48px controls.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2_
- [x] 3. Add Vitest/component coverage for all category filters, no-result state, form required validation, unknown fallback rendering, and recommendation ordering.
  - _Requirements: 1.3, 2.1, 2.2, 2.4, 4.2, 4.3, 5.1_

## Requirements

- 1.1 — UI catalog has exactly five categories in approved order.
- 1.2 — Combined first category remains one option with stable ID.
- 1.3 — Unknown legacy category renders `Chưa phân loại`.
- 2.1 — List filter includes the five categories plus `Tất cả`.
- 2.2 — Create/edit requires one canonical category and preserves technical fields.
- 2.3 — Search includes category label without changing suggestion ranking.
- 2.4 — Empty state retains filter/query context.
- 4.1 — Existing mobile/accessibility rules remain satisfied.
- 4.2 — Recommendation invariants remain unchanged.
- 4.3 — UI regression coverage exists.
- 5.1 — Selector logic is bounded to <=100ms for 2,000 entries.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/handbook.ts` | Modify | Canonical category catalog, mock category data, and preserved selectors. |
| `frontend/components/app/handbook/handbook-list.tsx` | Modify | Filter/search/list labels and empty state. |
| `frontend/components/app/handbook/disease-card.tsx` | Modify | Category badge/label compatibility if needed. |
| `frontend/components/app/handbook/disease-detail.tsx` | Modify | Display category without dropping technical details. |
| `frontend/components/app/handbook/disease-form.tsx` | Modify | Required category selection and submit validation. |
| `frontend/app/(app)/so-tay/page.tsx` | Read | Runtime list entrypoint. |
| `frontend/app/(app)/so-tay/them/page.tsx` | Read | Runtime create entrypoint. |
| `frontend/app/(app)/so-tay/[id]/sua/page.tsx` | Read | Runtime edit entrypoint. |
| `frontend/components/app/handbook/__tests__/handbook-category.test.tsx` | Create | Component/selector regression tests. |

## Completion Criteria

- [x] `/so-tay` exposes exactly five approved category filters and no separate aquaculture filter.
- [x] Create/edit cannot submit without a selectable canonical category and keeps all existing advice fields.
- [x] Unknown legacy entries render `Chưa phân loại`; search and empty state behave as specified.
- [x] Existing pinned/ingredient/tag/stock recommendation ordering remains test-proven.
- [x] All touched UI remains reachable through the existing list/detail/create/edit route tree.

## Evidence

### Automated verification

```bash
pnpm --dir frontend test -- lib/handbook.test.ts
pnpm --dir frontend exec tsc --noEmit -p tsconfig.json
```

```text
# RESULT exit 0 — handbook contract + UI components compile (59 FE tests)
```

### Artifact verification

```text
# PASS — handbook-list / disease-form / card / detail use HANDBOOK_CATEGORY_CATALOG
```

### Runtime reachability verification

```text
# PASS — /so-tay → HandbookList filters by category
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Taxonomy refactor drops existing fields or recommendation logic | High | Preserve `Disease` shape and add regression assertions around `suggestProducts`. |
| UI duplicates labels and drifts from API | Medium | Import the canonical catalog in every list/form/detail surface. |
| Mobile controls become too small or color-only | Medium | Reuse existing `ListFilterBar`, labels, focus styles, and viewport/accessibility checks. |

---

> **Parallel marker**: `(P)` after the title is intentionally omitted because this task and backend task both consume the contract and may touch shared Handbook data types.
