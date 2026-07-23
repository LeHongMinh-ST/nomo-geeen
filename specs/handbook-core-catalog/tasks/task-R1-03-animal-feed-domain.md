# Task R1-03: Handbook fixtures for five categories

**Requirement:** R1, R2, R4
**Status:** done
**Priority:** P2
**Estimated Effort:** 0.5-1 day
**Dependencies:** `tasks/task-R0-01-handbook-category-contract.md`, `tasks/task-R1-01-backend-handbook-category.md`
**Spec:** specs/handbook-core-catalog/

## Context

- **Why**: Filter UX and empty states need sample entries across all five core categories.
- **Current state**: Mock data in `frontend/lib/handbook.ts` uses old three domains.
- **Target outcome**: Seed/mock entries use five IDs; list filter can show each category non-empty in demo.

## Constraints

- **MUST**: Use only five selectable IDs + exact Vietnamese labels from catalog.
- **MUST NOT**: Implement purchase/sale/adjustment per product domain.
- **SCOPE**: Seed/mock Handbook entries + filter tests.

## Steps

- [x] 1. Replace mock entries category field with canonical IDs; ensure at least one entry per five categories.
  - _Requirements: 1.1, 2.1_
- [x] 2. Component/unit test: filter each category returns expected subset; `Tất cả` returns all.
  - _Requirements: 2.1, 2.4, 4.3_

## Requirements

- 1.1, 2.1, 2.4, 4.3

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/handbook.ts` | Modify | Mock seed entries. |
| `frontend/components/app/handbook/handbook-list.tsx` | Read | Filter consumer. |

## Completion Criteria

- [x] Five categories each have at least one mock entry after seed.
- [x] Filter tests pass for each category id.

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
| Seed overwrites tenant data | Medium | Seed only demo tenant / mock FE |
