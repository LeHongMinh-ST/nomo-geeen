# Task R0-01 — Product API contract

**Status:** done
**Requirement:** R1, R2, R3, R4
**Priority:** P0
**Estimated Effort:** S
**Dependencies:** none
**Spec:** specs/tenant-product-management/

## Context

The repository has a tenant product list/create slice and a mounted seed-data UI. This task freezes the smallest contract needed to replace local product mutations with real tenant API calls.

## Constraints

- **MUST:** preserve tenant JWT, live permission guards, entitlement guards, Prisma, and `userFetch`.
- **MUST NOT:** include stock mutations, purchase, sales, catalog CRUD, or dashboard aggregation.

## Objective

Freeze the tenant product CRUD and lookup contract before implementation.

## Steps

- [x] Inspect existing product API, Prisma models, and mounted UI.
- [x] Define route, permission, entitlement, quota, and soft-delete invariants.

## Completion Criteria

- [x] Routes, permissions, feature gates, soft-delete, and quota behavior are recorded in `design.md`.
- [x] Scope explicitly excludes stock mutations, purchase, sales, and catalog CRUD.

## Requirements

- R1 — tenant product API contract.
- R2 — product write invariants.
- R3 — user app integration boundary.
- R4 — verification expectations.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/products/*` | Read | Existing API and service boundary |
| `frontend/components/app/product/*` | Read | Mounted product UI |
| `docs/base_spec.md` | Read | Product scope and exclusions |

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Scope expands into inventory | Medium | Keep stock mutations in a later spec |

## Runtime Reachability Verification

- [x] Entrypoint: authenticated user app `/san-pham` and tenant `/tenant/products` contract identified.

## Evidence

- Existing `GET/POST /tenant/products` and Prisma product model inspected on 2026-07-21.
- Contract recorded in `design.md`; implementation may proceed to R1-01.
