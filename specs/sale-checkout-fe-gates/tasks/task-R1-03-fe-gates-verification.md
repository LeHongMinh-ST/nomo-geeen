# Task R1-03: Fe gates verification

**Requirement:** R4
**Status:** pending
**Priority:** P1
**Estimated Effort:** 0.25 day
**Dependencies:** `tasks/task-R0-01-sale-error-reason-map.md`, `tasks/task-R1-01-quick-sale-order-reason-ui.md`, `tasks/task-R1-02-phi-rei-advisory-display.md`
**Spec:** specs/sale-checkout-fe-gates/

## Context

- **Why**: Prove FE gates before develop closeout.
- **Current state**: Prior tasks implement map + wire + optional strip.
- **Target outcome**: Receipt + green targeted FE tests.

## Constraints

- **MUST NOT**: Claim harvest PHI hard gate or livestock SM.
- **SCOPE**: Commands, receipt, state sync.

## Steps

- [ ] 1. Run map + sales component tests + frontend build if cheap.
  - _Requirements: 4.1, 4.2, 4.3_
- [ ] 2. Write `specs/sale-checkout-fe-gates/reports/verification-receipt.md`.
  - _Requirements: 4.3_
- [ ] 3. Confirm no unrelated tests deleted.
  - _Requirements: 4.2_

## Requirements

- 4.1, 4.2, 4.3

## Related Files

| Path | Action | Description |
|---|---|---|
| `specs/sale-checkout-fe-gates/reports/verification-receipt.md` | Create | Receipt. |
| `frontend/lib/sales-api-error.ts` | Read | Proof. |
| `frontend/components/app/sales/quick-sale.tsx` | Read | Wire proof. |

## Completion Criteria

- [ ] Evidence commands exit 0 or blocker recorded.
- [ ] Receipt lists commands and out_of_scope.
- [ ] Reachability: POS components import mapSalesApiError.

## Evidence

### Automated verification

```bash
pnpm --dir frontend test sales-api-error
pnpm --dir frontend test order-form
pnpm --dir frontend build
```

### Artifact verification

- Receipt path exists.

### Runtime reachability verification

- Documented: quick-sale / order-form / order-detail → mapSalesApiError.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| FE test command path differs | Medium | Adjust to package.json scripts in receipt |
