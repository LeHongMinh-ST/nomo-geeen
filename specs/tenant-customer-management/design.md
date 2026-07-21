# Tenant Customer Management Design

## Overview

This feature turns the user-app customer surface into a real tenant-scoped directory. A store user can list and search customers, view a customer's contact details, type, and read-only receivable balance, create and update customers, and soft-delete without breaking historical sales or debt references.

The design extends the existing NestJS/Prisma suppliers/products pattern. It reuses the existing `Customer` model, `CustomerType` enum, and seeded `customer:*` permissions. No schema migration and no database transaction are required: balance stays read-only and is owned by the sales/debt flows.

### Goals

- Replace the seed-backed `/khach-hang` list/detail/form/delete with authenticated tenant API flows.
- Provide tenant-isolated customer CRUD with server-derived balance display.
- Preserve historical references (sales, debt) through soft delete.

### Non-Goals

- Customer order/transaction history rendering, debt collection, payment vouchers, opening-balance/credit-limit editing, customer-specific pricing, import/export, or dedup/merge.
- Any mutation of `Customer.balance`, `openingBalance`, or `DebtLedger`.

## Architecture

### Existing Architecture Analysis

- Backend controllers authenticate via tenant access token, enforce tenant permission guards, and delegate to a Prisma-backed service. Suppliers is the closest precedent; products confirms the core-module read pattern.
- Key differences from Supplier the Customer service must honor: Customer has **no `status` column** (active filter = `deletedAt: null` only), an **optional `code`** (no unique constraint), and a **required `name`**. Balance is BigInt and read-only here.
- Frontend API clients call `userFetch`; the customer components currently use `frontend/lib/customers.ts` seed data and must be replaced at their runtime entrypoints.

### Architecture Pattern & Boundary Map

Selected pattern: tenant-scoped vertical slice with a single `CustomersService` (CRUD + lookup) behind a guarded `CustomersController`. No transaction boundary is needed because no cross-entity write occurs. Balance is projected read-only from the persisted column.

```mermaid
flowchart LR
  CustomerUI[/khach-hang] --> CustomerClient[tenant-customers-api]
  CustomerClient --> CustomerGuard[Tenant auth + permission]
  CustomerGuard --> CustomerController[CustomersController]
  CustomerController --> CustomerService[CustomersService]
  CustomerService --> DB[(PostgreSQL customer table)]
  Sales[Sales/Debt flows] -. writes balance .-> DB
  CustomerService -. reads balance only .-> DB
```

### Technology Stack

| Layer | Choice / Version | Role | Notes |
|---|---|---|---|
| Frontend | Next.js/React/TypeScript | Customer list/detail/form and delete | Reuse `userFetch`, existing components, `DESIGN.md`; read `node_modules/next/dist/docs/` first |
| Backend | NestJS, class-validator, Jest | Customer CRUD/search API | Follow suppliers controller-service split |
| Data | Prisma/PostgreSQL | Existing `customer` table | No migration; balance read-only |
| Runtime | Existing tenant auth + permission guards | Authorization | No feature entitlement gate |

## Canonical Contracts & Invariants

| Contract Area | Canonical Decision | Applies To | Must Stay Consistent In |
|---|---|---|---|
| Auth/session | `tenantId` and `userId` come only from the verified tenant access token; every query/write is tenant-scoped. | Controller/service | DTOs, guards, tests, UI client |
| Permissions | Reads require `customer:view`; create/update/delete require `customer:create`/`customer:edit`/`customer:delete`. No `@RequireFeature` — customer directory is core to every plan and no customer feature code exists. | API entrypoints | Controller decorators, E2E fixtures, frontend errors |
| Active-record filter | A customer is active iff `deletedAt IS NULL`. There is no `status` column; the service must never read or write a customer status. | List/detail/delete | Service queries, tests |
| Identity fields | `name` is required and non-empty. `code` and `phone` are optional; `code` has no uniqueness guarantee and must not be forced or de-duplicated. | Create/update | DTO, service, UI |
| Type | `type` is optional; when present it must be one of `RETAIL`, `FARMER`, `FARM`, `AGENT`. | Create/update | DTO enum, response mapper, UI |
| Balance | `balance` (and `openingBalance`) are server-derived, read-only in this module. The service never writes them; client-supplied balance is ignored/rejected. | All routes | Service, response mapper, UI |
| Retention | Delete is soft (`deletedAt = now`). Historical sales/debt references are preserved; deleted customers are excluded from reads. | Delete | Service, tests |
| Money serialization | BigInt `balance`/`openingBalance` are serialized to a safe JSON number in `toResponse`, matching the suppliers convention. | Response | Mapper, client types, tests |

