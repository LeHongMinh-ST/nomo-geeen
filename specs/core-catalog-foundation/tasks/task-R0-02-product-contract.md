# Task R0-02: Validate and expose category-specific product contracts

**Requirement:** R3
**Status:** pending
**Priority:** P1
**Estimated Effort:** 1-2 days
**Dependencies:** `tasks/task-R0-01-business-taxonomy.md`
**Spec:** specs/core-catalog-foundation/

## Context

Product already has `attrs` in Prisma but create/update/list/detail paths omit it. This task makes the five business groups real product contracts while retaining common pricing, unit, and reference fields.

## Constraints

- **MUST** validate group/kind compatibility and attrs on the server.
- **MUST** return stable group and kind fields in every product response.
- **MUST NOT** infer business identity from display category names.
- **SCOPE** DTOs, service validation, serializers, and focused tests; no stock or purchase behavior.

## Steps

- [x] Extend create/update DTOs with optional legacy-safe `businessGroup`, `productKind`, and `attrs` fields.
- [x] Implement strict compatibility and per-group attribute validation for crop inputs, seedlings, feed, veterinary drugs, and livestock.
- [x] Include fields in list/detail responses and preserve deterministic fallback for existing records.

## Requirements

- R3.1, R3.2, R3.3, R3.4

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/products/dto/create-product.dto.ts` | Modify | Validate new product contract input. |
| `backend/src/platform/products/dto/update-product.dto.ts` | Modify | Validate partial updates. |
| `backend/src/platform/products/products.service.ts` | Modify | Persist and serialize taxonomy/attrs. |
| `backend/src/platform/products/product-contract.ts` | Create | Shared mapping and attrs validator. |
| `backend/src/platform/products/*.spec.ts` | Modify/Create | Positive and negative contract tests. |

## Completion Criteria

- [x] Valid products for all five groups persist and round-trip their group, kind, and attrs.
- [x] Invalid pairings and malformed attrs return field-level 400 errors.
- [x] Existing products remain readable without silent reassignment.
- [x] Common product behavior remains unchanged.

## Evidence

- [ ] Automated verification (unit/integration): `pnpm --dir backend test -- --runInBand products`; all contract cases pass.
- [ ] Artifact verification: inspect DTO, validator, service selects, and response mapper.
- [ ] Runtime reachability verification: `ProductsController` create/update/list/detail reaches the same validator and serializer.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Overly strict attrs blocks valid catalog data | Medium | validate only stable required fields; preserve optional attrs |
| Response drift between list and detail | Medium | shared serializer and matching tests |
