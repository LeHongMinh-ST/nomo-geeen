# Tenant Purchase Management Research

## Evidence Summary

### Repository and product evidence

- `README.md` identifies a NestJS/Prisma/PostgreSQL backend, Next.js App Router frontend, and `docs/base_spec.md`, `docs/architecture.md`, and `docs/database-design.md` as sources of truth.
- `docs/base_spec.md` defines Simple Mode as one default warehouse, one-step purchase, and `Draft → Completed`; completion increases stock. It defines stock in base units, purchase units with conversion factors, and supplier payable as a supported retail concept.
- `docs/architecture.md` describes a modular monolith with retail boundaries for product, purchase, inventory, sales, supplier, and debt. `docs/codebase-summary.md` and `docs/code-standards.md` confirm NestJS/Prisma and existing testing conventions. `docs/development-rules.md` is absent; root `AGENTS.md` and the available docs are used as the fallback rules source.
- `DESIGN.md` and `docs/design-guidelines.md` require the existing mobile-first authenticated-app layout, FarmGo colors, Be Vietnam Pro/Inter typography, and reusable list/form primitives.

### Schema evidence

- `backend/prisma/schema.prisma` already contains `Purchase`, `PurchaseLine`, `Supplier`, `Stock`, `StockMovement`, `ProductUnitConversion`, `DebtLedger`, `Warehouse`, and `PaymentVoucher`.
- `PurchaseStatus` is `DRAFT | COMPLETED | CANCELLED`; purchase lines store both `qty` and `qtyBase`, plus `unitId`, `unitPrice`, `lineTotal`, and optional batch fields.
- `Stock` is unique by `[warehouseId, productId]` and stores Decimal `qty` plus BigInt `avgCost`. `StockMovement` stores direction, Decimal qty, unit cost, reason, reference type/id, and creator.
- `Supplier` stores `balance`, `openingBalance`, status, soft deletion, and purchase relation. `DebtLedger` is tenant-scoped and supports `SUPPLIER` plus `PURCHASE`/`INCREASE` entries.
- `ProductUnitConversion` stores `factorToBase` and `ConversionKind`, including `PURCHASE`; product/base-unit relations already exist. No new purchase tables are needed. The missing idempotency field is an explicit design risk.

### Existing implementation patterns

- `backend/src/platform/sales/sales.controller.ts` and `sales.service.ts` establish the current pattern: tenant access token guard, tenant permission guard, entitlement guard, DTO validation, tenant-scoped reads, and one Prisma transaction for stock/debt effects.
- `backend/src/platform/products/products.controller.ts` and `products.service.ts` establish product lookup and tenant-scoped response patterns.
- `frontend/lib/user-fetch.ts` centralizes bearer token attachment and refresh. `frontend/lib/tenant-products-api.ts` and `frontend/lib/tenant-sales-api.ts` are typed authenticated client examples.
- Current purchase UI files (`frontend/components/app/purchase/*.tsx`) import `frontend/lib/purchases.ts` seed data and contain TODOs for create, completion, cancellation, and stock effects. Current inventory UI imports seed products/inventory from `frontend/lib/inventory.ts` and has local-only adjustment behavior.

### Permissions and entitlement evidence

- Existing tenant permission catalog includes `purchase`, `inventory`, `supplier`, and product/sales resource permissions. Existing controllers use `RequireTenantPermission` and `RequireFeature`.
- The spec must use the project's exact permission codes discovered during implementation/seed inspection, not invent a second permission namespace. Purchase write operations require purchase create/edit/complete or the closest existing mapped codes; supplier CRUD requires supplier permissions; inventory reads/writes require inventory entitlement.

### External research decision

No external/current research was required. This is an internal feature using existing repository schema, product behavior, auth conventions, and PostgreSQL transaction semantics. External API/provider behavior is not part of the scope. Implementation must still use Prisma Decimal/BigInt handling and database transactions already established by the repository.

## Collateral Damage / Blast Radius

### Expected files and modules

- Backend: new purchase and supplier modules/services/controllers/DTOs under `backend/src/platform/` or the repository's established retail module boundary; module registration; unit/controller tests; likely no migration unless idempotency proof requires one.
- Frontend: `frontend/lib/tenant-purchases-api.ts`, supplier API/types if absent, purchase components under `frontend/components/app/purchase/`, inventory API/client and components under `frontend/components/app/inventory/`, and route-level loading/error integration.
- Shared contracts: existing product API mapping and `userFetch`; existing navigation/routes remain stable.
- Verification: backend unit/integration/E2E setup and frontend Vitest/build/lint checks.

### Test invalidation and mitigation

- Existing sales tests must remain green because purchase writes share `Stock`, `StockMovement`, `Warehouse`, and `DebtLedger` invariants. Add cross-feature fixture coverage rather than modifying sales semantics.
- Existing product tests may need only type/fixture updates if conversion lookup responses are extended; preserve current product response fields and regression tests.
- Seed/database setup may need supplier, conversion, warehouse, and permission fixtures. Keep changes additive and tenant-scoped.

### Risks

1. Duplicate completion could double stock. Mitigate with a conditional `DRAFT` transition/row lock and an integration test racing or repeating completion.
2. Client-provided `qtyBase` or totals could corrupt inventory/finance. Mitigate by deriving all values server-side and rejecting mismatches.
3. Conversion records may be `BOTH` or `PURCHASE`; accept only valid purchase-enabled records and the base unit.
4. Existing `Purchase` lacks idempotency key. Choose a documented transaction-safe retry contract before implementation; do not claim idempotency from document number randomness alone.
5. Replacing seed inventory can expose incomplete existing stock APIs. Add a bounded server inventory read contract and make empty/error states explicit instead of silently falling back to seed data.

## Staleness Check

- Docs and schema agree on the existing purchase/inventory/debt entities and Simple Mode behavior.
- The current frontend is behind the docs: `/nhap-hang` and `/ton-kho` still use seed data and TODO handlers. This discrepancy is the primary implementation gap.
- `tenant-sales-management` is the closest implementation precedent; its service uses an ACID transaction, conditional stock updates, and debt ledger writes. The purchase design must preserve those patterns while adding inbound stock and moving-average cost.
