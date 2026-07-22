# Task R0-01: Persist the five business groups and tenant profile

**Requirement:** R1, R2
**Status:** pending
**Priority:** P1
**Estimated Effort:** 1-2 days
**Dependencies:** none
**Spec:** specs/core-catalog-foundation/

## Context

The audit found no stable group field or tenant capability model. The existing `AgriDomain` is too broad for retail behavior. This task establishes additive, tenant-scoped taxonomy primitives for mixed and specialist stores.

## Constraints

- **MUST** preserve existing products and legacy `CROP_SEED` reads.
- **MUST** keep aquaculture out of the selectable Phase 1 catalog.
- **MUST NOT** use mutable `Category` names as business-group identity.
- **SCOPE** schema, migration, taxonomy helpers, tenant profile persistence, and focused tests only.

## Steps

- [x] Add `BusinessGroup`, `SEED`, and `SEEDLING` contracts and a tenant-enabled group persistence model using existing Prisma conventions.
- [x] Add deterministic product-kind-to-group mapping and mixed/specialist profile validation.
- [x] Add migration/backfill safety checks and tests for legacy rows, disabled groups, and tenant isolation.

## Requirements

- R1.1, R1.2, R1.3, R2.1, R2.2, R2.3

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Add taxonomy and tenant capability persistence. |
| `backend/prisma/migrations/` | Create | Additive migration/backfill. |
| `backend/src/platform/products/` | Modify/Create | Shared mapping and validation helper. |
| `backend/src/platform/products/*.spec.ts` | Modify/Create | Taxonomy and tenant isolation tests. |

## Completion Criteria

- [x] Five groups have stable IDs and exact labels; no aquaculture selector exists.
- [x] Tenant can represent one or many enabled groups without deleting products.
- [x] Disabled-group product creation is rejected and cross-tenant capability reads are denied.
- [x] Legacy product kinds remain readable with deterministic fallback.

## Evidence

- [ ] Automated verification (unit/integration): `pnpm --dir backend test -- --runInBand products`; focused taxonomy and tenant tests pass.
- [ ] Artifact verification: inspect Prisma schema and migration; no destructive operation is present.
- [ ] Runtime reachability verification: product controller/service use the shared taxonomy helper for tenant-scoped create/read paths.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Legacy rows map incorrectly | High | additive nullable/backfill with explicit fallback tests |
| Tenant capability bypass | High | derive tenant from auth context and query tenantId in every lookup |
