# Task R3-02: Tenant users panel ui

**Requirement:** R6 — Admin UI: tenant user management
**Status:** pending
**Priority:** P2
**Estimated Effort:** L
**Dependencies:** R2-01
**Spec:** specs/admin-tenant-provisioning/

## Context

- **Why**: Operators need to manage a store's users and see seat usage from the tenant detail page; the backend module exists after R2-01 but has no UI.
- **Current state**: `frontend/app/admin/(quan-tri)/tenants/[id]/page.tsx` renders tenant detail via `tenant-detail-panel`. No tenant-users client or panel. `adminFetch`, `Can`, `useHasPermission` established.
- **Target outcome**: A `admin.tenant-user:view`-gated users panel inside tenant detail with permission-gated actions, seat usage display, and clear seat/last-owner/cross-tenant error states.

## Constraints

- **MUST**: Gate panel with `admin.tenant-user:view`; gate every mutating action with `admin.tenant-user:manage` via `Can`. Show `SeatUsage` (`activeCount / effectiveMaxUsers`). Confirm destructive actions. Refetch source data after successful mutation. Surface `SEAT_LIMIT_REACHED`, `LAST_OWNER`, `FIELD_NOT_ALLOWED`, cross-tenant/validation errors explicitly; leave displayed data unchanged on failure.
- **SHOULD**: Reuse `admin-users` table/action UI patterns and existing dialog/confirm components; new `tenant-users.ts` client via `adminFetch`. Role change uses the separate `PATCH :userId/role` endpoint, not the field-edit form.
- **MUST NOT**: Mutate local list optimistically without refetch; expose actions the operator lacks permission for.
- **SCOPE**: Implement only R6 and the approved `scope_lock`; no plan assignment UI.

## Steps

- [ ] 1. Add `frontend/lib/admin-api/tenant-users.ts` client: `listTenantUsers`, `createTenantUser`, `updateTenantUser` (whitelisted fields), `changeTenantUserRole`, `deactivateTenantUser`, `reactivateTenantUser`, `resetTenantUserPassword` (all via `adminFetch`, honoring `TenantUserPublic`/`SeatUsage`).
  - Business intent: typed client for tenant-user management.
  - Code detail: mirror `tenants.ts`; export contract types; role change is its own call to `PATCH :userId/role`.
  - _Requirements: 6.1, 6.2_

- [ ] 2. Build `components/admin/tenant-users-panel.tsx` mounted in `tenants/[id]/page.tsx` under `tenant-detail-panel`: list users (role, status, identifiers, last login) gated by `admin.tenant-user:view`; show `SeatUsage` header with a clear message when seats are exhausted.
  - Business intent: visible roster + seat state on the store page.
  - Code detail: gate render with `useHasPermission`; VN labels, ≥48px targets per `DESIGN.md`.
  - _Requirements: 6.1, 6.3_

- [ ] 3. Wire `admin.tenant-user:manage`-gated actions (create, edit, change role, deactivate/reactivate, reset password) with `Can`; confirm destructive ones; refetch after success; render `SEAT_LIMIT_REACHED`/`LAST_OWNER`/`FIELD_NOT_ALLOWED`/cross-tenant/validation errors as explicit states leaving data unchanged.
  - Business intent: complete lifecycle management with correct authz and error clarity.
  - Code detail: reset-password reveals one-time plaintext and notes the user must change it on next login; seat-full message blocks create clearly.
  - _Requirements: 6.2, 6.3, 6.4_

- [ ] 4. Verification implementation
  - Component/integration: panel gated; action visibility by permission; seat-full blocks create with message; last-owner deactivate shows `LAST_OWNER`; mutation triggers refetch.
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

## Requirements

- 6.1 — `admin.tenant-user:view`-gated user list with role/status/identifiers/last login
- 6.2 — `admin.tenant-user:manage`-gated actions, confirm-destructive, refetch after mutation
- 6.3 — seat usage display + clear `SEAT_LIMIT_REACHED` message when seats exhausted
- 6.4 — explicit `LAST_OWNER`/`FIELD_NOT_ALLOWED`/cross-tenant/validation error states, data unchanged on failure

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/admin-api/tenant-users.ts` | Create | Tenant-user client + types |
| `frontend/components/admin/tenant-users-panel.tsx` | Create | Users panel with seat usage + actions |
| `frontend/app/admin/(quan-tri)/tenants/[id]/page.tsx` | Modify | Mount panel in tenant detail |

## Completion Criteria

- [ ] Panel visible only with `admin.tenant-user:view`; lists users with role/status/identifiers/last login (R6.1).
- [ ] Each action gated by its permission; destructive actions confirmed; source refetched after success (R6.2).
- [ ] Seat usage `activeCount/effectiveMaxUsers` shown (effective = plan `maxUsers` when an ACTIVE/TRIALING subscription exists, else `0`, plus `seatBonus`); seat-full blocks create with a clear message (R6.3).
- [ ] `LAST_OWNER`, `FIELD_NOT_ALLOWED`, cross-tenant, and validation errors surfaced explicitly; displayed data unchanged on failure (R6.4).

## Evidence

This section is both the task-level test plan and the proof checklist. Keep it short, exact, and executable.

- [ ] Automated verification (component/integration)
  - Command(s): `cd frontend && pnpm build && pnpm test -- tenant-users-panel`
  - Expected proof: gated render, action-visibility, seat-full, and last-owner cases pass; exit 0.
- [ ] Artifact / runtime verification
  - Inspect: tenant detail page with the panel; seat header value; post-mutation refetch.
  - Expect: `SeatUsage` matches backend; list refreshes after create/deactivate.
- [ ] Runtime reachability verification
  - Entrypoint/caller: panel imported in `frontend/app/admin/(quan-tri)/tenants/[id]/page.tsx`.
  - Expect: panel renders inside tenant detail for permitted operators (end-to-end in R4-02).
- [ ] Contract / negative-path verification
  - Check: create at seat cap; deactivate last owner; operator missing an action permission.
  - Expect: seat-full message / `LAST_OWNER` state / hidden action, displayed data unchanged.
- [ ] Accessibility check
  - Check: keyboard operability of table actions, labeled controls, ≥48px targets.
  - Expect: actions reachable via keyboard with accessible names.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Stale list after mutation | Medium | Refetch source data on every successful mutation |
| Unauthorized action exposure | Medium | `Can` gate per action + backend permission gate |
| Confusing seat-exhausted state | Low | Explicit `SEAT_LIMIT_REACHED` message showing `activeCount/effectiveMaxUsers` and that `seatBonus`/plan raises the cap |
| Field-edit form used for role change | Medium | Role change routed to separate `PATCH :userId/role`; field edits reject `FIELD_NOT_ALLOWED` |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
