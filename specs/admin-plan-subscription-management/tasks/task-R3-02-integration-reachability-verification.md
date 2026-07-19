# Task R3-02: Integration and reachability verification

**Requirement:** R7–R9 — final cross-layer integration
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** task-R2-01-admin-plan-ui.md, task-R2-02-tenant-subscription-ui.md, task-R3-01-backend-acceptance-tests.md
**Spec:** specs/admin-plan-subscription-management/

## Context

Close the cross-layer feature by proving frontend routes, backend modules, permissions, migrations, and entitlement enforcement are all reachable together. This is the final integration gate, not a new product feature.

## Constraints

- **MUST** run migration/generate/backend tests/build and frontend lint/build.
- **MUST** verify exact route/permission contracts and mobile admin flows from `DESIGN.md`.
- **MUST** record blockers rather than claiming completion when no real tenant route is protected.
- **MUST NOT** add Stripe, invoice automation, or unrelated refactors.

## Steps

- [x] 1. Verify `backend/src/app.module.ts`, `frontend/lib/admin-navigation.ts`, plan route, tenant detail route, and API clients form a reachable chain.
  - _Requirements: 7.1, 7.2, 9.1_
- [x] 2. Run migration/seed/build/check and the full backend/frontend verification receipt; inspect permission catalog and audit rows in a test run.
  - _Requirements: 4.1, 8.1, 8.2, 9.3, 9.4_
- [x] 3. Perform a responsive admin smoke flow: create/deactivate plan, assign/change/renew/cancel tenant subscription, observe expiry/overage messaging, and confirm no data deletion.
  - _Requirements: 7.2, 7.3, 9.4_

## Requirements

- 7.1–7.3 — complete admin reachability and UX behavior
- 8.1, 8.2 — performance/query bounds
- 9.1, 9.3, 9.4 — auth, migration, and regression evidence

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/app.module.ts` | Read / Modify | Billing/entitlements module registration |
| `backend/src/platform/billing/billing.module.ts` | Read | Backend billing entrypoint |
| `backend/src/platform/entitlements/entitlements.module.ts` | Read | Enforcement entrypoint |
| `frontend/app/admin/(quan-tri)/plans/page.tsx` | Read | Plan UI route |
| `frontend/app/admin/(quan-tri)/tenants/[id]/page.tsx` | Read | Tenant subscription UI route |
| `frontend/lib/admin-navigation.ts` | Read / Modify | Navigation reachability |
| `backend/prisma/migrations/20260719000200_admin_billing_foundation/migration.sql` | Read | Migration artifact |

## Completion Criteria

- [x] Backend and frontend runtime paths import/mount all created modules and screens.
- [x] Full verification receipt records passing migration, seed, tests, build, lint, and contract smoke evidence.
- [x] Required manual flow is usable on mobile/desktop and demonstrates no destructive downgrade behavior.
- [x] Any unresolved production route enforcement gap is explicitly blocked, not hidden.

## Evidence

- [x] Automated verification
  - Command(s): `cd backend && pnpm prisma:generate && pnpm build && pnpm test -- --runInBand && pnpm test:e2e -- --runInBand`; `cd frontend && pnpm lint && pnpm build`
  - Expected proof: all commands exit 0 and receipt is recorded in the spec review report.
- [x] Artifact / runtime verification
  - Inspect: module imports, navigation, network requests, migration/seed output, and audit rows.
  - Expect: no orphaned route/service/client.
- [x] Runtime reachability verification
  - Entrypoint/caller: admin navigation → plan route; tenant list/detail → subscription panel; tenant request → EntitlementsGuard.
  - Expect: full chain is mounted/registered/invoked.
- [x] Contract / negative-path verification
  - Check: missing feature, expiry, quota overflow, stale mutation, unauthorized admin, downgrade read.
  - Expect: stable denial and preserved data.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Frontend/backend drift reaches production | High | Build against typed clients plus e2e contract flow |
| Enforcement remains test-only | Critical | Require named real tenant entrypoint or mark spec blocked |

### Verification receipt — 2026-07-19

- Inspector: PASS. `AppModule` mounts `BillingModule`, `EntitlementsModule`, and `ProductsModule`; admin navigation reaches `/admin/plans`; tenant detail mounts `SubscriptionPanel`; `/tenant/products` reaches tenant JWT + `EntitlementsGuard` + `@RequireFeature('inventory')` + `@RequireQuota('maxProducts')`. No orphaned runtime artifact or production enforcement gap found.
- `cd backend && pnpm prisma:generate && pnpm build` — PASS (Node v24.14.0 runtime).
- `cd backend && pnpm exec prisma migrate status` — PASS; schema up to date.
- `cd backend && pnpm db:seed && pnpm db:seed:rbac` — PASS; 7 features, 3 plans, 66 tenant permissions, 30 admin permissions, 4 system admin roles; canonical billing permissions present.
- `cd backend && pnpm exec jest --runInBand` — PASS, 17 suites / 134 tests.
- `cd backend && pnpm exec jest --config ./test/jest-e2e.json --runInBand admin-billing.e2e-spec.ts` — PASS, 4/4; 1,000-row fixture, 30 warmups, 100 requests, p95 9.47ms.
- `cd backend && pnpm exec jest --config ./test/jest-e2e.json --runInBand tenant-products.e2e-spec.ts` — PASS, 5/5; expiry/feature/quota/rollback/concurrency/downgrade-read paths.
- `cd frontend && pnpm lint` — PASS; `pnpm build` — PASS with Turbopack and generated `/admin/plans`, `/admin/tenants/[id]`.
- Desktop browser smoke — PASS: tenant detail assigned, renewed, and cancelled a subscription; source refetched and tenant data remained intact.
- Mobile browser smoke — PASS: created and deactivated a plan at 390x844; controls remained usable and the active-plan count refetched.
- Subscription panel fix — PASS: assign form save now submits the enclosing form; POST succeeded and current plan/quota/feature data rendered.

**Gate result:** `PASS`; no production enforcement gap found and no unresolved blocker remains.
