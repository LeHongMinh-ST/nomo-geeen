# Task R3-01: Create tenant ui

**Requirement:** R5 — Admin UI: create tenant
**Status:** pending
**Priority:** P2
**Estimated Effort:** M
**Dependencies:** R1-01
**Spec:** specs/admin-tenant-provisioning/

## Context

- **Why**: Operators need a portal form to provision a store + owner; the backend route exists after R1-01 but has no UI.
- **Current state**: `frontend/lib/admin-api/tenants.ts` has read/update clients but no `createTenant`. `frontend/app/admin/(quan-tri)/tenants/page.tsx` + `tenant-list` render the list. `adminFetch`, `Can`, `useHasPermission` are the established patterns.
- **Target outcome**: A `admin.tenant:create`-gated "Tạo cửa hàng" flow: create form → `POST /admin/tenants` → one-time generated-password reveal → navigate to tenant detail.

## Constraints

- **MUST**: Gate the action/route with `admin.tenant:create` (`Can`/`useHasPermission`). Use `createTenant` client honoring `CreateTenantRequest`/`TenantOwnerCreatedResponse`. Vietnamese labels, ≥48px touch targets per `DESIGN.md`. Show generated password once; do not persist it. Surface backend 400/409 (`SLUG_TAKEN`, `USERNAME_TAKEN`, `PASSWORD_MODE_INVALID`) without losing entered data. Collect `seatBonus` (default 10) and required `username`.
- **SHOULD**: Client-side advisory validation for slug pattern and required username; reuse existing form/input components.
- **MUST NOT**: Optimistically show creation before the API confirms; expose the create action to users without the permission.
- **SCOPE**: Implement only R5 and the approved `scope_lock`; no subscription/plan UI at creation.

## Steps

- [ ] 1. Add `createTenant(token, body): Promise<TenantOwnerCreatedResponse>` to `frontend/lib/admin-api/tenants.ts` using `adminFetch` (`POST /admin/tenants`).
  - Business intent: typed client for provisioning.
  - Code detail: mirror existing client fns; export request/response types matching the design contracts.
  - _Requirements: 5.1_

- [ ] 2. Build `components/admin/create-tenant-form.tsx` + route `frontend/app/admin/(quan-tri)/tenants/tao/page.tsx`: tenant fields (name, slug, tenantType, optional logoUrl, `seatBonus` default 10) + owner fields (fullName, required username, optional phone/email, password or "tạo mật khẩu tự động", mustChangePassword); Vietnamese labels, ≥48px targets, advisory slug + required-username validation.
  - Business intent: collect valid provisioning input.
  - Code detail: gate route by `admin.tenant:create`; keep entered values on error; password mode is a single toggle (nhập mật khẩu / tạo tự động), never both.
  - _Requirements: 5.2, 5.3_

- [ ] 3. Add a `Can`-gated "Tạo cửa hàng" action to the tenant list surface; on submit call `createTenant`, on success reveal generated password once (if any) and navigate to `/admin/tenants/[id]`; render backend 400/409 messages inline.
  - Business intent: reachable, permission-correct entrypoint with confirmed navigation.
  - Code detail: `frontend/app/admin/(quan-tri)/tenants/*` (list/action); no optimistic success.
  - _Requirements: 5.1, 5.3, 5.4_

- [ ] 4. Verification implementation
  - Component/integration: form renders gated; submit success navigates + shows password once; 409 `SLUG_TAKEN` keeps input; hidden action without permission.
  - _Requirements: 5.1, 5.3, 5.4_

## Requirements

- 5.1 — permission-gated "Tạo cửa hàng" action → create form
- 5.2 — full tenant+owner form (incl. seatBonus, required username), VN labels, ≥48px targets
- 5.3 — client advisory validation + backend 400/409 (`SLUG_TAKEN`/`USERNAME_TAKEN`/`PASSWORD_MODE_INVALID`) surfaced without data loss
- 5.4 — one-time generated-password reveal + navigate on confirmed success

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/admin-api/tenants.ts` | Modify | Add `createTenant` client + types |
| `frontend/app/admin/(quan-tri)/tenants/tao/page.tsx` | Create | Create-tenant route (gated) |
| `frontend/components/admin/create-tenant-form.tsx` | Create | Tenant+owner form |
| `frontend/app/admin/(quan-tri)/tenants/page.tsx` | Modify | Add `Can`-gated "Tạo cửa hàng" action |

## Completion Criteria

- [ ] "Tạo cửa hàng" visible only with `admin.tenant:create`; leads to the create form (R5.1).
- [ ] Form collects all tenant+owner fields with VN labels and ≥48px targets (R5.2).
- [ ] Backend `SLUG_TAKEN`/`USERNAME_TAKEN`/`PASSWORD_MODE_INVALID` shown inline without losing entered data (R5.3).
- [ ] On confirmed success, generated password shown once and UI navigates to tenant detail — no optimistic render (R5.4).

## Evidence

This section is both the task-level test plan and the proof checklist. Keep it short, exact, and executable.

- [ ] Automated verification (component/integration)
  - Command(s): `cd frontend && pnpm build && pnpm test -- create-tenant-form`
  - Expected proof: gated render, success navigation, and 409-preserves-input cases pass; exit 0.
- [ ] Artifact / runtime verification
  - Inspect: `/admin/tenants/tao` route + success screen state.
  - Expect: password revealed exactly once; detail navigation occurs only after 201.
- [ ] Runtime reachability verification
  - Entrypoint/caller: action mounted in `frontend/app/admin/(quan-tri)/tenants/page.tsx`.
  - Expect: route reachable from the tenant list for permitted operators (end-to-end in R4-02).
- [ ] Contract / negative-path verification
  - Check: operator without permission; submit with taken slug; submit with empty username; submit with both password + auto-generate.
  - Expect: action hidden / inline 409 `SLUG_TAKEN` / advisory error / 400 `PASSWORD_MODE_INVALID`, entered data preserved.
- [ ] Accessibility check
  - Check: keyboard focus order, input labels/ARIA, ≥48px targets.
  - Expect: form fully keyboard-operable with labeled inputs.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Generated password shown more than once / persisted | High | Reveal once from response in memory; never store |
| Create action leaks to unauthorized operators | Medium | `Can`/`useHasPermission` gate on action and route |
| Data loss on validation error | Low | Preserve form state; render errors inline |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