## System Flows

```mermaid
sequenceDiagram
  participant UI as Customer form/list
  participant API as Customer API
  participant DB as Prisma (customer)
  UI->>API: list/detail/create/update/delete request
  API->>API: verify tenant + permission; validate DTO
  alt read
    API->>DB: query where tenantId + deletedAt null
    DB-->>API: customers (balance read-only)
  else create/update
    API->>DB: persist tenant-scoped contact fields (no balance write)
    DB-->>API: customer
  else delete
    API->>DB: set deletedAt (soft)
    DB-->>API: {id, deleted:true}
  end
  API-->>UI: canonical customer response or stable error
  UI->>UI: refresh list/detail after success
```

## Requirements Traceability

| Requirement | Design elements | Tasks |
|---|---|---|
| 1.1–1.4 | CustomersService.list/findById, tenant filter, pagination, ordering | R1-01 |
| 2.1–2.5 | Create/update DTOs, name-required validation, CustomerType enum, optional code | R1-01 |
| 3.1–3.3 | Soft-delete via deletedAt, retention, not-found contract | R1-01 |
| 4.1–4.3 | Read-only balance projection in toResponse; UI read-only display | R1-01, R2-01 |
| 5.1–5.4 | Guards, tenant scope, permission decorators, no feature gate | R1-01 |
| 6.1–6.4 | Customer API client, list/detail/form/delete reachability | R2-01 |
| 7.1–7.2 | Bounded pagination, tenant-scoped index-aligned search | R1-01 |
| 8.1–8.3 | Tenant scope, reject client balance, non-revealing errors | R1-01 |
| 9.1–9.2 | Backend unit/controller/E2E; frontend client tests + build/lint | R1-01, R2-01 |

## Components and Interfaces

| Component | Layer | Intent | Requirements | Dependencies |
|---|---|---|---|---|
| CustomersController/Service | Backend | Tenant-scoped customer CRUD/search + read-only balance | 1–5, 7–9 | Prisma, auth + permission guards |
| Customer DTOs | Shared boundary | Validate/serialize customer request/response | 1–5, 8 | class-validator |
| Customer API client | Frontend boundary | Typed authenticated calls to `/tenant/customers` | 6 | `userFetch` |
| Customer UI | Frontend | Real list/detail/form/delete with error preservation | 4, 6 | Customer client |

### Customer service

- `list(tenantId, query)`: `where = { tenantId, deletedAt: null }`; optional `search` adds `OR` on `name`/`phone`/`code` `contains` (insensitive); `orderBy [{ name: 'asc' }, { id: 'asc' }]`; `page = max(1, page)`, `pageSize = min(20, max(1, pageSize))`; return `{ items, page, pageSize, total }`.
- `findById(tenantId, id)`: `findFirst({ where: { id, tenantId, deletedAt: null } })`; throw `NotFoundException` otherwise.
- `create(tenantId, dto)`: normalize/trim; require non-empty `name` (else `UnprocessableEntityException` `VALIDATION_ERROR`); persist tenant-scoped contact fields; do not set balance (defaults to 0 from schema).
- `update(tenantId, id, dto)`: load tenant-scoped non-deleted customer or 404; apply only submitted contact fields; never write balance/openingBalance.
- `remove(tenantId, id)`: load or 404; set `deletedAt: new Date()`; return `{ id, deleted: true }`.
- `toResponse(row)`: map id, code, name, phone, address, type, `balance: Number(row.balance)`, `openingBalance: Number(row.openingBalance)`, createdAt, updatedAt.
- No `status` field is read or written anywhere.

### API contract

| Method | Endpoint | Purpose | Permission | Response | Key errors |
|---|---|---|---|---|---|
| GET | `/tenant/customers` | Search/list customers | `customer:view` | `{items, page, pageSize, total}` | 401, 403 |
| GET | `/tenant/customers/:id` | Customer detail | `customer:view` | Customer | 401, 403, 404 |
| POST | `/tenant/customers` | Create customer | `customer:create` | Customer | 403, 422 |
| PATCH | `/tenant/customers/:id` | Update customer | `customer:edit` | Customer | 403, 404, 422 |
| DELETE | `/tenant/customers/:id` | Soft delete | `customer:delete` | `{id, deleted:true}` | 403, 404 |

