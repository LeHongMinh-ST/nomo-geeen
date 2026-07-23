# Task R0-02: Legacy domain mapping foundation

**Requirement:** R3, R7
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5 day
**Dependencies:** `tasks/task-R0-01-handbook-category-contract.md`
**Spec:** specs/handbook-core-catalog/

## Context

- **Why**: Existing `Disease.domain` uses `AgriDomain` (`CROP|LIVESTOCK|AQUACULTURE|GENERAL`). Rollout must be lossless.
- **Current state**: Prisma `AgriDomain` on `Disease`; no Handbook category field yet (R1-01).
- **Target outcome**: Explicit mapping table and rules: mappable legacy → five IDs; unmappable → `UNCATEGORIZED` + report; no silent misclassification.

## Constraints

- **MUST**: Document mapping in design/contract tests; unmappable → `UNCATEGORIZED` / `Chưa phân loại`.
- **MUST NOT**: Delete pins, ingredients, or non-category fields; invent product-domain FEFO here (owned by `core-stock-lifecycle`).
- **SCOPE**: Mapping rules + unit tests only; migration apply lives in R1-01.

## Steps

- [x] 1. Encode mapping table from `AgriDomain` to HandbookCategory IDs (and UNCATEGORIZED) in the shared catalog module from R0-01.
  - Business intent: migration is deterministic and reviewable.
  - Code detail: pure functions `mapLegacyDomain(domain) → HandbookCategoryId`; tests for each legacy value.
  - _Requirements: 1.3, 3.3, 7.1_
- [x] 2. Define migration report shape (count mapped / uncategorized) for R1-01 to emit.
  - _Requirements: 7.1, 7.2_

## Requirements

- 1.3 — Unknown/deprecated identifiers surface as `Chưa phân loại`.
- 3.3 — Explicit migration rules; no data loss.
- 7.1 — Unmappable preserved with observable report.
- 7.2 — Rollout reversible without deleting entries.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/handbook.ts` | Modify | Host mapping helpers with catalog from R0-01. |
| `backend/prisma/schema.prisma` | Read | Confirm `AgriDomain` values. |
| `specs/handbook-core-catalog/design.md` | Read | Contract `HandbookCategory`. |

## Completion Criteria

- [x] Mapping pure functions cover all `AgriDomain` values.
- [x] Unmappable path documented and tested.
- [x] No product stock/purchase code in this task.

## Evidence
## Evidence

### Automated verification

```bash
pnpm --dir frontend test -- lib/handbook.test.ts
```

```text
# RESULT
# exit: 0 — mapLegacyAgriDomain coverage in handbook.test.ts
```

### Artifact verification

```text
# PASS — mapLegacyAgriDomain / mapLegacyHandbookField in frontend/lib/handbook.ts
```

### Runtime reachability verification

```text
# PASS — pure mappers for R1-01 migration consumption
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Wrong seed mapping | High | Prefer UNCATEGORIZED over silent group assign |
