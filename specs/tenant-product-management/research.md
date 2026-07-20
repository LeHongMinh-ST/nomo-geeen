# Research

## Evidence Summary

Repository evidence was gathered from the existing product controller/service, Prisma schema, mounted product routes, and base specification.

## Repository evidence

- `backend/src/platform/products/products.controller.ts` currently exposes only `GET` and `POST /tenant/products`.
- `backend/src/platform/products/products.service.ts` already derives tenant scope from the authenticated request and applies `inventory` plus `maxProducts` enforcement on create.
- `backend/prisma/schema.prisma` has tenant-scoped `Product`, `Category`, `Brand`, `Manufacturer`, and `Unit` models. `Product` supports soft delete and has relations to stock records.
- `frontend/components/app/product/product-list.tsx` and `frontend/lib/products.ts` still use local seed data and local mutations.
- `frontend/components/app/product/product-form.tsx` is a real mounted route but submits only local state.
- `docs/base_spec.md` defines core product fields and states that inventory remains a separate workflow.

## Decisions

- Keep inventory mutations out of this feature; product list may expose an aggregated stock value read from tenant-owned `Stock` rows when available.
- Preserve the existing tenant JWT, permission guard, entitlement guard, Prisma, and `userFetch` boundaries.
- Lookup data is read-only in this feature. Catalog CRUD remains a later task.

## Unresolved questions

- Exact product-kind-specific fields are deferred until the inventory and handbook slices are specified.
