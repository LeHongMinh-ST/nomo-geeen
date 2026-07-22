# Task R1-02: Verify batch lifecycle and tenant isolation

**Requirement:** R3
**Status:** pending
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

- [ ] Run focused purchase and sales tests plus build and Prisma validation.
- [ ] Record database availability limits and deferred lifecycle behavior.
- [ ] Confirm no unrelated tests were weakened.

## Requirements

- R3.1

## Related Files

| Path | Action | Description |
|---|---|---|
| `specs/core-stock-lifecycle/reports/verification-receipt.md` | Create | Evidence and blockers. |
| `backend/src/platform/purchases/purchases.service.spec.ts` | Read/Modify | Purchase proof. |
| `backend/src/platform/sales/sales.service.spec.ts` | Read/Modify | Sales proof. |

## Completion Criteria

- [ ] Focused tests and build pass or an explicit blocker is recorded.
- [ ] Receipt records exact commands and remaining scope.
- [ ] Tenant/warehouse boundaries have concrete assertions.

## Evidence

- [ ] Automated verification: focused purchase/sales tests, `pnpm --dir backend build`, and `pnpm --dir backend exec prisma validate`.
- [ ] Artifact verification: inspect receipt and changed transaction paths.
- [ ] Runtime reachability verification: both sale entrypoints and purchase completion are covered.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Existing integration fixtures lack batches | Medium | retain legacy compatibility only where policy allows and add explicit fixtures |
