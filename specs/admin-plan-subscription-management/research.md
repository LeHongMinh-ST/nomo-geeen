# Research & Design Decisions

## Summary

- **Feature**: `admin-plan-subscription-management`
- **Discovery Scope**: Complex integration: platform admin CRUD, schema-backed manual billing state, backend authorization/enforcement, and frontend admin UX.
- **Key Findings**:
  - The Prisma schema already contains `Plan`, `Feature`, `PlanFeature`, `Subscription`, `TenantFeatureFlag`, and quota columns, but no admin billing module or effective-entitlement service exists.
  - Admin auth, RBAC, and transactional audit patterns are implemented and should be reused.
  - Tenant admin detail already exposes subscription counts, so subscription data can be added without changing tenant identity semantics.

## Evidence Summary

- **Codebase Scout**: Required
  - **Project surface**: pnpm monorepo with `backend` (NestJS 11, Prisma 7, PostgreSQL, Jest) and `frontend` (Next.js 16, React 19, Zustand, Biome). Backend commands include `pnpm test`, `pnpm test:e2e`, `pnpm build`, and Prisma migration/generation scripts.
  - **Relevant files/modules**:
    - `backend/prisma/schema.prisma`: existing plan/feature/subscription/quota/audit enums and relations.
    - `backend/src/platform/tenants/*`: platform admin tenant REST/module patterns and tenant detail contract.
    - `backend/src/platform/audit/*`: `AuditLogger.run()` same-transaction mutation + audit contract.
    - `backend/src/platform/auth/*`, `backend/src/platform/roles/*`, `backend/prisma/seed-admin-rbac.ts`: guard, permission, seed patterns.
    - `frontend/app/admin/(quan-tri)/tenants/[id]/page.tsx`, `frontend/components/admin/tenant-detail-panel.tsx`, `frontend/lib/admin-api/tenants.ts`: existing admin tenant UI/API patterns.
    - `backend/test/admin-tenants.e2e-spec.ts`, tenant service/DTO specs, audit and permission specs: regression/test style.
  - **Existing patterns/contracts**: domain modules under `backend/src/platform`, DTO validation with global `ValidationPipe`, `@UseGuards(AccessTokenGuard, PermissionGuard)`, `@RequirePermission`, Prisma transactions, and `AuditLogger.run` for mutations. Admin API clients use `adminFetch`; UI uses `useAdminAuth`, `useHasPermission`, and permission-gated controls.
  - **Tests or checks affected**: Prisma schema/migration generation, permission seed tests, tenant detail response shape, new unit/e2e entitlement and lifecycle suites, backend build/check, and frontend lint/build.
  - **Collateral Damage**: `backend/src/platform/tenants/tenants.service.ts` may be extended for subscription detail or may consume a new service; `backend/src/app.module.ts` and `backend/prisma/seed-admin-rbac.ts` require registration/seed changes; existing tenant e2e fixtures may need subscription setup. No existing business tenant controllers currently provide a complete enforcement entrypoint, so the spec defines a reusable guard/service contract and proves it with direct service/guard integration tests.
  - **Staleness check**: `docs/project-changelog.md` confirms admin tenant/RBAC/audit are recent. `DESIGN.md` requires mobile-first, large controls, white space, existing admin shell, and Vietnamese labels. No root `README.md`, `docs/development-rules.md`, `docs/codebase-summary.md`, or `docs/code-standards.md` exists; claims are verified directly against manifests and source.
- **External / Current Research**: Skipped
  - **Rationale**: Stripe and payment-provider integration is explicitly out of scope; the requested feature uses existing Prisma/NestJS patterns and no current external API or policy is required to define the manual workflow. Security and concurrency decisions are grounded in repository patterns and requirements rather than vendor behavior.
- **Selected Decision**:
  - Add a dedicated `BillingModule` for plan/subscription admin operations and a reusable `EntitlementsModule` for effective subscription, feature, quota, and guard logic.
  - Keep lifecycle history as immutable subscription rows plus audit rows; never delete or mutate historical plan identity during a plan change.
  - Treat current effective subscription as a derived read model from non-cancelled rows, with explicit expiry evaluation at request time.
  - Use tenant feature flags as explicit overrides: `enabled=true` grants, `enabled=false` denies, absent falls back to plan membership. No override can bypass expiry/cancellation.
  - Enforce finite quotas on protected writes with an atomic transaction/conditional operation; downgrade preserves existing rows and only blocks growth beyond the new limit.
- **Rejected Alternatives**:
  - Stripe/invoice/payment implementation — explicitly deferred by the user and unnecessary for manual sales collection.
  - Hard-delete or in-place overwrite of subscriptions — destroys history and makes audit/reconciliation ambiguous.
  - Copying plan features/quotas into every subscription — duplicates mutable catalog data and makes entitlement semantics ambiguous; use effective plan relation plus immutable audit snapshots.
  - UI-only checks — bypassable by direct API calls; backend guard/service is authoritative.
- **Remaining Gaps / Questions**:
  - Current backend has no complete tenant business request controller to attach the entitlement guard to; implementation should expose a reusable guard/decorator and integrate it at the first existing protected tenant route, or add a minimal contract-test host if no route exists.
  - Existing `Subscription` rows may allow multiple active records; migration/backfill must define how duplicates are handled before enforcing one effective subscription.
- **Downstream Task & Test Implications**:
  - Add migration/backfill and seed permissions before billing endpoints.
  - Add unit tests for effective-state rules and quota evaluator, service/controller tests for lifecycle/audit, e2e permission and plan-change flows, and frontend build/lint evidence.

## Investigation Log

| Date | Question | Evidence | Decision / Impact |
|---|---|---|---|
| 2026-07-19 | Can the existing schema support manual billing? | `backend/prisma/schema.prisma` has plan, feature, join, subscription, invoice/payment, and quota fields. | Reuse existing core tables; add only fields/constraints needed for manual lifecycle/concurrency/audit semantics. |
| 2026-07-19 | How are admin mutations authorized/audited? | `tenants.controller.ts`, `permission.guard.ts`, `seed-admin-rbac.ts`, `audit-logger.service.ts`. | Reuse exact guard/decorator and `AuditLogger.run` transaction pattern. |
| 2026-07-19 | Is payment-provider research needed? | User explicitly says manual collection now and Stripe later. | Skip external research; no provider calls or invoice automation in scope. |

## Risk & Blast Radius

- **Critical**: entitlement enforcement is shared runtime logic; fail closed and keep a rollback path for migration and module registration.
- **High**: date/status edge cases can accidentally grant access; centralize the effective-state evaluator and test expiry/cancellation/time boundaries.
- **High**: concurrent quota writes can oversubscribe; use atomic transaction/conditional write and concurrency tests.
- **Medium**: existing duplicate subscriptions may not obey the new effective-state rule; report and handle duplicates without deleting data.
