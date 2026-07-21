# Tenant Supplier Management Design

## Overview

This feature turns the user-app supplier surface into a real tenant-scoped directory backed by the existing `/tenant/suppliers` API. A store user can list and search suppliers, view a supplier's contact details, type, tax code, and read-only payable balance, create and update suppliers, and soft-delete without breaking historical purchase or debt references.

The backend module already exists and is largely complete; this design **hardens** its contract and tests to the customer-module bar and replaces the seed-backed `/nha-cung-cap` screens with authenticated API flows. It reuses the existing `Supplier` model, `supplier:*` permissions, and the `inventory` feature entitlement. No schema migration and no database transaction are required: payable balance stays read-only and is owned by purchase/debt flows.

### Goals

- Replace the seed-backed `/nha-cung-cap` list/detail/form/delete with authenticated tenant API flows.
- Harden tenant-isolated supplier CRUD (validation, duplicate-code conflict, soft delete, read-only balance) with full unit + E2E coverage.
- Preserve historical references (purchase, debt) through soft delete.

### Non-Goals

- Supplier purchase/order history rendering, debt vouchers (phieu chi), payables collection.
- Cooperation-policy editing (discount %, credit limit, payment term), import/export, dedup/merge.
- Any mutation of `Supplier.balance` or introduction of a `SupplierType` DB enum.

## Architecture

### Existing Architecture Analysis

- Backend controllers authenticate via tenant access token, enforce tenant permission + entitlement guards, and delegate to a Prisma-backed service. `SuppliersController`/`SuppliersService` already implement this exactly; `CustomersService` is the sibling precedent for the target quality bar.
- Key differences the Supplier service already honors and MUST keep: Supplier has a **`status` column** (active filter = `deletedAt: null` AND `status: 'ACTIVE'`), **`code` is required and unique per tenant** (P2002 → 409), and both **`code` and `name` are required** (customer requires only `name`). Balance is BigInt and read-only here.
- Frontend API client `tenant-suppliers-api.ts` already exists but only `purchase/supplier-picker.tsx` consumes it; the four `/nha-cung-cap` screens still use `frontend/lib/suppliers.ts` seed data and `frontend/lib/debts.ts` mock payable and must be migrated at their runtime entrypoints.

### Architecture Pattern & Boundary Map

Selected pattern: tenant-scoped vertical slice with a single `SuppliersService` (CRUD + lookup) behind a guarded `SuppliersController`. No transaction boundary is needed because no cross-entity write occurs. Payable balance is projected read-only from the persisted column.

```mermaid
flowchart LR
  SupplierUI[/nha-cung-cap] --> SupplierClient[tenant-suppliers-api]
  SupplierClient --> SupplierGuard[Tenant auth + permission + inventory feature]
  SupplierGuard --> SupplierController[SuppliersController]
  SupplierController --> SupplierService[SuppliersService]
  SupplierService --> DB[(PostgreSQL supplier table)]
  Purchase[Purchase/Debt flows] -. writes payable balance .-> DB
  SupplierService -. reads balance only .-> DB
```

### Technology Stack

| Layer | Choice / Version | Role | Notes |
|---|---|---|---|
| Frontend | Next.js/React/TypeScript | Supplier list/detail/form and delete | Reuse `userFetch`, existing components, `DESIGN.md`; read `node_modules/next/dist/docs/` first |
| Backend | NestJS, class-validator, Jest | Supplier CRUD/search API | Existing suppliers controller-service split |
| Data | Prisma/PostgreSQL | Existing `supplier` table | No migration; balance read-only |
| Runtime | Existing tenant auth + permission + entitlement guards | Authorization | `inventory` feature gate on writes |

## Canonical Contracts & Invariants

| Contract Area | Canonical Decision | Applies To | Must Stay Consistent In |
|---|---|---|---|
| Auth/session | `tenantId` and `userId` come only from the verified tenant access token; every query/write is tenant-scoped. | Controller/service | DTOs, guards, tests, UI client |
| Permissions | Reads require `supplier:view`; create/update/delete require `supplier:create`/`supplier:edit`/`supplier:delete`. | API entrypoints | Controller decorators, E2E fixtures, frontend errors |
| Feature gate | `@RequireFeature('inventory')` gates create/update/delete only; reads are ungated. | Write entrypoints | Controller decorators, E2E fixtures |
| Active-record filter | A supplier is active iff `deletedAt IS NULL` AND `status = 'ACTIVE'`. Both conditions are required in every read query. | List/detail/delete | Service queries, tests |
| Identity fields | `code` AND `name` are both required and non-empty. `code` is unique per tenant; a duplicate raises `409 DUPLICATE_SUPPLIER_CODE`. | Create/update | DTO, service, UI |
| Type | `supplierType` is an optional free-form string (no DB enum). Empty → `null`. FE maps display labels ↔ string at the boundary. | Create/update | DTO, response mapper, UI |
| Balance | `balance` (Outstanding Payable) is server-derived, read-only in this module. The service never writes it; client-supplied balance is ignored. | All routes | Service, response mapper, UI |
| Retention | Delete is soft (`deletedAt = now`, `status = 'INACTIVE'`). Historical purchase/debt references are preserved; deleted suppliers are excluded from reads. | Delete | Service, tests |
| Money serialization | BigInt `balance` is serialized to a safe JSON number in `toResponse`. | Response | Mapper, client types, tests |

