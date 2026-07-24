# Task R1-01: CAS on adjustment and full returns

**Requirement:** R5–R6
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5 day
**Dependencies:** tasks/task-R0-01-recovery-policy.md
**Spec:** specs/livestock-cas-recovery/

## Context

- **Why**: Adjustment/return mutate `qtyOnHand` without `version` → race with health/FEFO.
- **Current state**: FEFO CAS version; stock-adjustments + sales/purchase returns ignore version.
- **Target outcome**: All ProductBatch qty mutations CAS on version and increment.

## Constraints

- **MUST**: Full return only; serializable path preserves conflict semantics.
- **SHOULD**: Read version inside tx then updateMany with that version.
- **MUST NOT**: Partial returns; FE; unnecessary migration (version exists).
- **SCOPE**: stock-adjustments.service + sales-return + purchase-return + unit tests.

## Steps

- [x] 1. Stock adjustment complete: batch decrease/increase with version CAS + increment.
  - _Requirements: R5_
- [x] 2. Sales full return: batch increment with version CAS.
  - _Requirements: R6_
- [x] 3. Purchase full return: batch decrease with version + qty CAS.
  - _Requirements: R6_
- [x] 4. Unit tests assert where/data includes version; count=0 conflict where applicable.
  - _Requirements: R5, R6_

## Requirements

- R5 — adjustment CAS
- R6 — full return CAS

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/stock-adjustments/stock-adjustments.service.ts` | Modify | Batch CAS |
| `backend/src/platform/stock-adjustments/stock-adjustments.service.spec.ts` | Modify | Expect version |
| `backend/src/platform/sales/sales-return.service.ts` | Modify | Batch CAS |
| `backend/src/platform/sales/sales-return.service.spec.ts` | Modify | Expect version |
| `backend/src/platform/purchases/purchase-return.service.ts` | Modify | Batch CAS |
| `backend/src/platform/purchases/purchase-return.service.spec.ts` | Modify | Expect version |

## Completion Criteria

- [x] Adjustment updateMany includes version + increment
- [x] Sales/purchase return CAS version
- [x] Tests cover shape / conflict

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir backend test --runInBand --runTestsByPath src/platform/stock-adjustments/stock-adjustments.service.spec.ts src/platform/sales/sales-return.service.spec.ts src/platform/purchases/purchase-return.service.spec.ts`
  - Expected proof: PASS
- [x] Artifact / runtime verification
  - Inspect: updateMany where/data
- [x] Runtime reachability verification
  - Entrypoint: complete adjustment / createFullReturn routes
- [x] Contract / negative-path verification
  - Check: concurrent version → count 0 / conflict

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Miss increase path | Medium | CAS both directions |
| Partial return drift | Low | Document dependency only |


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

