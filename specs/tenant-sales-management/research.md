# Research & Design Decisions

## Summary
- **Feature**: tenant-sales-management
- **Discovery Scope**: Extension / cross-layer integration
- **Key Findings**:
  - Prisma already contains `Sale`, `SaleLine`, `Stock`, `StockMovement`, `DebtLedger`, `DocumentSequence`, and default `Warehouse` models; no schema migration is required for the first quick-sale slice.
  - `frontend/components/app/sales/quick-sale.tsx` completes sales locally and clears the cart without persistence.
  - `frontend/components/app/sales/product-picker.tsx` searches `frontend/lib/products.ts`, while the real tenant product contract is already exposed by `frontend/lib/tenant-products-api.ts`.
  - The existing tenant auth, permission, feature, quota, and `userFetch` patterns are reusable.

## Evidence Summary
- **Codebase Scout**: Required and completed.
  - Result: the requested flow is a vertical slice over existing storage and auth primitives, with the main gap at the sales backend and the `/ban-nhanh` runtime wiring.
  - Relevant files/modules: `backend/prisma/schema.prisma`, `backend/src/platform/products/products.controller.ts`, `frontend/components/app/sales/quick-sale.tsx`, `frontend/components/app/sales/product-picker.tsx`, `frontend/lib/tenant-products-api.ts`, `frontend/lib/user-fetch.ts`.
  - Existing patterns/contracts: NestJS controller + service + DTO, tenant guards and permission decorators, `userFetch` refresh/retry, and soft-delete/product isolation.
  - Tests/checks affected: backend Jest unit/e2e suites, frontend Vitest/build, and a browser reachability check for `/ban-nhanh`.
- **External / Current Research**: Skipped.
  - Rationale: this slice uses existing Prisma, NestJS, Next.js, and browser APIs already present in the repository; no new provider or current external policy is introduced.
- **Selected Decision**:
  - Add a tenant-scoped `POST /tenant/sales/quick` endpoint backed by one Prisma transaction, then make the existing product picker and quick-sale submit path consume it.
  - Resolve the tenant default warehouse server-side; never trust a warehouse or tenant identifier from the client.
  - Keep the first slice online-only and completed-sale-only. Preserve the current client cart when a request fails.
- **Rejected Alternatives**:
  - Reusing `frontend/lib/orders.ts` mock state — rejected because it cannot enforce tenant isolation, stock correctness, or durable debt.
  - Adding a new inventory schema — rejected because the existing schema already models the required stock and batch boundaries.
  - Implementing draft orders, returns, or disease recommendations — rejected as out of scope for the requested quick-sale slice.
- **Remaining Gaps / Questions**:
  - Customer CRUD/search is not yet backed by an API. The sale contract accepts an optional existing `customerId`; anonymous cash/transfer sales remain fully supported. Debt payment requires a valid tenant customer.
  - Batch FIFO/expiry policy is existing domain scope but not present in the requested product CRUD slice; this spec uses the existing stock row as the authoritative quantity and leaves batch allocation explicit for a later inventory spec.
- **Downstream Task & Test Implications**:
  - Backend tasks must prove transaction rollback, tenant isolation, permission/feature denial, insufficient stock, and idempotent retry behavior.
  - Frontend tasks must prove real product loading, locked/out-of-stock exclusion, submit loading/error states, success reset, and API reachability from `/ban-nhanh`.

## Codebase Scout

| Area | Finding | Evidence / Path | Implication |
|---|---|---|---|
| Persistence | Sales and stock tables already exist | `backend/prisma/schema.prisma` (`Sale`, `SaleLine`, `Stock`, `StockMovement`, `DebtLedger`) | Reuse models; no migration in scope |
| Backend pattern | Tenant product controller uses guards, permission decorators, feature/quota guards | `backend/src/platform/products/products.controller.ts` | Sales controller follows the same boundary |
| Product API | Real tenant product list/detail/lookups client exists | `frontend/lib/tenant-products-api.ts` | ProductPicker should consume this contract |
| Current UI | Quick sale is local-only; ProductPicker uses seed products | `frontend/components/app/sales/quick-sale.tsx`, `product-picker.tsx` | Replace only data and submit seams, preserve UX |
| Auth transport | `userFetch` adds bearer token, refreshes once, and preserves cookies | `frontend/lib/user-fetch.ts` | New sales client must use `userFetch` |
| Verification | Backend uses Jest; frontend uses Vitest and Next build | `backend/package.json`, `frontend/package.json` | Task evidence uses existing commands |
| Blast radius | Sale write affects stock and debt balances | Prisma models above | Require transaction and negative-path tests |

## Architecture Pattern Evaluation

| Option | Strengths | Risks / Limitations | Decision |
|---|---|---|---|
| One transactional NestJS service | Matches current backend, preserves atomic stock/debt updates | Service must own validation and transaction ordering | Selected |
| Client-side persistence then sync | Fast prototype | Cannot prevent overselling or cross-tenant writes | Rejected |
| Separate event/saga flow | Extensible | Unnecessary complexity for one database transaction | Rejected |

## Design Decisions

### Decision: Completed quick sale is one database transaction
- **Context**: A sale must not persist while stock or debt update fails.
- **Selected Approach**: Validate tenant-scoped products, customer, default warehouse, quantities, payment, and idempotency key; create sale lines, decrement stock, create stock movements, and create a debt ledger entry in one Prisma transaction.
- **Rationale**: Existing data is relational and the user needs immediate checkout behavior.
- **Status**: Accepted

### Decision: Real product data is loaded at picker open/search
- **Context**: Existing picker reads static `products`.
- **Selected Approach**: Load `listTenantProducts()` once on mount, map with product lookups, filter client-side for the current search, and refresh after a successful sale when practical.
- **Rationale**: The product list endpoint is already available and keeps this slice bounded; server-side search can be added when scale requires it.
- **Status**: Accepted

## Risks & Mitigations
- Concurrent checkouts may race on the same stock row — use a transaction and conditional update/row lock semantics; fail with an insufficient-stock business error.
- Client retries may duplicate a sale — require a tenant-scoped idempotency key and return the existing result for a repeated key.
- Existing mock customer IDs may not exist in the database — treat invalid customer IDs as a 422 error and keep anonymous sales available.

## References
- `docs/base_spec.md` §10, §12, §18 — sales, debt, and stock business rules.
- `docs/sales.md` — Phase 1 quick-sale UX and completed-sale behavior.
- `DESIGN.md` §15 — mobile-first quick-sale interaction rules.
