# Task R0-01: Define the canonical Handbook category contract

**Requirement:** R0 — Shared foundation for Requirements 1, 3, and 4
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5-1 day
**Dependencies:** none
**Spec:** specs/handbook-core-catalog/

## Context

- **Why**: The current UI uses three broad domains, while the product core value requires five exact commercial advice categories.
- **Current state**: `frontend/lib/handbook.ts` owns the FE union/labels; `backend/prisma/schema.prisma` owns `AgriDomain`; no shared Handbook category contract exists.
- **Target outcome**: A single, explicit contract defines IDs, exact Vietnamese labels, ordering, selectable state, and legacy fallback behavior for every later task.

## Constraints

- **MUST**: Define exactly five selectable IDs in this order: `CROP_PROTECTION_AND_FERTILIZER`, `CROP_SEEDLINGS`, `ANIMAL_FEED`, `VETERINARY_DRUGS`, `LIVESTOCK`.
- **MUST**: Map the first ID to the single label `Thuốc bảo vệ thực vật + Phân bón`.
- **SHOULD**: Keep `UNCATEGORIZED` as a read-only compatibility value for legacy rows.
- **MUST NOT**: Reuse mutable product category IDs, split the first category, or add aquaculture as a category.
- **SCOPE**: Foundation contract only; implementation of persistence/UI belongs to the dependent tasks.

## Steps

- [x] 1. Define the canonical category type, ordered catalog, labels, and legacy mapping table in `frontend/lib/handbook.ts` or the smallest shared Handbook domain module that the backend task can mirror.
  - Business intent: every screen uses the same five words and order.
  - Code detail: expose typed IDs, `{ id, label, selectable }`, `UNCATEGORIZED`, and explicit `AgriDomain` mapping; no `any`.
  - _Requirements: 1.1, 1.2, 1.3_
- [x] 2. Record the exact cross-layer contract in implementation-facing comments/tests and make it available to backend DTO/schema work without duplicating display literals.
  - Business intent: FE and BE cannot silently drift.
  - Code detail: preserve the `HandbookCategory` JSON block from `design.md` verbatim in contract tests or the chosen shared representation.
  - _Requirements: 1.1, 1.2, 3.2_
- [x] 3. Add unit coverage for order, labels, selectable flags, and unknown/deprecated fallback.
  - _Requirements: 1.1, 1.2, 1.3_

## Requirements

- 1.1 — The catalog exposes exactly five categories in the approved order.
- 1.2 — Stable IDs are distinct from labels and the first label is one combined category.
- 1.3 — Unknown/deprecated values render as `Chưa phân loại` without silent assignment.
- 3.2 — The stable ID and exact display label are available for list/detail responses.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/handbook.ts` | Modify | Replace broad field catalog with canonical category types/maps while preserving disease and suggestion types. |
| `specs/handbook-core-catalog/design.md` | Read | Canonical contract and invariants. |
| `frontend/lib/handbook.test.ts` | Create | Unit tests for catalog order, labels, flags, and fallback. |
| `backend/prisma/schema.prisma` | Read | Existing `Disease` and `AgriDomain` compatibility surface. |

## Completion Criteria

- [x] Exactly five selectable category IDs and the non-selectable fallback exist in one canonical contract.
- [x] The combined first label is not represented by two options; no aquaculture option is introduced.
- [x] Unknown and legacy values map to `Chưa phân loại` without mutating source data.
- [x] The contract unit test fails if order, labels, count, or selectable flags drift.
- [x] The contract is consumable by the backend and frontend tasks; no runtime-facing artifact is orphaned.

## Evidence
## Evidence

### Automated verification

```bash
pnpm --dir frontend test -- lib/handbook.test.ts
```

```text
# RESULT
# exit: 0
# summary: handbook.test.ts PASS (catalog order/labels/fallback/legacy map/suggestProducts); full frontend suite 59 passed 2026-07-23
```

### Artifact verification

```text
# RESULT
# PASS — frontend/lib/handbook.ts HANDBOOK_CATEGORY_CATALOG + mappers; mock uses category
```

### Runtime reachability verification

```text
# RESULT
# PASS — handbook-list / disease-form / card / detail import category contract
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| FE and BE define different labels or order | High | Named contract block and exact unit assertions. |
| Existing disease fields are accidentally removed during type refactor | High | Keep `Disease` shape and `suggestProducts` tests unchanged. |

---

> **Parallel marker**: Not parallel; it is the shared foundation for both implementation slices.
