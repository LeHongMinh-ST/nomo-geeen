# Task R1-01 — Product CRUD and lookups

**Status:** done
**Requirement:** R1, R2, R4
**Priority:** P0
**Estimated Effort:** L
**Dependencies:** tasks/task-R0-01-product-api-contract.md
**Spec:** specs/tenant-product-management/

## Context

`ProductsService` currently supports tenant-scoped list/create only. Product UI needs detail, update, soft-delete, and lookup reads before it can leave seed data.

## Constraints

- **MUST:** keep every read and write tenant-scoped from verified JWT claims.
- **MUST:** preserve atomic `maxProducts` reservation on create.
- **MUST NOT:** hard-delete products or mutate stock.

## Objective

Implement tenant-scoped product detail, update, soft-delete, and lookup endpoints while preserving existing create/list entitlement behavior.

## Related Files

- `backend/src/platform/products/products.controller.ts`
- `backend/src/platform/products/products.service.ts`
- `backend/src/platform/products/dto/`
- `backend/test/tenant-products.e2e-spec.ts`

## Steps

- [ ] Add DTOs and controller routes for detail, lookups, update, and soft-delete.
- [ ] Extend service queries with tenant-owned relation validation and stock read aggregation.
- [ ] Add unit and E2E negative-path coverage.

## Completion Criteria

- [x] Implement the routes in `design.md`.
- [x] Validate tenant-owned references and SKU uniqueness.
- [x] Keep quota reservation atomic for create and unchanged for update/delete.
- [x] Add unit and E2E coverage for isolation and negative paths.

## Requirements

- R1 — list/detail/lookups and tenant isolation.
- R2 — create/update/delete invariants.
- R4 — backend verification.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Cross-tenant reference or SKU access | High | Scope all relation queries by tenantId and add negative E2E cases |
| Quota drift after update/delete | High | Reserve only on create and test counter behavior |

## Runtime Reachability Verification

- [ ] Entrypoint: tenant JWT → `/tenant/products` controller → guards → `ProductsService` → Prisma.

## Evidence

- `pnpm --dir backend test -- --runInBand src/platform/products`
- `pnpm --dir backend test:e2e -- --runInBand tenant-products`
- `pnpm --dir backend build`

## Verification Receipt

- 2026-07-21: `pnpm --dir backend exec jest --runInBand src/platform/products` — PASS, 1 suite / 3 tests.
- 2026-07-21: `pnpm --dir backend test:e2e --runInBand tenant-products` — PASS, 1 suite / 6 tests against Postgres/Redis.
- 2026-07-21: `pnpm --dir backend build` — PASS.

## Runtime Reachability Verification

- [x] Authenticated tenant JWT reaches `/tenant/products` CRUD/lookups through permission and entitlement guards into Prisma.
