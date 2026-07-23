# Task R1-04: Veterinary category content smoke

**Requirement:** R2, R4
**Status:** done
**Priority:** P2
**Estimated Effort:** 0.5 day
**Dependencies:** `tasks/task-R1-03-animal-feed-domain.md`
**Spec:** specs/handbook-core-catalog/

## Context

- **Why**: Catalog veterinary advice uses species/symptoms context without replacing product attrs.
- **Target outcome**: Handbook entries under `VETERINARY_DRUGS` keep symptoms/notes; filter works; recommendation order unchanged.

## Constraints

- **MUST NOT**: Add withdrawal fields to Product in this task.
- **SCOPE**: Handbook entry content + filter for veterinary category only.

## Steps

- [x] 1. Ensure mock/API sample veterinary entries use id `VETERINARY_DRUGS` and label `Thuốc thú y`.
  - _Requirements: 1.1, 2.1_
- [x] 2. Assert `suggestProducts` remains category-agnostic (unit test).
  - _Requirements: 4.2_

## Requirements

- 1.1, 2.1, 4.2

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/handbook.ts` | Modify | Veterinary samples. |
| `frontend/lib/handbook.ts` | Read | `suggestProducts` invariant. |

## Completion Criteria

- [x] Veterinary filter shows only VETERINARY_DRUGS entries.
- [x] Recommendation ranking test unchanged vs baseline.

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
| Confuse Handbook with ProductKind VET_DRUG | Medium | Separate contracts; document in design |
