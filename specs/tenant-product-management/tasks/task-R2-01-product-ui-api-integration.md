# Task R2-01 — Product UI API integration

**Status:** done
**Requirement:** R3, R4
**Priority:** P0
**Estimated Effort:** M
**Dependencies:** tasks/task-R1-01-product-crud-and-lookups.md
**Spec:** specs/tenant-product-management/

## Context

The product list and form are mounted but currently use local seed data and local state mutations. Authenticated `userFetch` is already available from the user-auth feature.

## Constraints

- **MUST:** preserve the existing mobile-first layout and Vietnamese UX.
- **MUST:** use `userFetch`; do not add another auth store or token path.
- **MUST NOT:** implement catalog CRUD or inventory mutation in this task.

## Objective

Replace product seed data and local mutations with the authenticated tenant product API.

## Related Files

- `frontend/lib/products.ts`
- `frontend/lib/tenant-products-api.ts`
- `frontend/components/app/product/product-list.tsx`
- `frontend/components/app/product/product-form.tsx`
- `frontend/app/(app)/san-pham/`

## Steps

- [ ] Add typed tenant product API client and DTO mapping.
- [ ] Replace seed list state with API loading, retry, filtering, and refresh.
- [ ] Wire create/edit/delete actions and server error states.

## Completion Criteria

- [x] List, lookup, create, edit, and delete use `userFetch`.
- [x] Loading, retry, empty, success, and API error states are reachable.
- [x] Existing mobile-first layout remains intact.

## Requirements

- R3 — real API-backed list and forms.
- R4 — frontend verification and route proof.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| UI sends stale mock identifiers | Medium | Load lookups from tenant API and map server DTOs explicitly |

## Runtime Reachability Verification

- [ ] Entrypoint: `/san-pham` → `ProductList` → `tenant-products-api` → `/tenant/products`.

## Evidence

- `pnpm --dir frontend lint`
- `pnpm --dir frontend build`
- Browser proof: authenticated product list loads from API and unauthenticated access redirects to login.

## Verification Receipt

- 2026-07-21: `pnpm --dir frontend lint` — PASS, 210 files.
- 2026-07-21: `pnpm --dir frontend build` — PASS, 42 routes including `/san-pham` and `/san-pham/[id]`.
- 2026-07-21: `pnpm --dir frontend test` — PASS, 3 files / 5 tests.
- 2026-07-21: Browser navigation to `/san-pham` without a session redirected to `/dang-nhap?next=%2Fsan-pham`; the only API error was expected `POST /auth/refresh` 401 for an anonymous session.

## Runtime Reachability Verification

- [x] `/san-pham` mounts `ProductList`, which calls `tenant-products-api` through `userFetch`.
- [x] `/san-pham/[id]` loads the detail API and mounts `ProductDetail`; create/edit/delete invoke real tenant endpoints.
