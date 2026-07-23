# Task R0-01: Reason vocabulary and schema line reasonCode

**Requirement:** R2, R3
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5-1 day
**Dependencies:** none
**Spec:** specs/stock-adjustment-core-reasons/

## Context

- **Why**: Catalog requires per-kind adjustment reasons; Prisma line has no reasonCode.
- **Current state**: `StockAdjustment` / `StockAdjustmentLine` in `backend/prisma/schema.prisma`; no app policy module.
- **Target outcome**: Closed reason map by ProductKind + migration adding `reasonCode` on lines.

## Constraints

- **MUST**: Closed vocabulary for Phase 1 kinds from design/research tables.
- **MUST NOT**: Free-text-only reason; aquaculture-only codes as Phase 1 required set.
- **SCOPE**: Schema + pure policy module + unit tests only.

## Steps

- [x] 1. Add `reasonCode String` to `StockAdjustmentLine` in `backend/prisma/schema.prisma` and create migration under `backend/prisma/migrations/`.
  - _Requirements: 2.1_
- [x] 2. Implement `backend/src/platform/stock-adjustments/adjustment-reason-policy.ts` with `assertReasonAllowed(productKind, reasonCode)` and exported reason lists.
  - _Requirements: 2.1, 2.2, 2.3_
- [x] 3. Add `adjustment-reason-policy.spec.ts` covering allow/deny per kind.
  - _Requirements: 4.1_

## Requirements

- 2.1, 2.2, 2.3, 4.1

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Line reasonCode. |
| `backend/prisma/migrations/` | Create | Additive migration. |
| `backend/src/platform/stock-adjustments/adjustment-reason-policy.ts` | Create | Kind→reason map. |
| `backend/src/platform/stock-adjustments/adjustment-reason-policy.spec.ts` | Create | Policy tests. |
| `docs/core-business-catalog.md` | Read | Reason semantics. |

## Completion Criteria

- [x] reasonCode column exists on lines.
- [x] Policy rejects invalid kind/reason pairs.
- [x] Unit tests pass.

## Evidence

### Automated verification

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/stock-adjustments/adjustment-reason-policy.spec.ts
pnpm --dir backend exec prisma validate
```

**Result (2026-07-23):**
- Jest: PASS — 11/11 tests
- prisma validate: PASS — schema.prisma is valid

### Artifact verification

- PASS — `StockAdjustmentLine.reasonCode String` in schema
- PASS — migration `20260723140000_stock_adjustment_line_reason_code` ADD NOT NULL DEFAULT then DROP DEFAULT
- PASS — `assertReasonAllowed` returns trimmed code; `INVALID_REASON` + `field: reasonCode`

### Runtime reachability verification

- Policy imported by complete service (R1-01); orphan policy intentional until R1-01. PASS for R0-01 scope.

### Quality gate

- SPEC_PASS (critical 0)
- Code quality 9.6/10, critical 0 → PASS
- Medium fixed: assert returns trimmed reasonCode

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Incomplete reason set | Medium | Start with catalog table; expand via scope approval |
