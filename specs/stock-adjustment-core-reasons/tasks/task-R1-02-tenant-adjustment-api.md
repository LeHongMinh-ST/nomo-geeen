# Task R1-02: Tenant stock-adjustment HTTP API

**Requirement:** R1, R5
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5-1 day
**Dependencies:** `tasks/task-R1-01-adjustment-complete-service.md`
**Spec:** specs/stock-adjustment-core-reasons/

## Context

- **Why**: Expose service via tenant Nest routes with existing guards.
- **Target outcome**: list/detail/create/complete under `/tenant/stock-adjustments` using auth tenant only.

## Constraints

- **MUST**: TenantAccessTokenGuard + TenantPermissionGuard; inventory:view / inventory:edit.
- **MUST NOT**: Client tenantId override.
- **SCOPE**: Controller, module, DTOs, app.module registration.

## Steps

- [x] 1. DTOs for create lines (productId, delta, reasonCode, batchId?) and complete body if needed.
  - _Requirements: 1.1, 2.1_
- [x] 2. Controller endpoints + StockAdjustmentsModule registered in `backend/src/app.module.ts`.
  - _Requirements: 5.2_
- [x] 3. Smoke tests for permission metadata or service integration via controller unit if pattern exists.
  - _Requirements: 4.1_

## Requirements

- 1.1, 5.2, 4.1

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/stock-adjustments/stock-adjustments.controller.ts` | Create | HTTP. |
| `backend/src/platform/stock-adjustments/stock-adjustments.module.ts` | Create | Module. |
| `backend/src/platform/stock-adjustments/dto/` | Create | DTOs. |
| `backend/src/app.module.ts` | Modify | Register module. |
| `backend/src/platform/products/products.controller.ts` | Read | Guard pattern. |

## Completion Criteria

- [x] Module registered; routes tenant-scoped.
- [x] Create/complete call service.

## Evidence

### Automated verification

```bash
pnpm --dir backend build
pnpm --dir backend test --runInBand --runTestsByPath src/platform/stock-adjustments
```


**Result (2026-07-23):**
- `pnpm --dir backend test --runInBand --runTestsByPath src/platform/stock-adjustments` → PASS 21/21
- `pnpm --dir backend build` → EXIT 0
- app.module imports StockAdjustmentsModule
- Controller guards: TenantAccessTokenGuard + TenantPermissionGuard + EntitlementsGuard
- Permissions: inventory:view (list/detail), inventory:edit (create/complete)
- Reachability: AppModule → StockAdjustmentsModule → controller → service

### Artifact verification

- app.module imports StockAdjustmentsModule.

### Runtime reachability verification

- main → AppModule → StockAdjustmentsModule → controller.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Missing permission codes | Medium | Reuse inventory:view/edit |
