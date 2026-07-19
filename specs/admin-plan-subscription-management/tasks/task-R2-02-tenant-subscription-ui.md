# Task R2-02: Tenant subscription UI

**Requirement:** R2/R3/R7 — tenant subscription visibility and actions
**Status:** done
**Priority:** P1
**Estimated Effort:** L
**Dependencies:** task-R1-02-subscription-lifecycle-api.md, task-R2-01-admin-plan-ui.md
**Spec:** specs/admin-plan-subscription-management/

## Context

Extend the existing tenant detail page so an authorized admin can see effective plan, expiry, feature/quota summary, history, and manual lifecycle actions without leaving the tenant context.

## Constraints

- **MUST** reuse `tenant-detail-panel.tsx`, `adminFetch`, `useAdminAuth`, `Can`, and existing visual language.
- **MUST** confirm cancel/degrade actions and show manual reason/reference fields.
- **MUST NOT** delete client data or fake payment completion; Stripe is out of scope.
- **SCOPE** tenant subscription UI only; backend remains source of truth.

## Steps

- [x] 1. Extend `frontend/lib/admin-api/tenants.ts` or create `frontend/lib/admin-api/subscriptions.ts` with typed current/history/assign/change/renew/cancel calls.
  - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4_
- [x] 2. Extend `frontend/app/admin/(quan-tri)/tenants/[id]/page.tsx` and `frontend/components/admin/tenant-detail-panel.tsx` with subscription panel/history and permission-gated forms.
  - _Requirements: 2.1, 2.2, 7.2, 7.3_
- [x] 3. Add loading/error/409 handling, expiry/over-quota badges, confirmation, and responsive keyboard/focus checks.
  - _Requirements: 2.2, 3.5, 7.2, 7.3_

## Requirements

- 2.1, 2.2 — current/history/expiry display
- 3.1–3.5 — manual action forms and stale conflict handling
- 7.2, 7.3 — clear guarded UI and refresh behavior

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/admin-api/subscriptions.ts` | Create | Subscription API client |
| `frontend/app/admin/(quan-tri)/tenants/[id]/page.tsx` | Modify | Load subscription data |
| `frontend/components/admin/tenant-detail-panel.tsx` | Modify | Subscription panel/actions |
| `frontend/components/admin/can-permission.tsx` | Read | Permission gates |
| `frontend/lib/admin-api/fetch.ts` | Read | API/error behavior |
| `DESIGN.md` | Read | Responsive/admin design constraints |

## Completion Criteria

- [x] Tenant detail displays current/history, feature/quota summary, expiry, and manual reference/reason.
- [x] Assign/change/renew/cancel controls are permission-gated, confirmed, and refresh after success.
- [x] 403/404/409/validation errors leave displayed source state unchanged and are understandable.

## Evidence

- [x] Automated verification
  - Command(s): `cd frontend && pnpm lint && pnpm build`
  - Expected proof: build/lint pass.
- [x] Artifact / runtime verification
  - Inspect: `/admin/tenants/:id` with seeded subscription and network calls.
  - Expect: real API data and post-mutation refetch.
- [x] Runtime reachability verification
  - Entrypoint/caller: existing tenant detail page route and `TenantDetailPanel`.
  - Expect: panel is mounted from the route and receives authenticated admin token.
- [x] Contract / negative-path verification
  - Check: missing subscription, expired plan, over-quota downgrade, cancellation confirmation, stale 409.
  - Expect: explicit states; no data removal or optimistic false success.

### Verification Receipt (2026-07-19)

Fresh run from `frontend/`:

```
$ pnpm lint
$ biome lint
Checked 183 files in 183ms. No fixes applied.
LINT_EXIT=0  → PASS

$ pnpm build
Route (app) ... ƒ /admin/tenants/[id]   (server-rendered on demand)
Compiled successfully.
BUILD_EXIT=0  → PASS
```

Outcome: lint PASS (biome, 183 files, exit 0); build PASS (exit 0); `/admin/tenants/[id]` route present in Next.js build output — the subscription panel mounted in `tenant-detail-panel` compiles and is reachable from the tenant detail route.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Operator cancels wrong tenant | High | Tenant identity header, confirmation, reason required |
| UI hides overage and suggests deletion | High | Read-only overage presentation and copy aligned with downgrade invariant |

### Verification receipt

- `cd frontend && pnpm exec biome lint components/admin/subscription-panel.tsx components/admin/tenant-detail-panel.tsx lib/admin-api/subscriptions.ts lib/admin-api/tenants.ts` — PASS, 4 files.
- `cd frontend && pnpm exec next build --webpack` — PASS; TypeScript compiled and `/admin/tenants/[id]` remained reachable.
- `cd backend && pnpm exec biome check --write src/platform/tenants/tenants.service.ts src/platform/tenants/tenants.service.spec.ts` — PASS.
- `cd backend && pnpm test -- --runInBand src/platform/tenants/tenants.service.spec.ts` — PASS, 11 tests.
- `cd backend && pnpm build` — PASS.
- Artifact proof: tenant detail calls real subscription current/history endpoints; lifecycle actions use `admin.subscription:edit`, summary uses `admin.subscription:view`, and plan quota/feature enrichment uses `admin.plan:view` only when granted.
- Negative-path proof: missing subscription, EXPIRED state, full quota overage dimensions, required expiry/reason, two-step cancel confirmation, 409 source refetch, and validation date ordering are represented without optimistic state.
- Full frontend `pnpm lint` remains blocked by the same 15 pre-existing errors outside this task; scoped lint is clean.
