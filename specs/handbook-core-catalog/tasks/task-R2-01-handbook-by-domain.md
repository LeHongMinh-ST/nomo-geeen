# Task R2-01: Domain-labeled filters and search copy

**Requirement:** R2, R5
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5-1 day
**Dependencies:** `tasks/task-R1-02-frontend-handbook-category-ui.md`, `tasks/task-R1-03-animal-feed-domain.md`
**Spec:** specs/handbook-core-catalog/

## Context

- **Why**: Users browse advice by the five commercial labels; search must match labels without changing recommendation ranking.
- **Target outcome**: Filter chips + search use catalog labels; empty state retains category; client filter ≤100ms for 2k rows selector logic.

## Constraints

- **MUST**: Search matches name, aliases, subject, category label.
- **MUST NOT**: Change product recommendation ranking.
- **SCOPE**: FE filter/search UX only.

## Steps

- [x] 1. Wire filter bar options from catalog ordered array + `Tất cả`.
  - _Requirements: 2.1, 1.1_
- [x] 2. Search includes category display label; empty state keeps selected category.
  - _Requirements: 2.3, 2.4_
- [x] 3. Unit test selector performance budget (≤100ms pure function on 2k fixtures).
  - _Requirements: 5.1_

## Requirements

- 1.1, 2.1, 2.3, 2.4, 5.1

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/components/app/handbook/handbook-list.tsx` | Modify | Filter/search. |
| `frontend/lib/handbook.ts` | Modify | Selectors. |

## Completion Criteria

- [x] Five filters + all work.
- [x] Search includes category label.
- [x] Performance unit test for selector.

## Evidence
## Evidence

### Automated verification

```bash
pnpm --dir frontend test -- lib/handbook.test.ts
```

```text
# RESULT exit 0 — catalog fixtures + filters (2026-07-23)
```

### Artifact verification

```text
# PASS — mock entries cover five selectable categories where applicable
```

### Runtime reachability verification

```text
# PASS — HandbookList category filter + search includes category label
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Hardcoded labels drift | High | Single catalog module |
