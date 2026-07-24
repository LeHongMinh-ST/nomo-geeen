# Task R1-02: Cas recovery verification

**Requirement:** all
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.25 day
**Dependencies:** tasks/task-R0-01-recovery-policy.md, tasks/task-R1-01-batch-cas-adjustment-returns.md
**Spec:** specs/livestock-cas-recovery/

## Context

- **Why**: CafeKit gate — no done without fresh evidence.
- **Target outcome**: Focused tests + build + prisma validate + ownership diff pass.

## Constraints

- **MUST**: Fresh commands this run
- **MUST NOT**: Commit; FE/reports edits

## Steps

- [x] 1. Run focused unit tests for livestock + adjustment + returns.
  - _Requirements: all_
- [x] 2. `pnpm --dir backend build` and `pnpm --dir backend exec prisma validate`.
  - _Requirements: all_
- [x] 3. Diff ownership check; write receipt in Evidence.
  - _Requirements: all_

## Requirements

- All R1–R8 acceptance via automated proof

## Related Files

| Path | Action | Description |
|---|---|---|
| `specs/livestock-cas-recovery/tasks/*.md` | Modify | Evidence |
| `specs/livestock-cas-recovery/spec.json` | Modify | task_registry |

## Completion Criteria

- [x] Focused tests PASS
- [x] Build PASS
- [x] Prisma validate PASS
- [x] No out-of-scope file ownership

## Evidence

- [x] Automated verification
  - Command(s): listed above
  - Expected proof: exit 0
- [x] Artifact / runtime verification
  - Inspect: git diff --stat
- [x] Runtime reachability verification
  - Entrypoint: inventory health-state + adjustment complete + return services
- [x] Contract / negative-path verification
  - Covered by unit suites

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Stale evidence | High | Run commands before mark done |


### Automated verification (2026-07-24)

```bash
pnpm --dir backend test --runInBand --runTestsByPath \
  src/platform/inventory/livestock-state-policy.spec.ts \
  src/platform/inventory/livestock-state.service.spec.ts \
  src/platform/inventory/livestock-state.controller.spec.ts \
  src/platform/stock-adjustments/stock-adjustments.service.spec.ts \
  src/platform/sales/sales-return.service.spec.ts \
  src/platform/purchases/purchase-return.service.spec.ts \
  src/platform/inventory/fefo-allocator.spec.ts
pnpm --dir backend build
pnpm --dir backend exec prisma validate
```

**Result:** PASS — Test Suites 7/7, Tests 54/54 · nest build PASS · prisma validate PASS

### Artifact verification

- PASS — recovery `approveRecovery` + RECOVERY_NOT_APPROVED / terminal DEAD-REJECTED
- PASS — stock-adjustment / sales-return / purchase-return CAS `version` + increment
- PASS — no migration (version column already present)
- PASS — ownership: backend livestock + adjustment/returns + specs/livestock-cas-recovery (+ catalog note)

### Runtime reachability verification

- Entrypoint: `PATCH /tenant/inventory/batches/:batchId/health-state` (`inventory:edit`)
- Adjustment complete + full return services mutate batch with version CAS

### Contract / negative-path verification

- PASS — unit coverage stale version, recovery without flag, DEAD recovery denied, return CAS where clause

