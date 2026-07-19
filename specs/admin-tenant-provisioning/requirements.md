# Requirements — admin-tenant-provisioning

## Overview

Enable platform operators (SUPER_ADMIN / SALER) to provision a new store (Tenant) together with its first OWNER user in one transactional action from the admin portal, and to manage the tenant's users (list/create/edit/change role/deactivate/reactivate/reset password) under a seat limit. Subscription/plan assignment is deliberately deferred to the existing subscription flow.

Canonical language: English. Response/UI language: Tiếng Việt (labels).

---

## R1 — Transactional tenant + owner creation (backend)

- **R1.1** When an authorized admin sends `POST /admin/tenants` with valid tenant fields and valid first-owner fields, the system SHALL create the Tenant and one OWNER `user` inside a single database transaction and return the created tenant plus the owner's public shape (never `passwordHash`).
- **R1.2** If any step of the creation transaction fails (e.g. owner insert, unique violation), the system SHALL roll back the entire transaction so that no Tenant, user, or audit row is persisted.
- **R1.3** The system SHALL require the request to carry the `admin.tenant:create` permission; a caller without it SHALL receive 403 and no data SHALL be written.
- **R1.4** Within the same creation transaction the system SHALL seed three per-tenant role rows (`OWNER`, `MANAGER`, `STAFF`) with `tenantId = <new tenant>`, cloning their permission grants from the corresponding system role templates, and SHALL link the first OWNER user to the newly-seeded per-tenant `OWNER` role.
- **R1.5** The system SHALL always create a NEW owner user for the tenant; it SHALL NOT accept a reference to an existing user as owner.
- **R1.6** On successful creation the system SHALL write audit rows `TENANT_CREATE` and `USER_CREATE` recording actor id, actor role code, tenant id, created user id, IP, and user-agent, within the same transaction boundary as the creation.

## R2 — Tenant & owner input validation (backend contract)

- **R2.1** The system SHALL require `name` (1–200 chars) and `slug` for the tenant; `slug` SHALL be normalized to lowercase and match `^[a-z0-9]+(?:-[a-z0-9]+)*$` (3–63 chars). The system SHALL accept an optional `seatBonus` integer (1–999, default `10`) so a plan-less store has usable seats at creation.
- **R2.2** When the requested `slug` already exists (case-insensitive, including soft-deleted), the system SHALL reject with 409 `SLUG_TAKEN` and SHALL NOT create anything.
- **R2.3** The system SHALL accept `tenantType` from the `TenantType` enum (default `HOUSEHOLD`) and SHALL derive `mode` server-side (`HOUSEHOLD`/`RETAIL_DEALER` → `SIMPLE`; others → `SIMPLE` in Phase 1) rather than accepting a client-supplied mode.
- **R2.4** The system SHALL accept an optional `logoUrl` restricted to HTTPS and non-private hosts (reusing the existing tenant logo validation rule), else reject with 400.
- **R2.5** The system SHALL require owner `fullName` (1–200) and `username` (the `user.username` column is NOT NULL); `username` SHALL be unique within the new tenant (DB-enforced `@@unique([tenantId, username])`); `phone`/`email` are optional. Violating uniqueness SHALL return 409 `USERNAME_TAKEN` with no partial write.
- **R2.6** The system SHALL accept password input as a discriminated union `{ mode: 'provided'; password }` XOR `{ mode: 'generate' }` and SHALL reject payloads that supply neither or both with 400 `PASSWORD_MODE_INVALID`; a provided `password` SHALL satisfy the min-length policy identical to existing admin create; when generating, the system SHALL return the generated plaintext exactly once in the creation response and SHALL never store or log it in plaintext.
- **R2.7** The system SHALL accept an optional `mustChangePassword` boolean (default `false`) and persist it on the owner user.

## R3 — Tenant user management (backend)

