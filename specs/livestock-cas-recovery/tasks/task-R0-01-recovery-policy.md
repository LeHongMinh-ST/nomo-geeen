# Task R0-01: Recovery policy and service

**Requirement:** R1–R4, R7–R8
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5 day
**Dependencies:** none
**Spec:** specs/livestock-cas-recovery/

## Context

- **Why**: First slice blocks all recovery; catalog §9 needs controlled recovery for quarantine/sick only.
- **Current state**: `livestock-state-policy.ts` rejects non-HEALTHY source; DTO only allows outbound targets.
- **Target outcome**: QUARANTINED/SICK→HEALTHY only with `approveRecovery=true`; DEAD/REJECTED terminal; audit + CAS unchanged for HEALTHY outbound.

## Constraints

- **MUST**: Tenant from auth; `inventory:edit`; audit `LIVESTOCK_STATE_CHANGE` in same serializable tx; CAS `expectedVersion`.
- **SHOULD**: Structured reason `RECOVERY_NOT_APPROVED` when flag missing for recovery edge.
- **MUST NOT**: Auto-recovery; recover DEAD/REJECTED; new permission code; multi-step dual-control.
- **SCOPE**: policy + DTO + LivestockStateService + unit tests only.

## Steps

- [x] 1. Extend `backend/src/platform/inventory/livestock-state-policy.ts` for recovery matrix + approveRecovery.
  - Business: explicit recovery approval
  - Code: `assertLivestockTransition(from, to, { approveRecovery?: boolean })`
  - _Requirements: R1, R2, R3, R4_

- [x] 2. Update `change-livestock-state.dto.ts` to allow HEALTHY target + optional `approveRecovery`.
  - _Requirements: R1, R2_

- [x] 3. Wire flag through controller/service; keep CAS + audit.
  - _Requirements: R1, R8_

- [x] 4. Unit tests policy + service recovery allow/deny/stale.
  - _Requirements: R1, R2, R3_

## Requirements

- R1 — recovery with flag
- R2 — deny without flag
- R3 — DEAD/REJECTED terminal
- R4 — HEALTHY outbound unchanged
- R7 — FEFO HEALTHY-only (no change required if untouched)
- R8 — tenant scope

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/inventory/livestock-state-policy.ts` | Modify | Transition + recovery |
| `backend/src/platform/inventory/livestock-state-policy.spec.ts` | Modify | Recovery tests |
| `backend/src/platform/inventory/dto/change-livestock-state.dto.ts` | Modify | HEALTHY + approveRecovery |
| `backend/src/platform/inventory/livestock-state.service.ts` | Modify | Pass approveRecovery |
| `backend/src/platform/inventory/livestock-state.service.spec.ts` | Modify | Service recovery tests |
| `backend/src/platform/inventory/livestock-state.controller.ts` | Modify | Forward flag |

## Completion Criteria

- [x] Recovery QUARANTINED/SICK→HEALTHY with approveRecovery succeeds + audit
- [x] Without flag rejects without mutation
- [x] DEAD/REJECTED cannot recover
- [x] HEALTHY→blocked states still work
- [x] Stale version still 409

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir backend test --runInBand --runTestsByPath src/platform/inventory/livestock-state-policy.spec.ts src/platform/inventory/livestock-state.service.spec.ts src/platform/inventory/livestock-state.controller.spec.ts`
  - Expected proof: all PASS
- [x] Artifact / runtime verification
  - Inspect: policy + DTO + service paths
  - Expect: approveRecovery wired
- [x] Runtime reachability verification
  - Entrypoint: `PATCH tenant/inventory/batches/:batchId/health-state`
- [x] Contract / negative-path verification
  - Check: recovery without flag; DEAD→HEALTHY; stale version
  - Expect: 422/409 structured reasons

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Silent recovery | High | Require approveRecovery=true |
| Permission creep | Low | Reuse inventory:edit + audit actor |


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

