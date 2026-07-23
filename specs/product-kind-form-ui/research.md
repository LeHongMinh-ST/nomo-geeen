# Research: Product form by ProductKind

## Evidence Summary

The backend contract already exists. The gap is the frontend form/API mapper, not schema design.

## Repository evidence

- `backend/src/platform/products/product-contract.ts` defines BusinessGroup mapping and required attrs.
- `backend/src/platform/products/products.controller.ts` exposes `GET /tenant/products/business-groups`.
- `backend/src/platform/products/dto/create-product.dto.ts` and `update-product.dto.ts` already accept `businessGroup`, `productKind`, and `attrs`.
- `frontend/components/app/product/product-form.tsx` currently has no group/kind/attrs state and submits only common fields.
- `frontend/lib/tenant-products-api.ts` currently omits group/kind/attrs from `TenantProduct` and `ProductInput`.
- `frontend/lib/products.ts` has legacy `agro` fields that can be mapped into the new attrs contract during migration.
- `DESIGN.md` requires mobile-first forms, 48px controls, accessible labels, and sticky full-width mobile save.

## Decisions

- Keep the existing ProductForm and API client boundaries.
- Mirror the backend required-attrs map in one frontend catalog module; do not duplicate literals across components.
- Use group-enabled data from the existing endpoint; no new backend endpoint.
- Treat advisory PHI/REI/withdrawal fields as non-blocking metadata.
- Preserve legacy values on edit; fallback display only when no canonical kind is available.

## Validation blockers observed before implementation

- Full backend suite currently has one unrelated baseline failure because `backend/prisma/migrations/20260719000200_admin_billing_foundation/migration.sql` is missing; 368 tests passed.
- Combined build can hit a sandbox Turbopack process/port restriction; frontend build previously passed when run independently.

## Unresolved questions

- None blocking this bounded FE tranche.
