# Task R2-01: Tenant users management api

**Requirement:** R3 — Tenant user management (backend); R8 — NFRs
**Status:** in_progress
**Priority:** P1
**Estimated Effort:** L
**Dependencies:** R0-01, R1-01
**Spec:** specs/admin-tenant-provisioning/

## Context

- **Why**: After a store exists, operators must manage its users (list/create/edit/role/deactivate/reactivate/reset password) under a seat limit, distinct from `admin-users`.
- **Current state**: No tenant-user module. `backend/src/platform/admin-users/admin-users.controller.ts` is the CRUD reference pattern. Seat inputs exist: `plan.maxUsers`, `tenant.seatBonus`, `user.status`; `@@unique([tenantId, username])` on `user`.
- **Target outcome**: New `TenantUsersController`/`TenantUsersService` under `admin/tenants/:tenantId/users` with seat enforcement, last-owner protection, cross-tenant 404, and `SeatUsage` on the list.

## Constraints

- **MUST**: Enforce `effective_max_users = (activeSubscription?.plan.maxUsers ?? 0) + tenant.seatBonus` where `activeSubscription.status IN (ACTIVE, TRIALING)`, `active_count = users status = ACTIVE`; block create/reactivate with 409 `SEAT_LIMIT_REACHED` when full. Run seat + last-owner checks inside a serializable transaction with the mutation (no TOCTOU). Protect last active OWNER (409 `LAST_OWNER`). Assert `:userId ∈ :tenantId` (else 404); reject out-of-scope tenant for scoped operators (403). PATCH edit uses a strict field whitelist (reject `tenantId/status/roleId/roleCode/passwordHash` → 400 `FIELD_NOT_ALLOWED`); role change is a separate endpoint. Reset-password forces `mustChangePassword=true`. Honor `TenantUserPublic` + `SeatUsage` contracts. Never return `passwordHash`.
- **SHOULD**: Reuse `PasswordService`, `AuditLogger` (tx-client method), and admin-users validation; reuse existing audit enum values for edit/deactivate/reactivate/reset where semantically correct (only `TENANT_CREATE`/`USER_CREATE` are newly added).
- **MUST NOT**: Invent new audit enum values beyond R0-01; allow cross-tenant access; count `DISABLED` users toward seats; permit mass assignment via PATCH.
- **SCOPE**: Implement only R3 and the approved `scope_lock`; no plan assignment, no hard delete. Permissions are `admin.tenant-user:{view, manage}` (view = GET; manage = all mutations).

## Steps

- [ ] 1. Create `TenantUsersModule`, `TenantUsersController` (`@Controller('admin/tenants/:tenantId/users')`), and `TenantUsersService`; register the module in `backend/src/app.module.ts`.
  - Business intent: expose tenant-user management as a reachable, guarded module.
  - Code detail: `backend/src/platform/tenant-users/*`; GET gated `@RequirePermission('admin.tenant-user:view')`, all mutations gated `@RequirePermission('admin.tenant-user:manage')`; assert `:userId ∈ :tenantId` and operator tenant-scope on every handler.
  - _Requirements: 3.1, 3.7_

- [ ] 2. Implement `GET ``` (list + `SeatUsage`) and `POST ``` (create): create applies R2.5–R2.7 rules (required username, password discriminated union), seat check inside a serializable tx, `USER_CREATE` audit; list returns paginated `TenantUserPublic` (≤100/page) plus `SeatUsage` (`activeCount` = ACTIVE only, `effectiveMaxUsers` from ACTIVE/TRIALING subscription).
  - Business intent: view roster + seat state, add users within the seat limit.
  - Code detail: seat query uses `@@index([tenantId, status])`; map `P2002 (tenantId,username)` → 409 `USERNAME_TAKEN`; seat count re-read inside the create tx to prevent overrun.
  - _Requirements: 3.1, 3.2, 3.3, 8.3_

- [ ] 3. Implement `PATCH :userId` (whitelisted `fullName/username/phone/email` only — reject others 400 `FIELD_NOT_ALLOWED`), `PATCH :userId/role` (role within `{OWNER,MANAGER,STAFF}`, separate endpoint), `POST :userId/deactivate`, `POST :userId/reactivate` (seat re-check in tx), `POST :userId/reset-password` (one-time reveal, forces `mustChangePassword=true`). Each asserts `:userId ∈ :tenantId` (404); last-owner guard under a serializable tx blocks removing/demoting/deactivating the final active OWNER (409 `LAST_OWNER`).
  - Business intent: full lifecycle management without breaking the store's ownership invariant or leaking privilege.
  - Code detail: last-owner guard counts active OWNERs inside the mutating tx before DISABLED/role-away; reactivate re-runs seat check → 409 `SEAT_LIMIT_REACHED`; role change is not reachable via the field-edit endpoint.
  - _Requirements: 3.4, 3.5, 3.6, 3.7_

