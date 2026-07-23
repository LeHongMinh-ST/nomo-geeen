# Task R1-03: Focused tests and verification receipt

**Requirement:** R4
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5 day
**Dependencies:** `tasks/task-R0-01-reason-vocabulary-and-schema.md`, `tasks/task-R1-01-adjustment-complete-service.md`, `tasks/task-R1-02-tenant-adjustment-api.md`
**Spec:** specs/stock-adjustment-core-reasons/

## Context

- **Why**: Prove core-value invariants before claiming done.
- **Target outcome**: All focused tests + build + prisma validate; receipt under reports/.

## Constraints

- **MUST NOT**: Claim FE cycle count or returns.
- **SCOPE**: Tests, receipt, task state sync.

## Steps

- [x] 1. Run policy + service + build + prisma validate; fill evidence.
  - _Requirements: 4.1, 4.2_
- [x] 2. Write `specs/stock-adjustment-core-reasons/reports/verification-receipt.md`.
  - _Requirements: 4.2_
- [x] 3. Confirm no unrelated tests weakened.
  - _Requirements: 4.1_

## Requirements

- 4.1, 4.2

## Related Files

| Path | Action | Description |
|---|---|---|
| `specs/stock-adjustment-core-reasons/reports/verification-receipt.md` | Create | Receipt. |
| `backend/src/platform/stock-adjustments/stock-adjustments.service.spec.ts` | Create | Filled in R1-01; re-run as proof. |
| `backend/src/platform/stock-adjustments/adjustment-reason-policy.spec.ts` | Create | Filled in R0-01; re-run as proof. |
| `backend/src/app.module.ts` | Read | Module registration check. |

## Completion Criteria

- [x] Commands exit 0 or blocker recorded.
- [x] Receipt lists commands and out_of_scope.

## Evidence

### Automated verification

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/stock-adjustments
pnpm --dir backend build
pnpm --dir backend exec prisma validate
```

**Result (2026-07-23):**
- stock-adjustments tests: PASS 21/21
- build: EXIT 0
- prisma validate: PASS
- Receipt: `specs/stock-adjustment-core-reasons/reports/verification-receipt.md`

### Artifact verification

- Receipt path exists.

### Runtime reachability verification

- Documented entrypoints: controller complete → service dual-write.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| DB unavailable | Medium | Record blocker; unit mocks still pass |
