# Task R1-03: Entitlement enforcement integration

**Requirement:** R5/R6 — backend feature and quota enforcement
**Status:** done
**Priority:** P1
**Estimated Effort:** L
**Dependencies:** task-R0-02-entitlement-quota-foundation.md, task-R1-02-subscription-lifecycle-api.md
**Spec:** specs/admin-plan-subscription-management/

## Context

The reusable guard exists after R0-02, but protected tenant request/write paths must invoke it and perform quota checks atomically. The backend currently has no tenant business controller, so this task adds the first real product catalog read/write surface and a generic counter foundation for its authoritative `maxProducts` enforcement.

## Constraints

- **MUST** make backend enforcement authoritative; frontend checks are advisory only.
- **MUST** combine quota evaluation with the protected create mutation in a transaction/conditional write.
- **MUST** preserve existing rows and permit reads after downgrade while blocking growth over finite limits.
- **MUST NOT** invent a second entitlement algorithm in a business service.
- **MUST** keep platform-admin routes (`/admin/tenants/*`, billing routes) outside tenant entitlements.
- **SCOPE** integration/wiring plus the minimal Product route and `TenantQuotaCounter` persistence needed to prove production atomicity; evaluator logic belongs to R0-02.

## Steps

- [x] 1. Add authenticated tenant product `GET/POST /tenant/products`, derive tenant identity from the authenticated tenant context, and wire `@RequireFeature('inventory')`/`@RequireQuota('maxProducts')` plus `EntitlementsGuard`; product reads remain accessible after downgrade.
  - _Requirements: 5.1, 5.2, 6.1, 9.1_
- [x] 2. Add `TenantQuotaCounter` migration/backfill and implement the Product create transaction: re-evaluate the shared entitlement, conditionally increment the lifetime `maxProducts` counter, validate tenant-owned unit, and create Product atomically. Shape the counter for future dimensions without implementing their writers.
  - _Requirements: 6.1, 6.2, 6.4_
- [x] 3. Add integration tests proving missing feature/expired subscription/disabled feature/over-quota requests are 403, concurrent creates cannot oversubscribe, failed creates roll back the counter, and existing overage records remain readable.
  - _Requirements: 5.2, 5.4, 6.3, 6.4_

## Requirements

- 5.1–5.4 — authoritative backend feature enforcement
- 6.1–6.4 — quota enforcement, atomicity, downgrade safety
- 9.1 — guard reachability

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/entitlements/entitlements.guard.ts` | Modify | Complete request metadata/tenant extraction |
| `backend/src/platform/entitlements/entitlements.module.ts` | Modify | Export guard/decorators |
| `backend/src/platform/products/products.controller.ts` | Create | Real tenant product read/write entrypoint |
| `backend/src/platform/products/products.service.ts` | Create | Product read/create transaction boundary |
| `backend/src/platform/products/dto/create-product.dto.ts` | Create | Product boundary validation |
| `backend/src/platform/products/products.module.ts` | Create | Product module wiring |
| `backend/src/platform/entitlements/tenant-quota-counter.service.ts` | Create | Conditional counter reservation and backfill helper |
| `backend/src/platform/entitlements/entitlements.integration.spec.ts` | Create | Guard/quota HTTP and transaction integration tests |
| `backend/prisma/schema.prisma` | Modify | `TenantQuotaCounter` model |
| `backend/prisma/migrations/*quota-counter*` | Create | Additive counter schema/backfill migration |
| `backend/src/platform/auth/*` | Read / minimal Modify | Reuse authenticated tenant context; no platform-admin route changes |
| `backend/src/app.module.ts` | Read / Modify | Runtime module reachability |

## Completion Criteria

- [x] Real `/tenant/products` request/read and write entrypoints invoke the shared guard; no test-only fallback is used.
- [x] Missing feature, expired subscription, disabled flag, and quota overflow return stable 403 denial contracts.
- [x] Concurrent product writes cannot oversubscribe `maxProducts`; failed product writes roll back the counter; downgrade never deletes data or blocks existing reads.
- [x] No duplicate entitlement logic is introduced in protected services.

## Evidence

- [x] Automated verification
  - Command(s): `cd backend && pnpm test -- --runInBand entitlements.integration.spec.ts && pnpm build`; `cd backend && pnpm exec jest --config ./test/jest-e2e.json --runInBand tenant-products.e2e-spec.ts`
  - Expected proof: integration denial/atomicity suite, real HTTP denial/rollback/concurrency/downgrade suite, and build pass.
- [x] Artifact / runtime verification
  - Inspect: controller decorators, module imports, and protected create transaction.
  - Expect: handler cannot run before guard approval and quota mutation is atomic.
- [x] Runtime reachability verification
  - Entrypoint/caller: `POST /tenant/products` and `GET /tenant/products` under `ProductsModule`.
  - Expect: request metadata reaches `EntitlementService` and denial is observable at HTTP boundary.
- [x] Contract / negative-path verification
  - Check: direct API call bypassing UI, absent DB entitlement, concurrent creates, post-downgrade read.
  - Expect: deny/fail-closed, no oversubscription, existing read preserved.

### Verification receipt

- `cd backend && pnpm test -- --runInBand entitlements.integration.spec.ts` — PASS, 5 tests.
- `cd backend && pnpm test --runInBand` — PASS, 17 suites / 134 tests.
- `cd backend && pnpm build` — PASS.
- Targeted Biome check — PASS.
- `cd backend && pnpm exec prisma migrate deploy` — PASS; `pnpm exec prisma migrate status` — PASS, database schema up to date.
- `cd backend && pnpm exec jest --config ./test/jest-e2e.json --runInBand tenant-products.e2e-spec.ts` — PASS, 5 tests covering feature missing/disabled, expiry, quota overflow, rollback, concurrent writes, and downgrade reads.
- Runtime proof: `/auth/login` issues tenant-scoped JWT; `/tenant/products` resolves tenant from JWT, invokes guards, and persists Product/counter through one Prisma transaction.
- Review: SPEC_PASS, 0 critical, code quality 9.7/10; final DTO precision warning resolved. Residual warning: tenant JWT status revalidation remains the current blacklist/expiry contract.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Authenticated tenant business route is new | High | Reuse existing tenant context contract; prove direct HTTP reachability and tenant mismatch rejection |
| Check-then-write race | Critical | Transaction/conditional write test with concurrent requests |