- [ ] 4. Verification implementation
  - Integration/e2e: seat full → 409 on create and on reactivate; last owner deactivate/demote → 409 `LAST_OWNER`; cross-tenant `:userId` → 404; PATCH with `roleId`/`status` → 400 `FIELD_NOT_ALLOWED`; reset forces `mustChangePassword`.
  - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7_

## Requirements

- 3.1 — paginated tenant user list, public shape, no `passwordHash`
- 3.2 — create tenant user (role in OWNER/MANAGER/STAFF) + `USER_CREATE` audit
- 3.3 — seat enforcement, 409 `SEAT_LIMIT_REACHED`
- 3.4 — whitelisted field edit + separate role-change endpoint / deactivate / reactivate / reset with audit
- 3.5 — last active OWNER protection under serializable tx, 409 `LAST_OWNER`
- 3.6 — deactivate frees seat; reactivate re-checks seat in tx
- 3.7 — `admin.tenant-user:{view,manage}` gating + cross-tenant 404 + operator scope 403
- 8.3 — indexed seat/list queries, paginated ≤100/page

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/tenant-users/tenant-users.module.ts` | Create | New module |
| `backend/src/platform/tenant-users/tenant-users.controller.ts` | Create | Routes under `admin/tenants/:tenantId/users` |
| `backend/src/platform/tenant-users/tenant-users.service.ts` | Create | Seat/last-owner/cross-tenant logic + CRUD |
| `backend/src/platform/tenant-users/dto/*.ts` | Create | Create/update(whitelist)/role-change/reset DTOs |
| `backend/src/app.module.ts` | Modify | Register `TenantUsersModule` |

## Completion Criteria

- [ ] List returns `TenantUserPublic[]` + `SeatUsage`, no `passwordHash`, paginated ≤100 (R3.1, R8.1, R8.3).
- [ ] Create/reactivate blocked with 409 `SEAT_LIMIT_REACHED` when `active_count >= effective_max_users` (checked in tx) (R3.3, R3.6).
- [ ] Last active OWNER cannot be deactivated/demoted (409 `LAST_OWNER`); state unchanged (R3.5).
- [ ] Cross-tenant `:userId` → 404; PATCH rejects non-whitelisted fields (400 `FIELD_NOT_ALLOWED`); every route permission-gated; module registered and reachable (R3.4, R3.7, R7.1).

## Evidence

This section is both the task-level test plan and the proof checklist. Keep it short, exact, and executable.

- [ ] Automated verification (integration/e2e)
  - Command(s): `cd backend && pnpm build && pnpm test:e2e -- tenant-users`
  - Expected proof: seat, last-owner, cross-tenant, and permission cases pass; exit 0.
- [ ] Artifact / runtime verification
  - Inspect: `GET /admin/tenants/:id/users` response; DB `user.status` transitions after deactivate/reactivate.
  - Expect: `SeatUsage.activeCount/effectiveMaxUsers` correct (activeCount = ACTIVE only); DISABLED excluded from `activeCount`; plan-less tenant uses `seatBonus` for seats.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `TenantUsersModule` imported in `backend/src/app.module.ts`.
  - Expect: routes resolve over HTTP with an authenticated admin token (end-to-end in R4-02).
- [ ] Contract / negative-path verification
  - Check: create at seat cap; deactivate last owner; `:userId` from another tenant; reactivate when full.
  - Expect: 409 `SEAT_LIMIT_REACHED` / 409 `LAST_OWNER` / 404 / 409, each leaving state unchanged.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Cross-tenant / out-of-scope user manipulation | High | `:userId ∈ :tenantId` → 404; operator tenant-scope → 403 on every handler |
| Removing the last owner orphans the store | High | Last-owner guard counts active OWNERs inside a serializable tx before mutation |
| Seat / last-owner race under concurrency (TOCTOU) | High | Check+mutate in one serializable tx; 409 on overflow |
| Mass assignment via PATCH | High | Strict field whitelist; role change is a separate endpoint |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
