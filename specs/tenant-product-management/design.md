# Design

## API contract

All routes use the existing `TenantAccessTokenGuard`, `TenantPermissionGuard`, and `EntitlementsGuard`.

| Method | Route | Permission | Feature |
|---|---|---|---|
| GET | `/tenant/products` | `product:view` | none for reads |
| GET | `/tenant/products/lookups` | `product:view` | none |
| GET | `/tenant/products/:id` | `product:view` | none |
| POST | `/tenant/products` | `product:create` | `inventory` |
| PATCH | `/tenant/products/:id` | `product:edit` | `inventory` |
| DELETE | `/tenant/products/:id` | `product:delete` | `inventory` |

## Persistence invariants

- Every query includes `tenantId` from verified JWT claims.
- Product deletion sets `deletedAt`; no hard delete.
- Product writes validate related IDs against the same tenant.
- Product create reserves `maxProducts` inside the same transaction as `Product.create`.
- Update and delete do not change quota counters.
- Prices are represented as safe integer strings at the JSON boundary, matching the existing API convention.

## Frontend integration

- Add a small `tenant-products-api` client on top of `userFetch`.
- Replace seed state in `ProductList` with API loading and server refresh.
- Keep filtering and pagination client-side for the current 100-item API limit.
- Reuse the existing `ProductForm`; pass initial values for edit mode and surface API errors inline.
- Keep catalog manager persistence out of scope; lookups are loaded from the API.

## Verification

- Backend unit tests for service boundaries and DTO validation.
- Backend E2E for tenant isolation and permission failures.
- Frontend lint/build and unauthenticated route redirect proof.
