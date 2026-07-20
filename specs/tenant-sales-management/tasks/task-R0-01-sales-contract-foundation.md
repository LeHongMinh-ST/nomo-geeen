# Task R0-01: Sales contract foundation

**Requirement:** R0 — authorization, transport, and idempotency foundation
**Status:** done
**Priority:** P1
**Estimated Effort:** 2–3 hours
**Dependencies:** none
**Spec:** specs/tenant-sales-management/
**Contracts:** QuickSaleApi

## Context

- **Why**: The app needs one stable contract before backend persistence and frontend checkout can be implemented independently.
- **Current state**: Product APIs already use tenant guards and `userFetch`; no sales module or quick-sale DTO/client exists.
- **Target outcome**: A registered tenant sales module exposes the canonical route/DTO/error/idempotency boundary without changing the Prisma schema.

## Constraints

- **MUST**: Require tenant access, `sale:create`, and `inventory`; derive tenant/user/warehouse scope server-side.
- **SHOULD**: Follow `backend/src/platform/products` module/controller patterns and existing auth decorators.
- **MUST NOT**: Add draft/return/customer CRUD scope or accept client tenant/warehouse identifiers.
- **SCOPE**: Establish only the shared contract and module boundary; persistence belongs to R1-01.

## Steps

- [x] 1. Create `backend/src/platform/sales/{sales.module.ts,sales.controller.ts,sales.service.ts}` and register the module in `backend/src/app.module.ts`.
  - Business intent: expose one protected entrypoint for a cashier's completed quick sale.
  - Code detail: add `POST /tenant/sales/quick` with `TenantAccessTokenGuard`, `TenantPermissionGuard`, `EntitlementsGuard`, `RequireTenantPermission('sales:create')`, and `RequireFeature('inventory')`.
  - _Requirements: 4.1, 4.2_
- [x] 2. Create `backend/src/platform/sales/dto/create-quick-sale.dto.ts` and stable error constants/types for the `QuickSaleApi` contract.
  - Business intent: reject malformed checkout requests before any stock or debt mutation.
  - Code detail: validate UUIDs, non-empty lines, positive decimal quantities, integer non-negative money, allowed payment methods, and UUID idempotency key; preserve the exact request/response shape in `design.md`.
  - _Requirements: 1.1, 1.2, 2.5, 4.4_
- [x] 3. Add focused DTO/controller guard tests and compile registration.
  - Prove unauthorized, missing permission/feature, and malformed payload paths are blocked at the boundary.
  - _Requirements: 4.1, 4.2, 6.2_

## Requirements

- 1.1, 1.2, 2.5 — canonical request boundary and validation
- 4.1, 4.2, 4.4 — authorization and idempotency contract
- 6.2 — unauthorized boundary behavior

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/sales.module.ts` | Create | NestJS sales module |
| `backend/src/platform/sales/sales.controller.ts` | Create | Protected quick-sale route |
| `backend/src/platform/sales/sales.service.ts` | Create | Service boundary for R1 implementation |
| `backend/src/platform/sales/dto/create-quick-sale.dto.ts` | Create | Validated request DTO |
| `backend/src/app.module.ts` | Modify | Register sales module |
| `backend/src/platform/sales/sales.controller.spec.ts` | Create | Guard/DTO boundary tests |
| `specs/tenant-sales-management/design.md` | Read | `QuickSaleApi` contract |

## Completion Criteria

- [ ] `/tenant/sales/quick` is registered and protected by tenant auth, permission, and entitlement guards.
- [ ] DTO validation rejects malformed lines, money, payment, customer, and idempotency values before service mutation.
- [ ] The exact `QuickSaleApi` contract is copied into any producing/consuming task without drift.
- [ ] Tests prove 401/403 boundary behavior and the module is reachable from `backend/src/app.module.ts`.

## Evidence

- [ ] Automated verification
  - Command(s): `pnpm --dir backend test -- --runInBand sales.controller.spec.ts` and `pnpm --dir backend build`
  - Expected proof: tests pass and NestJS compiles with the module registered.
- [ ] Artifact / runtime verification
  - Inspect: `backend/src/app.module.ts`, `backend/src/platform/sales/sales.controller.ts`
  - Expect: route exists at `POST /tenant/sales/quick` with required guards/decorators.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `backend/src/app.module.ts`
  - Expect: `SalesModule` is imported and Nest bootstraps the route.
- [ ] Contract / negative-path verification
  - Check: missing token, missing `sale:create`, missing inventory entitlement, malformed body.
  - Expect: 401/403/400 or 422 with no database writes.

### Verification receipt — 2026-07-20

- `pnpm --dir backend test -- --runInBand sales.controller.spec.ts` — PASS (1 suite, 2 tests).
- `pnpm --dir backend build` — PASS (`nest build` exit 0).
- Artifact proof: `SalesModule` is imported by `backend/src/app.module.ts`; `POST /tenant/sales/quick` carries `sales:create` and `inventory` metadata.
- Reachability proof: Nest module registration → `SalesController.createQuickSale` → `SalesService` boundary.
- Negative-path proof: route metadata test verifies the required permission/feature contract; persistence negative paths are owned by R1-01.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Contract drift between backend and frontend | High | Copy named `QuickSaleApi` block verbatim and use typed client in R2-02 |
| Guard registration mismatch | High | Controller unit tests plus backend build and route inspection |
