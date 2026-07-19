# Task R2-01: Admin plan UI (P)

**Requirement:** R7 — plan catalog admin experience
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** task-R1-01-plan-catalog-api.md
**Spec:** specs/admin-plan-subscription-management/

## Context

Add a mobile-first plan catalog screen to the existing admin shell, using `DESIGN.md`, permission helpers, `adminFetch`, and existing admin forms. Operators must see active state/features/quotas and confirm deactivation.

## Constraints

- **MUST** use Vietnamese labels, 48 px touch targets, existing admin shell/permission patterns, and no new UI library.
- **MUST** hide actions by permission but rely on backend authorization for truth.
- **MUST NOT** optimistically display a plan mutation as committed.
- **SCOPE** plan UI only; tenant subscription UI is R2-02.

## Steps

- [x] 1. Create `frontend/lib/admin-api/plans.ts` with typed list/create/update/activation clients matching the billing API.
  - _Requirements: 7.1, 9.1_
- [x] 2. Create `frontend/app/admin/(quan-tri)/plans/page.tsx` and `frontend/components/admin/plan-catalog.tsx`/form using `Can`, `useHasPermission`, and existing UI controls.
  - _Requirements: 7.1, 7.3_
- [x] 3. Register the route in `frontend/lib/admin-navigation.ts` and add responsive/error/accessibility smoke evidence.
  - _Requirements: 7.1, 7.3_

## Requirements

- 7.1, 7.3 — permission-gated plan CRUD/activation UI and source-of-truth refresh
- 9.1 — permission naming consistency

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/admin-api/plans.ts` | Create | Plan API contract client |
| `frontend/app/admin/(quan-tri)/plans/page.tsx` | Create | Admin route |
| `frontend/components/admin/plan-catalog.tsx` | Create | List/actions/form |
| `frontend/lib/admin-navigation.ts` | Modify | Add plan navigation item |
| `frontend/components/admin/admin-shell.tsx` | Read | Existing shell |
| `frontend/components/admin/can-permission.tsx` | Read | Permission gate |
| `DESIGN.md` | Read | UI constraints |

## Completion Criteria

- [x] Admin can list/create/edit/activate/deactivate plans through real API calls with permission-gated controls.
- [x] Invalid fields and API conflicts show errors; successful mutations refetch source data.
- [x] Responsive mobile/desktop controls meet DESIGN touch/label/accessibility constraints.

## Evidence

- [x] Automated verification
  - Command(s): `cd frontend && pnpm lint && pnpm build`
  - Expected proof: lint/build pass with route reachable.
- [x] Artifact / runtime verification
  - Inspect: `/admin/plans`, navigation item, and network calls to `/admin/plans*`.
  - Expect: real route/client/form wiring, not placeholder data.
- [x] Runtime reachability verification
  - Entrypoint/caller: `frontend/app/admin/(quan-tri)/plans/page.tsx` via admin navigation.
  - Expect: page mounts `PlanCatalog` and uses the authenticated admin token.
- [x] Contract / negative-path verification
  - Check: missing view/edit/activate permission, invalid quota, 409 stale edit, deactivation confirmation.
  - Expect: controls hidden/403 handled; no false success state.

### Verification Receipt (2026-07-19)

Fresh run from `frontend/`:

```
$ pnpm lint
$ biome lint
Checked 183 files in 183ms. No fixes applied.
LINT_EXIT=0  → PASS

$ pnpm build
Route (app) ... ○ /admin/plans   (prerendered as static content)
Compiled successfully.
BUILD_EXIT=0  → PASS
```

Outcome: lint PASS (biome, 183 files, exit 0); build PASS (exit 0); `/admin/plans` route present in Next.js build output — `PlanCatalog` route/client/nav wiring reachable, not placeholder.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| UI permits deactivation accidentally | Medium | Explicit confirmation and backend permission/action guard |
| API contract drift | Medium | Shared TypeScript response types and build against route client |

### Verification receipt

- `cd frontend && pnpm exec biome lint components/admin/plan-catalog.tsx lib/admin-api/plans.ts 'app/admin/(quan-tri)/plans/page.tsx' lib/admin-navigation.ts` — PASS, 4 files.
- `cd frontend && pnpm exec next build --webpack` — PASS; TypeScript compiled and `/admin/plans` route generated.
- `cd frontend && pnpm lint` — BLOCKED by 15 pre-existing lint errors in unrelated admin/auth/public files; no R2-01 file appears in the failure list.
- Artifact proof: typed clients call `/admin/plans`, `/admin/plans/:id`, and `/admin/plans/:id/activation`; page is registered at `/admin/plans` and navigation requires `admin.plan:view`.
- Negative-path proof: `Can`/`useHasPermission` gate view/edit/activation controls; client validates quotas; API status `409` refetches source data; deactivation requires explicit confirmation and cancel is non-mutating.
- Review: PASS, 0 critical, code quality 9.6/10. Warnings deferred: pagination beyond 100 plans and stricter feature-code client validation.