- **R3.1** When an authorized admin sends `GET /admin/tenants/:tenantId/users` (paginated), the system SHALL return that tenant's users (public shape, no `passwordHash`) with `fullName`, identifiers, role code, status, and `lastLoginAt`.
- **R3.2** When an authorized admin sends `POST /admin/tenants/:tenantId/users`, the system SHALL create a user in that tenant with role in `{OWNER, MANAGER, STAFF}`, applying the same identifier/password rules as R2.5–R2.7, and SHALL write `USER_CREATE` audit.
- **R3.3** The system SHALL enforce seats on user creation: with `effective_max_users = (active_subscription.plan.maxUsers ?? 0) + tenant.seatBonus` (where `active_subscription` is the tenant's subscription whose `status IN (ACTIVE, TRIALING)`, most-recent when several) and `active_count = users where status = ACTIVE`, creation SHALL be rejected with 409 `SEAT_LIMIT_REACHED` when `active_count >= effective_max_users`.
- **R3.4** The system SHALL allow editing a user's `fullName`/identifiers via a strict field whitelist (only `fullName`, `username`, `phone`, `email`; requests carrying `tenantId`, `status`, `roleId`, `roleCode`, or `passwordHash` SHALL be rejected 400 `FIELD_NOT_ALLOWED`), SHALL expose changing role within `{OWNER, MANAGER, STAFF}` as a **separate** endpoint gated by its own `admin.tenant-user:manage` permission, SHALL allow deactivation (`status=DISABLED`) and reactivation (`status=ACTIVE`), and SHALL allow password reset, each writing the corresponding audit action.
- **R3.5** The system SHALL block deactivating, deleting, or role-demoting the tenant's **last active OWNER**, returning 409 `LAST_OWNER` and leaving state unchanged. The last-owner check and the mutation SHALL execute under a single serializable transaction (or equivalent row lock) so concurrent demotions cannot both pass and orphan the store.
- **R3.6** Deactivating a user (`ACTIVE → DISABLED`) SHALL reduce `active_count`, freeing a seat; reactivation SHALL re-check seat availability under the same transactional guard as creation and reject with 409 `SEAT_LIMIT_REACHED` when full.
- **R3.7** All tenant-user endpoints SHALL be gated by `admin.tenant-user:*` permissions, SHALL reject cross-tenant access (a user id not belonging to `:tenantId`) with 404, and — for operators whose portal role is scoped to specific tenants — SHALL reject acting on a `:tenantId` outside the operator's assigned scope with 403; seat and last-owner checks SHALL run inside the mutation's transaction to prevent TOCTOU overrun.

## R4 — Schema & permission foundation

- **R4.1** The system SHALL add `TENANT_CREATE` and `USER_CREATE` to the `AuditAction` enum via an additive migration deployed before app code emits them. Because Postgres `ALTER TYPE ... ADD VALUE` is non-transactional and cannot run inside the same migration transaction as other DDL, this SHALL be an isolated migration containing only the enum additions, ordered before any code path that references the new values.
- **R4.2** The system SHALL add permission codes `admin.tenant:create` and two tenant-user codes `admin.tenant-user:{view, manage}` (where `manage` covers create/edit/role-change/deactivate/reactivate/reset-password) with Vietnamese labels to the permission catalog seed.
- **R4.3** The system SHALL grant `admin.tenant:create` and both `admin.tenant-user:{view, manage}` to SUPER_ADMIN and SALER. No other portal role SHALL receive these permissions in this feature (any SUPPORT grant is out of scope and SHALL NOT be invented).
- **R4.4** Permission and audit-enum changes SHALL be additive and SHALL NOT weaken or remove existing admin permissions or audit values.

## R5 — Admin UI: create tenant

- **R5.1** When an operator with `admin.tenant:create` opens the tenant list, the UI SHALL show a "Tạo cửa hàng" action leading to a create form; operators without the permission SHALL NOT see the action.
- **R5.2** The create form SHALL collect tenant fields (name, slug, tenantType, optional logoUrl, `seatBonus` with default 10) and owner fields (fullName, required username, optional phone/email, password or "tạo mật khẩu tự động", mustChangePassword) using Vietnamese labels and ≥48px touch targets per DESIGN.md.
- **R5.3** The UI SHALL validate the at-least-one-identifier and slug pattern client-side (advisory) and SHALL surface backend 400/409 errors (`SLUG_TAKEN`, identifier conflicts) without losing entered data.
- **R5.4** On success the UI SHALL display the generated password once (when auto-generated) and navigate to the new tenant's detail page; it SHALL NOT optimistically show creation before the API confirms.

## R6 — Admin UI: tenant user management

- **R6.1** The tenant detail page SHALL include a users panel listing the tenant's users with role, status, identifiers, and last login, gated by `admin.tenant-user:view`.
- **R6.2** The panel SHALL offer permission-gated actions (create, edit, change role, deactivate/reactivate, reset password), each confirmed where destructive, and SHALL refetch source data after a successful mutation.
- **R6.3** The panel SHALL show the current seat usage (`active_count / effective_max_users`) and SHALL present a clear message when `SEAT_LIMIT_REACHED` blocks creation, including the case where seats are exhausted (prompt to raise `seatBonus` or assign a plan).
- **R6.4** The UI SHALL surface `LAST_OWNER` and cross-tenant/validation errors as explicit, understandable states and SHALL leave displayed data unchanged on failure.

## R7 — Integration & reachability

- **R7.1** The new backend `TenantUsersModule` SHALL be explicitly imported in `app.module.ts` and the extended tenants controller's new `POST /admin/tenants` route SHALL be reachable over HTTP; R1-01 SHALL carry a self-contained route-resolution assertion (a guarded request returning 403 without permission proves the route is mounted) rather than deferring all reachability downstream.
- **R7.2** The admin navigation → tenant list → create form → `POST /admin/tenants` → tenant detail → users panel chain SHALL be demonstrably reachable end-to-end with the authenticated admin token.
- **R7.3** The feature SHALL preserve existing tenant/admin-user behavior and tests (no regression to `admin-tenant-management` or `admin-rbac-user-management`).

## Non-Functional Requirements

- **R8.1 (Security)** No endpoint SHALL return `passwordHash`; generated passwords SHALL appear only once in the create/reset response and never in logs or audit payloads; password reset SHALL force `mustChangePassword=true` on the target user so the temporary secret cannot persist as a standing credential. All mutations SHALL be permission-gated and audited (OWASP A01/A09).
- **R8.2 (Integrity)** Tenant+owner creation SHALL be atomic; there SHALL be no state in which a Tenant exists without ≥1 OWNER.
- **R8.3 (Performance)** User list and seat count SHALL use indexed queries (`@@index([tenantId, status])`) and SHALL remain bounded (paginated ≤100/page).
- **R8.4 (Reliability)** Tenant `slug` and per-tenant `username` uniqueness SHALL be enforced by DB constraints (`tenant.slug @unique`, `user @@unique([tenantId, username])`), not read-then-write checks, and mapped to stable 409 reasons. `phone`/`email` are NOT uniqueness-constrained by this feature and MAY duplicate.
- **R8.5 (Consistency)** New DTOs SHALL reuse existing hardening (length caps, CRLF stripping, HTTPS-only URL) and the existing `adminFetch`/`Can`/`useHasPermission` frontend patterns.

## Unresolved Questions

- Password minimum-length/complexity policy: assume identical to existing admin `CreateAdminDto` (inherit verbatim). Confirm during design if that DTO exposes a shared constant.

## Red-Team Reconciliations (2026-07-19)

- **Roles:** per-tenant role seeding (OWNER/MANAGER/STAFF cloned into `tenantId=<new>`) is the confirmed model (R1.4), superseding the earlier reuse-system-roles draft.
- **Owner identifier:** `username` is required (R2.5); phone/email-only owners are not supported because `user.username` is NOT NULL.
- **Seats at creation:** `seatBonus` (default 10) is set at creation (R2.1/R5.2) so R3 user management is functional before any plan is assigned; plan assignment stays out of scope.
- **Permissions:** collapsed to `admin.tenant-user:{view, manage}`; invented SUPPORT matrix dropped (R4.2/R4.3).
- **Audit atomicity:** provisioning writes both audit rows through the tenant-user-scoped `AuditLogger` path that accepts the outer `Prisma.TransactionClient` (see design.md), not the self-transacting `run()`.
