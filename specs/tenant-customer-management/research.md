# Tenant Customer Management Research

## Evidence Summary

### Repository and product evidence

- `README.md` and `docs/base_spec.md` describe a NestJS/Prisma/PostgreSQL backend and Next.js App Router frontend. `base_spec.md` §6 (Khách hàng) defines customers as a directory keyed primarily by phone (farmers rarely have a customer code), with type, address, and a running receivable balance.
- Phase 1 "Simple Mode" keeps the customer module to a directory + balance display; order/payment/debt collection are separate modules (Sales, Debt) and are intentionally out of this slice.
- `DESIGN.md` requires the existing mobile-first authenticated-app layout, FarmGo colors, reusable list/form primitives, and page-based (not modal) detail/edit. `frontend/AGENTS.md` warns this Next.js build differs from training data — read `node_modules/next/dist/docs/` before writing frontend code.

### Schema evidence

- `backend/prisma/schema.prisma` already contains the `Customer` model (tenantId, code String?, name, nameSearch String?, phone String?, address String?, type CustomerType?, productionProfile Json?, debtLimit BigInt?, openingBalance BigInt @default 0, balance BigInt @default 0, note String?, deletedAt, createdAt, updatedAt). Relations: tenant, sales, salesReturns, productPrices, vouchers. Indexes: `@@index([tenantId, phone])`, `@@index([tenantId, nameSearch])`, `@@map("customer")`.
- `CustomerType` enum = `RETAIL | FARMER | FARM | AGENT`.
- No `status` column exists on Customer (unlike Supplier). Soft delete is expressed only by `deletedAt`; there is no `ACTIVE/INACTIVE` status. Active-record filtering must use `deletedAt: null` alone.
- `balance` and `openingBalance` are BigInt VND. `balance` is mutated by the sales/debt flow (`sales.service.ts` increments `customer.balance` and writes a `DebtLedger` with partyType `CUSTOMER`). This module treats `balance` as **read-only, server-derived** and never mutates it.
- **No schema migration is required** for this CRUD + balance slice.

### Existing implementation patterns

- `backend/src/platform/suppliers/{suppliers.controller.ts,suppliers.service.ts,suppliers.module.ts,dto/supplier.dto.ts}` is the closest precedent: tenant access token guard + tenant permission guard + entitlement guard, DTO validation, tenant-scoped reads with `deletedAt: null`, bounded pagination (`pageSize` min 1 max 20), search OR on code/name/phone, soft delete via `deletedAt`, BigInt `balance` serialized to Number in `toResponse`, and `P2002` → conflict mapping for duplicate code.
- Key difference to carry into Customer: Supplier has `status` and a **required unique `code`**; Customer has **no status**, an **optional `code`**, and a **required `name`** with phone as the practical identifier. The Customer service must not assume a status column and must not force a code.
- `backend/src/platform/products/products.controller.ts` shows the lookup-style read pattern and confirms core modules gate reads on `product:view` and writes on `product:*` + `@RequireFeature('inventory')`.
- `backend/src/app.module.ts` registers platform modules; `CustomersModule` must be added to the `imports` array (after `SalesModule`).
- Frontend: `frontend/lib/tenant-suppliers-api.ts` is the typed `userFetch` client to mirror (base `/tenant/suppliers` → `/tenant/customers`, list/create/update/delete). `frontend/lib/customers.ts` is the current mock (`CustomerType = "retail"|"farmer"|"farm"|"agent"`, `Customer = {id,name,phone,address?,type,debt}`, `customerTypeLabel`, 6 seed records, `getCustomer`). Components under `frontend/components/app/customer/` (`customer-list.tsx`, `customer-detail.tsx`, `customer-form.tsx`, `customer-card.tsx`) consume the mock and carry `TODO: gọi API` handlers.

### Permissions and entitlement evidence

- `backend/prisma/seed.ts` seeds resource `customer` with the standard action set (view/create/edit/delete/approve/export), so `customer:view`, `customer:create`, `customer:edit`, `customer:delete` **already exist** — no new permissions needed.
- The `FEATURES` catalog is `inventory, debt, batch, tax, barcode, quantity_tier_pricing, advanced_mode`. There is **no `customer` feature code**. Suppliers reuse `@RequireFeature('inventory')` because supplier management is inventory-adjacent; customers are not.
- **Gating decision:** Customer routes gate on tenant permissions only (`customer:view/create/edit/delete`) and do NOT use `@RequireFeature`. Rationale: the customer directory is a core entity every plan needs (quick-sale checkout in tenant-sales-management already references customers), and no `customer` feature entitlement exists. Reusing `inventory`/`debt` would wrongly lock customer CRUD behind an unrelated plan.

### External research decision

No external/current research required. This is an internal CRUD feature reusing existing repository schema, auth conventions, permission catalog, and PostgreSQL semantics. No provider/API behavior is in scope.

## Collateral Damage / Blast Radius

### Expected files and modules

- Backend (new): `backend/src/platform/customers/customers.module.ts`, `customers.controller.ts`, `customers.service.ts`, `dto/customer.dto.ts`, `customers.service.spec.ts` / `customers.controller.spec.ts`; `backend/test/tenant-customers.e2e-spec.ts`. Edit `backend/src/app.module.ts` to register the module.
- Frontend (new): `frontend/lib/tenant-customers-api.ts` (+ `.test.ts`). Edit: `frontend/components/app/customer/{customer-list,customer-detail,customer-form}.tsx` and route pages under `frontend/app/(app)/khach-hang/**` to consume the API. `frontend/lib/customers.ts` mock kept only for type/label reference or removed once components migrate.
- Shared contracts: existing `userFetch`; navigation/routes stay stable.

### Test invalidation and mitigation

- Existing sales tests must remain green because they read/mutate `Customer.balance` and `DebtLedger`. This module must not change customer balance semantics — keep changes additive and read-only for balance.
- No product/purchase/supplier test is affected; the new module is isolated.

### Risks

1. Assuming a Supplier-style `status` column — Customer has none. Filter active records with `deletedAt: null` only; do not write `status`.
2. Forcing a required unique `code` — Customer `code` is optional and phone is the real identifier. Validation must require `name`, allow empty code, and not create a duplicate-code constraint that does not exist. Uniqueness is not enforced by the schema for customer code, so do not promise it.
3. Mutating `balance` from this module would corrupt sales/debt state. Treat balance as read-only, server-derived.
4. Cross-tenant read/write. Mitigate with `tenantId` from the token on every query plus E2E isolation and permission-denial tests.
5. Frontend still using seed data would silently show stale customers. Replace mock imports at the component entrypoints and surface loading/empty/error states.

## Staleness Check

- Schema, seed permissions, and the suppliers module are current and agree. The `Customer` model, `CustomerType` enum, and `customer:*` permissions already exist.
- The frontend `/khach-hang` surface is behind the backend: list/detail/form/delete all run on `frontend/lib/customers.ts` mock with `TODO: gọi API` handlers. This is the primary implementation gap.
- `tenant-purchase-management` (supplier slice) is the closest completed precedent; its supplier service is the structural template, adjusted for Customer's no-status / optional-code / required-name shape.
