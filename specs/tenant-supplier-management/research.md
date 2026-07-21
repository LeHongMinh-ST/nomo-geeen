# Tenant Supplier Management — Research

## Evidence Summary

### Codebase scout result

**Backend `/tenant/suppliers` already exists and is largely complete:**

- `backend/src/platform/suppliers/suppliers.service.ts` — full CRUD: `list` (tenant + `deletedAt:null` + `status:'ACTIVE'`, search `OR` on code/name/phone `contains` insensitive, `orderBy [name asc, id asc]`, page bound `min(20, max(1, pageSize))`), `findById`, `create` (requires code+name, P2002 → `ConflictException DUPLICATE_SUPPLIER_CODE`), `update`, `remove` (soft delete: `deletedAt=now`, `status='INACTIVE'`), `toResponse` (`balance: Number(bigint)`), `normalize` (trim, empty→null).
- `backend/src/platform/suppliers/suppliers.controller.ts` — `@Controller('tenant/suppliers')`, guards `TenantAccessTokenGuard, TenantPermissionGuard, EntitlementsGuard`. Permissions: read `supplier:view`; create/update/delete `supplier:create`/`supplier:edit`/`supplier:delete`. `@RequireFeature('inventory')` on **create/update/delete only** (reads are ungated).
- `backend/src/platform/suppliers/dto/supplier.dto.ts` — `SupplierQueryDto` (search?, page, pageSize≤20), `CreateSupplierDto` (code+name required, others optional, `@IsEmail email?`), `UpdateSupplierDto` (all optional + `status?` enum), `SupplierStatusInput` enum ACTIVE/INACTIVE.
- `backend/src/platform/suppliers/suppliers.module.ts` — registered in `backend/src/app.module.ts` (`SuppliersModule`).
- Unit specs exist: `suppliers.service.spec.ts`, `suppliers.controller.spec.ts`. E2E: `backend/test/tenant-suppliers.e2e-spec.ts` (229 lines, one combined flow test: create → search → update → soft-delete keeping purchase history readable).
- Permissions `supplier:{view,create,edit,delete,approve,export}` are seeded — `backend/prisma/seed.ts` generates `RESOURCES × ACTIONS`, and `supplier` ∈ `RESOURCES`. No new permission namespace needed.

**Frontend `/nha-cung-cap` still runs on seed data:**

- Real client `frontend/lib/tenant-suppliers-api.ts` already exists (`listTenantSuppliers`/`create`/`update`/`delete`, types `TenantSupplier`, `SupplierListResponse`, `SupplierInput`) but is consumed **only** by `frontend/components/app/purchase/supplier-picker.tsx`.
- Seed-backed screens still import `@/lib/suppliers` (mock array + `getSupplier`) and `@/lib/debts` (mock payable):
  - `frontend/components/app/supplier/supplier-list.tsx` (imports seed `suppliers`, `debtOutstanding`/`getDebt`)
  - `frontend/components/app/supplier/supplier-detail.tsx`
  - `frontend/components/app/supplier/supplier-form.tsx`
  - `frontend/components/app/supplier/supplier-card.tsx`
  - `frontend/app/(app)/nha-cung-cap/[id]/page.tsx`, `frontend/app/(app)/nha-cung-cap/[id]/sua/page.tsx` (`getSupplier` from seed)
- Pages: `frontend/app/(app)/nha-cung-cap/page.tsx`, `.../them/page.tsx`, `.../[id]/page.tsx`, `.../[id]/sua/page.tsx` (routes preserved).

**Reference precedent — `tenant-customer-management`:** same shape (backend CRUD + FE wiring), split into `task-R1-01-customer-domain-api.md` (backend) + `task-R2-01-customer-ui-integration.md` (frontend). Its R1-01 is currently **blocked** by a local Postgres migration failure (Prisma P3009 on `20260719000400_tenant_quota_counter`, missing `feature.group`). The same environment risk applies to supplier E2E.

### External research result

**Skipped (with rationale).** No third-party API, library upgrade, platform policy, provider/model, or security/privacy standard is introduced. This is internal tenant-scoped CRUD reusing existing NestJS/Prisma + Next.js patterns already proven by the customers/suppliers modules. External research is not mandatory per the evidence-classification rules.

### Selected decision

- **Full-stack, but backend = harden-not-rebuild.** The supplier backend already satisfies most of the target contract. Work is: (1) close remaining contract/test gaps to match the customer-module bar, (2) wire the four `/nha-cung-cap` screens off seed onto `tenant-suppliers-api.ts`.
- **Keep existing named contracts verbatim.** `code` AND `name` both required (differs from customer where only `name` is required); `status` ACTIVE/INACTIVE column drives the active filter alongside `deletedAt:null`; duplicate code → 409 `DUPLICATE_SUPPLIER_CODE`; `@RequireFeature('inventory')` gates writes. Do NOT silently drop or rename these.
- **`supplierType` stays a free-form optional string at the API boundary** (backend has no enum). The frontend seed used a 3-value union (`manufacturer|distributor|agent`); the FE maps between its display labels and the free-string API value at the boundary, and MUST NOT force a DB enum (that would require a migration — out of scope).
- **Balance = Outstanding Payable, server-derived, read-only.** FE stops importing `@/lib/debts` for supplier payable and renders `balance` from the API (`balance > 0` ⇒ has payable).

### Rejected alternatives

- **Frontend-only spec** (assume backend done): rejected — user explicitly chose Full-stack; backend test/contract gaps (single E2E flow, no explicit permission-denial/tenant-isolation E2E assertions verified) justify a hardening task.
- **Introduce a `SupplierType` DB enum** to match customer's typed enum: rejected — requires a Prisma migration and a new requirement; base_spec §7 describes supplier type as free text ("nhà sản xuất / nhà phân phối / đại lý cấp trên..."). Out of scope.
- **Add cooperation-policy fields (discount %, credit limit, payment term) to the API**: rejected — credit control is explicitly out of scope; the seed carried them but they are not part of this CRUD slice.

### Remaining gaps

- Local test DB migration state may block E2E (`P3009`), same as the customer spec. Tasks record this as an environment prerequisite, not a code defect; if unrepairable, the E2E evidence is recorded as a blocker per state-sync rules.
- `supplierType` display-label ↔ API-string mapping is a FE boundary detail; the API contract only guarantees a nullable string.

### Downstream task/test implications

- **R1 (backend hardening)**: assert/complete unit coverage for validation (code+name required), duplicate-code conflict, `toResponse` balance serialization, pagination bounds, soft-delete + status; ensure E2E covers tenant isolation (cross-tenant id → 404), permission denial (missing `supplier:*` → 403), feature-gate on writes, deleted supplier excluded from reads.
- **R2 (frontend wiring)**: route list/search/detail/create/edit/soft-delete through `tenant-suppliers-api.ts`; drop `@/lib/suppliers` + `@/lib/debts` from these four screens; render payable read-only; preserve responsive/sticky-save UX and existing routes.
- **R3 (integration/reachability)**: prove the `/nha-cung-cap` route tree renders API-backed data with no seed import remaining, and `supplier-picker.tsx` continues to work.

## Unresolved Questions

- Supplier `code` uniqueness is enforced per tenant by a DB unique constraint (P2002 path exists). This design preserves it; no new constraint is added.
- If the local migration state cannot be repaired in this environment, backend E2E proof will be recorded as an environment blocker (mirroring `tenant-customer-management`).
