# Tenant Supplier Management — Requirements

## Introduction

Turn the `/nha-cung-cap` supplier surface into a real tenant-scoped directory backed by the existing `/tenant/suppliers` API. A store user can list and search suppliers, view a supplier's contact details, type, tax code, and read-only payable balance, create and update suppliers, and soft-delete without breaking historical purchase or debt references. The backend already exists; this feature hardens its contract/tests to the customer-module bar and replaces the seed-backed frontend with authenticated API flows.

Scope is CRUD + read-only payable balance only. Debt vouchers, purchase-history rendering, cooperation-policy (credit control) editing, and import/export are out of scope.

## Requirements

### R1 — Tenant-scoped supplier list & search

**User story:** As a store user, I want to list and search my tenant's suppliers with pagination, so I can find a supplier quickly without loading all records.

- **R1.1** When an authenticated user with `supplier:view` requests the supplier list, the system SHALL return only suppliers where `tenantId` matches the token and `deletedAt IS NULL` and `status = 'ACTIVE'`.
- **R1.2** When a `search` term is provided, the system SHALL match it case-insensitively against `code`, `name`, and `phone` via `contains`.
- **R1.3** The system SHALL order results by `name` ascending then `id` ascending, and SHALL return `{ items, page, pageSize, total }`.
- **R1.4** The system SHALL bound pagination to `page >= 1` and `1 <= pageSize <= 20`, defaulting `page=1`, `pageSize=20`.

### R2 — Supplier detail read

**User story:** As a store user, I want to open one supplier and see its contact fields, type, tax code, and payable balance, so I can review it before purchasing.

- **R2.1** When an authenticated user with `supplier:view` requests a supplier by id within their tenant, the system SHALL return the supplier with `id`, `code`, `name`, `supplierType`, `contactName`, `phone`, `email`, `address`, `taxCode`, `balance`, `status`, `createdAt`, `updatedAt`.
- **R2.2** When the id does not exist, is soft-deleted, or belongs to another tenant, the system SHALL respond `404` without revealing existence.

### R3 — Create & update with validation

**User story:** As a store user, I want to add and edit suppliers with required identity fields, so records stay consistent.

- **R3.1** When creating a supplier, the system SHALL require non-empty `code` and non-empty `name`; if either is missing after trim, the system SHALL respond `422` with reason `VALIDATION_ERROR`.
- **R3.2** When creating or updating with a `code` already used by a non-deleted supplier in the same tenant, the system SHALL respond `409` with reason `DUPLICATE_SUPPLIER_CODE`.
- **R3.3** When updating, the system SHALL apply only submitted fields, and if `code` or `name` is present-but-empty after trim, SHALL respond `422 VALIDATION_ERROR`.
- **R3.4** The system SHALL treat `supplierType`, `contactName`, `phone`, `email`, `address`, `taxCode` as optional; empty strings SHALL be stored as `null`; `email` when present SHALL be a valid email.

### R4 — Read-only payable balance

**User story:** As a store user, I want to see how much my store owes a supplier, without editing it here.

- **R4.1** The system SHALL serialize the BigInt `balance` (Outstanding Payable, VND) to a safe JSON number in the response.
- **R4.2** The system SHALL never write `balance` from this module; any client-supplied `balance`, `tenantId`, or `deletedAt` SHALL be ignored/rejected.
- **R4.3** The frontend SHALL present the server-derived payable read-only, deriving has-payable state from `balance > 0`, and SHALL NOT compute or persist balance locally.

### R5 — Soft delete preserving history

**User story:** As a store user, I want deleting a supplier to hide it but keep past purchases intact.

- **R5.1** When an authenticated user with `supplier:delete` deletes a supplier in their tenant, the system SHALL set `deletedAt = now` and `status = 'INACTIVE'` and return `{ id, deleted: true }`.
- **R5.2** The system SHALL exclude soft-deleted suppliers from all reads (list and detail) while preserving referenced purchase/debt rows.
- **R5.3** When deleting a missing/cross-tenant/already-deleted supplier, the system SHALL respond `404`.

### R6 — Authorization & tenant isolation

**User story:** As a tenant owner, I want supplier access gated by permission and scoped to my tenant.

- **R6.1** The system SHALL derive `tenantId` only from the verified tenant access token, never from the request body.
- **R6.2** The system SHALL require `supplier:view` for reads and `supplier:create`/`supplier:edit`/`supplier:delete` for the matching writes, responding `403` when the permission is absent.
- **R6.3** The system SHALL enforce the `inventory` feature entitlement on create, update, and delete (reads remain ungated), responding `403` when the feature is not entitled.

### R7 — Frontend real-data wiring

**User story:** As a store user, I want `/nha-cung-cap` to persist real suppliers instead of showing mock data.

- **R7.1** The `/nha-cung-cap` list, detail, create, and edit screens SHALL read and write exclusively through a typed `tenant-suppliers-api.ts` client using `userFetch` against `/tenant/suppliers`, preserving routes `/nha-cung-cap`, `/nha-cung-cap/them`, `/nha-cung-cap/[id]`, `/nha-cung-cap/[id]/sua`.
- **R7.2** The supplier screens (`supplier-list`, `supplier-detail`, `supplier-form`, `supplier-card`) and the `[id]` pages SHALL NOT import seed data from `@/lib/suppliers` or payable from `@/lib/debts`; the payable column SHALL come from the API `balance`.
- **R7.3** Create/edit/soft-delete SHALL persist through the client and refresh the list/detail, showing loading/empty/error states and preserving the form on validation error.
- **R7.4** The frontend SHALL map `supplierType` between its display labels and the free-form API string at the boundary without requiring a DB enum.

### R8 — Verification

**User story:** As a maintainer, I want automated proof that isolation, validation, and permissions hold.

- **R8.1** Backend unit tests SHALL cover code+name required validation, duplicate-code conflict, `toResponse` balance serialization, pagination bounds/ordering, and soft-delete + status transition.
- **R8.2** Backend E2E (`backend/test/tenant-suppliers.e2e-spec.ts`) SHALL cover create → search → detail → update → soft-delete, tenant isolation (cross-tenant id → 404), permission denial (missing `supplier:*` → 403), feature-gate on writes, and deleted-supplier exclusion from reads.
- **R8.3** Frontend tests SHALL assert typed request URLs/methods/bodies and list/error mapping for the supplier client, and the screen migration SHALL be verified via typecheck/build with no remaining seed import.

## Non-Functional Requirements

- **Performance:** Server pagination with `pageSize <= 20`; no full-history load in the browser; search aligns with existing tenant-scoped indexes.
- **Security:** Tenant identity token-derived; every query tenant-scoped; client-supplied balance/tenantId/deletedAt ignored; no secrets logged.
- **Reliability:** Soft delete preserves historical purchase/debt references; deleted rows excluded from reads.
- **Maintainability:** Reuse the existing customers/suppliers module pattern; no new permission or feature namespace.
- **Accessibility:** Preserve existing responsive/mobile-first layout and sticky-save UX of the current screens.

## Unresolved Questions

- If the local test DB migration state (Prisma P3009, mirrored from the customer spec) cannot be repaired, R8.2 E2E proof is recorded as an environment blocker per state-sync rules.
- `supplierType` has no DB enum; the API guarantees only a nullable string. Introducing a typed enum later requires a migration and a new requirement.
