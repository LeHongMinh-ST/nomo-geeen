# Task R1-02: Verify batch lifecycle and tenant isolation

**Requirement:** R3
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5-1 day
**Dependencies:** `tasks/task-R0-01-batch-receiving.md`, `tasks/task-R1-01-fefo-sale-allocation.md`
**Spec:** specs/core-stock-lifecycle/

## Context

Batch logic is a cross-module invariant. This task records proof across purchase and sales boundaries before the next tranche adds returns and adjustments.

## Constraints

- **MUST** cover positive, negative, atomic rollback, and tenant-isolation paths.
- **MUST NOT** claim returns, adjustment, or frontend behavior is implemented.
- **SCOPE** tests, receipt, and state synchronization.

## Steps

- [x] Run focused purchase and sales tests plus build and Prisma validation.
- [x] Record database availability limits and deferred lifecycle behavior.
- [x] Confirm no unrelated tests were weakened.

## Requirements

- R3.1, R3.2

## Related Files

| Path | Action | Description |
|---|---|---|
| `specs/core-stock-lifecycle/reports/verification-receipt.md` | Create | Evidence and blockers. |
| `backend/src/platform/purchases/purchases.service.spec.ts` | Read/Modify | Purchase proof. |
| `backend/src/platform/sales/sales.service.spec.ts` | Read/Modify | Sales proof. |

## Completion Criteria

- [x] Focused tests and build pass or an explicit blocker is recorded.
- [x] Receipt records exact commands and remaining scope.
- [x] Tenant/warehouse boundaries have concrete assertions.

## Evidence

### Automated verification

```bash
pnpm --dir backend test --runInBand --runTestsByPath \
  src/platform/purchases/purchases.service.spec.ts \
  src/platform/sales/sales.service.spec.ts
pnpm --dir backend build
pnpm --dir backend exec prisma validate
```

Expected: all exit 0, or explicit blocker recorded (DB fixtures, env).

```text
# RESULT
# tests exit / summary: 0 — 4 suites 86 passed
# build exit: 0
# prisma validate exit: 0
# date: 2026-07-23
```

### Artifact verification

- Create `specs/core-stock-lifecycle/reports/verification-receipt.md` with commands, outcomes, remaining out_of_scope.
- Confirm no weakened/deleted unrelated assertions.

```text
# RESULT
# receipt path: specs/core-stock-lifecycle/reports/verification-receipt.md
# PASS
```

### Runtime reachability

- Covered: purchase complete, quick sale, order completion.
- Tenant isolation assertions present on batch queries/updates.

```text
# RESULT
# PASS — purchase complete, quick sale, order completion
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Existing integration fixtures lack batches | Medium | retain legacy compatibility only where policy allows and add explicit fixtures |