<!-- contract:SupplierResponse -->
```json
{
  "id": "string",
  "code": "string",
  "name": "string",
  "supplierType": "string | null",
  "contactName": "string | null",
  "phone": "string | null",
  "email": "string | null",
  "address": "string | null",
  "taxCode": "string | null",
  "balance": "number",
  "status": "ACTIVE | INACTIVE",
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)"
}
```
<!-- /contract:SupplierResponse -->

## System Flows

```mermaid
sequenceDiagram
  participant UI as Supplier form/list
  participant API as Supplier API
  participant DB as Prisma (supplier)
  UI->>API: list/detail/create/update/delete request
  API->>API: verify tenant + permission (+ inventory on writes); validate DTO
  alt read
    API->>DB: query where tenantId + deletedAt null + status ACTIVE
    DB-->>API: suppliers (balance read-only)
  else create/update
    API->>DB: persist tenant-scoped fields (no balance write); unique code
    DB-->>API: supplier (or P2002 → 409)
  else delete
    API->>DB: set deletedAt=now, status=INACTIVE (soft)
    DB-->>API: {id, deleted:true}
  end
  API-->>UI: canonical SupplierResponse or stable error
  UI->>UI: refresh list/detail after success
```

## Requirements Traceability

| Requirement | Design elements | Tasks |
|---|---|---|
| R1.1–R1.4 | SuppliersService.list, tenant+status filter, search OR, pagination bounds, ordering | R1-01 |
| R2.1–R2.2 | findById, SupplierResponse mapping, 404 contract | R1-01, R2-01 |
| R3.1–R3.4 | Create/update DTOs, code+name required, duplicate-code 409, optional/null normalization, email validation | R1-01 |
| R4.1–R4.3 | Read-only balance serialization; UI read-only payable | R1-01, R2-01 |
| R5.1–R5.3 | Soft delete (deletedAt + status), retention, not-found contract | R1-01 |
| R6.1–R6.3 | Guards, tenant scope, permission decorators, inventory feature gate on writes | R1-01 |
| R7.1–R7.4 | Supplier API client + list/detail/form/delete wiring, seed removal, type mapping | R2-01 |
| R8.1–R8.3 | Backend unit/controller/E2E; frontend client tests + build/lint | R1-01, R2-01, R3-01 |

## Components and Interfaces

| Component | Layer | Intent | Requirements | Dependencies |
|---|---|---|---|---|
| SuppliersController/Service | Backend | Tenant-scoped supplier CRUD/search + read-only balance | R1–R6, R8 | Prisma, auth + permission + entitlement guards |
| Supplier DTOs | Shared boundary | Validate/serialize supplier request/response | R1, R3, R4 | class-validator |
| Supplier API client | Frontend boundary | Typed authenticated calls to `/tenant/suppliers` | R7 | `userFetch` |
| Supplier UI | Frontend | Real list/detail/form/delete with error preservation | R4, R7 | Supplier client |

### Supplier service (existing — hardening targets)

- `list(tenantId, query)`: `where = { tenantId, deletedAt: null, status: 'ACTIVE' }`; optional `search` adds `OR` on `code`/`name`/`phone` `contains` (insensitive); `orderBy [{ name: 'asc' }, { id: 'asc' }]`; `page = max(1, page)`, `pageSize = min(20, max(1, pageSize))`; return `{ items, page, pageSize, total }`. **(exists)**
- `findById(tenantId, id)`: `findFirst({ where: { id, tenantId, deletedAt: null } })`; throw `NotFoundException` otherwise. **(exists)**
- `create(tenantId, dto)`: normalize/trim; require non-empty `code` and `name` (else `UnprocessableEntityException VALIDATION_ERROR`); persist tenant-scoped fields; P2002 → `ConflictException DUPLICATE_SUPPLIER_CODE`; never set balance. **(exists)**
- `update(tenantId, id, dto)`: load tenant-scoped non-deleted supplier or 404; reject present-but-empty `code`/`name`; apply only submitted fields; never write balance. **(exists)**
- `remove(tenantId, id)`: load or 404; set `deletedAt = now`, `status = 'INACTIVE'`; return `{ id, deleted: true }`. **(exists)**
- `toResponse(row)`: SupplierResponse contract; `balance: Number(row.balance)`. **(exists)**

Hardening = confirm/extend unit + E2E coverage to R8; no behavior rewrite unless a gap is found.

### API contract

| Method | Endpoint | Purpose | Permission | Feature | Response | Key errors |
|---|---|---|---|---|---|---|
| GET | `/tenant/suppliers` | Search/list suppliers | `supplier:view` | — | `{items, page, pageSize, total}` | 401, 403 |
| GET | `/tenant/suppliers/:id` | Supplier detail | `supplier:view` | — | SupplierResponse | 401, 403, 404 |
| POST | `/tenant/suppliers` | Create supplier | `supplier:create` | `inventory` | SupplierResponse | 403, 409, 422 |
| PATCH | `/tenant/suppliers/:id` | Update supplier | `supplier:edit` | `inventory` | SupplierResponse | 403, 404, 409, 422 |
| DELETE | `/tenant/suppliers/:id` | Soft delete | `supplier:delete` | `inventory` | `{id, deleted:true}` | 403, 404 |