Request rules: client sends `name` (create), optional `phone`, `code`, `address`, `type`, `note`, plus `search`/`page`/`pageSize` on list. Server ignores/rejects client-supplied `balance`, `openingBalance`, `tenantId`, `deletedAt`.

### DTO shape

- `CustomerQueryDto`: `search?` (`@IsString @IsOptional`), `page` (`@Type Number @IsInt @Min(1)` default 1), `pageSize` (`@IsInt @Min(1) @Max(20)` default 20).
- `CreateCustomerDto`: `name` (`@IsString @IsNotEmpty`), `phone?`/`code?`/`address?`/`note?` (`@IsString @IsOptional`), `type?` (`@IsEnum(CustomerTypeInput) @IsOptional`).
- `UpdateCustomerDto`: all fields optional; `name?` (`@IsString @IsNotEmpty` when present); same enum for `type?`. No `status` field.
- `CustomerTypeInput` enum mirrors Prisma `CustomerType` (`RETAIL|FARMER|FARM|AGENT`).

### Frontend client & UI

- `frontend/lib/tenant-customers-api.ts`: mirror `tenant-suppliers-api.ts`. Base `/tenant/customers`. Export `listTenantCustomers`, `getTenantCustomer`, `createTenantCustomer`, `updateTenantCustomer`, `deleteTenantCustomer`, and types `TenantCustomer`, `CustomerListResponse`, `CustomerInput` (with `type` union matching the API enum lowercased or mapped at the boundary).
- Migrate `customer-list.tsx` (fetch + loading/empty/error/pagination), `customer-detail.tsx` (fetch by id, read-only balance, edit/soft-delete), `customer-form.tsx` (create/update submit, disable duplicate submit, preserve on error) and the `khach-hang` route pages off the mock.
- Balance mapping: API returns a numeric VND `balance`; UI shows debt/no-debt from `balance > 0`. The frontend must not import order/debt seed libraries for balance in this slice.

## Data Models

Reuse the existing Prisma `Customer` model and `CustomerType` enum. No migration. `balance`/`openingBalance` are BigInt VND, read-only here. Soft delete uses `deletedAt`. `nameSearch` may optionally be populated on write for accent-insensitive search; if null, search falls back to `name`/`phone` `contains`.

## Error Handling

| Condition | HTTP | Client behavior |
|---|---:|---|
| Missing/invalid token | 401 | Existing `userFetch` auth handling |
| Missing permission | 403 | Show permission guidance; preserve form |
| Cross-tenant/missing customer | 404 | Do not reveal existence; preserve form |
| Empty name / invalid type | 422 | Show field-level error; preserve form |

## Testing Strategy

- Unit: DTO normalization, name-required validation, CustomerType enum rejection, `toResponse` balance serialization, list pagination bounds and ordering, soft-delete behavior.
- Integration/E2E (`backend/test/tenant-customers.e2e-spec.ts`): create → list/search → detail → update → soft delete; tenant isolation (cross-tenant id 404); permission denial (missing `customer:*`); deleted customer excluded from reads; client-supplied balance ignored.
- Frontend tests (`frontend/lib/tenant-customers-api.test.ts`): typed request URLs/methods/bodies, list mapping, error propagation; component migration verified via build/lint and no seed import.
- Build/lint: backend tests/build and frontend test/lint/build, plus diff check.

## Security Considerations

- Tenant identity is token-derived, never body-derived.
- Every query includes a tenant constraint; deleted customers are excluded.
- Server ignores client-supplied balance/opening balance/tenantId/deletedAt.
- Soft delete preserves historical sales/debt references.

## Performance & Scalability

- Server pagination with default page size ≤ 20; no full-history load in the browser.
- Search aligns with existing `[tenantId, phone]` and `[tenantId, nameSearch]` indexes for common lookups.

## Migration Strategy

No schema migration. The `Customer` model, `CustomerType` enum, and `customer:*` permissions already exist. Rollback is limited to reverting the new module registration and frontend client wiring; no data migration is introduced.

## Unresolved Questions

- Customer `code` has no unique constraint in the schema; this design does not promise uniqueness. Adding it later requires a migration and a new requirement.
- `nameSearch` population is treated as an additive implementation detail, not a contract.
