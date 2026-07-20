# Requirements

## R1 — Tenant product API

- **R1.1** An authenticated tenant user with `product:view` shall list only non-deleted products from the token tenant.
- **R1.2** Product responses shall include id, SKU, name, barcode, category/brand/manufacturer references, base unit, prices, lock/recalled/status flags, timestamps, and read-only stock quantity when available.
- **R1.3** The API shall provide tenant-scoped read-only lookups for categories, brands, manufacturers, and units.
- **R1.4** No response shall expose data belonging to another tenant.

## R2 — Product writes

- **R2.1** Create and update shall require the appropriate live tenant permission and `inventory` feature.
- **R2.2** Create shall consume `maxProducts` quota only for a new product; update shall not consume quota.
- **R2.3** SKU shall be trimmed and unique within a tenant; invalid or cross-tenant references shall fail with a client error.
- **R2.4** Delete shall be a tenant-scoped soft delete and shall not remove historical relations.
- **R2.5** A locked or recalled product shall remain visible to authorized readers and shall not be hard-deleted by this feature.

## R3 — User app integration

- **R3.1** `/san-pham` shall load products and lookups through the authenticated user API client, with loading, empty, error, and retry states.
- **R3.2** Create/edit forms shall submit to the API and refresh the list after success.
- **R3.3** Delete shall require explicit confirmation and update the list only after the API succeeds.
- **R3.4** Existing mobile-first layout and Vietnamese labels shall remain intact.

## R4 — Verification

- **R4.1** Unit tests shall cover tenant isolation, SKU conflict, invalid references, update, and soft delete.
- **R4.2** E2E tests shall prove authenticated list/create/update/delete and forbidden write paths.
- **R4.3** Frontend lint/build and route reachability shall pass.

## Task coverage

- R1, R2 → R1-01
- R3 → R2-01
- R4 → R3-01