Request rules: client sends `code`+`name` (create), optional `supplierType`, `contactName`, `phone`, `email`, `address`, `taxCode`, plus `search`/`page`/`pageSize` on list, and optional `status` on update. Server ignores/rejects client-supplied `balance`, `tenantId`, `deletedAt`.

### DTO shape (existing)

- `SupplierQueryDto`: `search?` (`@IsString @IsOptional`), `page` (`@Type Number @IsInt @Min(1)` default 1), `pageSize` (`@IsInt @Min(1) @Max(20)` default 20).
- `CreateSupplierDto`: `code` (`@IsString @IsNotEmpty`), `name` (`@IsString @IsNotEmpty`), `supplierType?`/`contactName?`/`phone?`/`address?`/`taxCode?` (`@IsString @IsOptional`), `email?` (`@IsEmail @IsOptional`).
- `UpdateSupplierDto`: all fields optional; `code?`/`name?` (`@IsNotEmpty` when present); `status?` (`@IsEnum(SupplierStatusInput)`).
- `SupplierStatusInput` enum: `ACTIVE|INACTIVE`.

### Frontend client & UI

- `frontend/lib/tenant-suppliers-api.ts` (exists): base `/tenant/suppliers`; exports `listTenantSuppliers`, `createTenantSupplier`, `updateTenantSupplier`, `deleteTenantSupplier`, and types `TenantSupplier`, `SupplierListResponse`, `SupplierInput`. Add `getTenantSupplier(id)` if missing (detail/edit pages need it).
- Migrate `supplier-list.tsx` (fetch + loading/empty/error/pagination + real soft-delete), `supplier-detail.tsx` (fetch by id, read-only payable, edit/soft-delete), `supplier-form.tsx` (create/update submit, disable duplicate submit, preserve on error, surface 422/409), `supplier-card.tsx` (consume API type + type label), and the `nha-cung-cap/[id]` + `[id]/sua` pages off the seed.
- Payable mapping: API returns numeric VND `balance`; UI shows payable/no-payable from `balance > 0`. The frontend must not import `@/lib/debts` for supplier payable in this slice.
- `supplierType` mapping: FE keeps its Vietnamese display labels and maps to/from the free-form API string at the boundary; no DB enum.

## Data Models

Reuse the existing Prisma `Supplier` model. No migration. `balance` is BigInt VND (Outstanding Payable), read-only here. `status` is `ACTIVE|INACTIVE`. Soft delete uses `deletedAt` plus `status = 'INACTIVE'`. `code` is unique per tenant.

## Error Handling

| Condition | HTTP | Client behavior |
|---|---:|---|
| Missing/invalid token | 401 | Existing `userFetch` auth handling |
| Missing permission / feature | 403 | Show permission guidance; preserve form |
| Cross-tenant/missing supplier | 404 | Do not reveal existence; preserve form |
| Empty code/name / invalid email | 422 | Show field-level error; preserve form |
| Duplicate code | 409 | Show `DUPLICATE_SUPPLIER_CODE` message on the code field; preserve form |

## Testing Strategy

- Unit: DTO normalization, code+name required validation, duplicate-code conflict mapping, `toResponse` balance serialization, list pagination bounds and ordering, soft-delete + status transition.
- Integration/E2E (`backend/test/tenant-suppliers.e2e-spec.ts`): create → list/search → detail → update → soft delete; tenant isolation (cross-tenant id 404); permission denial (missing `supplier:*` → 403); feature-gate denial on writes; deleted supplier excluded from reads; client-supplied balance ignored.
- Frontend tests (`frontend/lib/tenant-suppliers-api.test.ts`): typed request URLs/methods/bodies, list mapping, error propagation; component migration verified via typecheck/build and no seed import.
- Build/lint: backend tests/build and frontend test/lint/build, plus diff check for removed seed imports.

## Security Considerations

- Tenant identity is token-derived, never body-derived.
- Every query includes tenant + active constraints; deleted suppliers are excluded.
- Server ignores client-supplied balance/tenantId/deletedAt.
- Writes are gated by both `supplier:*` permission and `inventory` entitlement.
- Soft delete preserves historical purchase/debt references.

## Performance & Scalability

- Server pagination with default page size ≤ 20; no full-history load in the browser.
- Search aligns with existing tenant-scoped supplier indexes for common lookups.

## Migration Strategy

No schema migration. The `Supplier` model, `supplier:*` permissions, and `inventory` feature already exist. Rollback is limited to reverting frontend client wiring and any added tests; no data migration is introduced.

## Unresolved Questions

- Local test DB migration state (Prisma P3009) may block E2E, mirroring `tenant-customer-management`. If unrepairable, E2E proof is recorded as an environment blocker.
- `supplierType` has no DB enum; introducing one later requires a migration and a new requirement.
