# Task R1-05: Livestock-seed category content smoke

**Requirement:** R2, R4
**Status:** done
**Priority:** P2
**Estimated Effort:** 0.5 day
**Dependencies:** `tasks/task-R1-03-animal-feed-domain.md`
**Spec:** specs/handbook-core-catalog/

## Context

- **Why**: Livestock-seed advice uses age/health language; Handbook stores advice, not herd state machine.
- **Target outcome**: Entries under `LIVESTOCK` with label `Con giống`; no livestock inventory state machine.

## Constraints

- **MUST NOT**: Implement AVAILABLE/QUARANTINED state machine.
- **SCOPE**: Handbook category content + filter only.

## Steps

- [x] 1. Sample entries id `LIVESTOCK` / label `Con giống`.
  - _Requirements: 1.1, 2.1_
- [x] 2. Filter empty-state still works when search narrows to zero.
  - _Requirements: 2.4_

## Requirements

- 1.1, 2.1, 2.4

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/handbook.ts` | Modify | Livestock samples. |
| `frontend/components/app/handbook/handbook-list.tsx` | Modify | Empty state if needed. |

## Completion Criteria

- [x] Livestock filter works.
- [x] No inventory state machine code introduced.

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
| Scope creep into livestock ERP | High | Explicit MUST NOT |
