# Requirements — Admin RBAC & User Management

> Format: EARS (Easy Approach to Requirements Syntax).
> Every `R{n}.{m}` is a literal ID referenced by task `_Requirements:` mapping.

## R1 — Permission Catalog (Read-only seed)

- **R1.1** When the RBAC migration runs, the system SHALL seed the `permission` table with one row per `(admin.<resource>, action)` pair (resources: `user`, `role`, `permission`, `tenant`, `billing`, `report`, `support`; actions: `view`, `create`, `edit`, `delete`, `approve`, `export`, `deactivate`, `reactivate`, `reset_password`, `reply`). All admin codes use the `admin.` prefix to avoid collision with the 10 pre-existing tenant permission codes.
- **R1.2** When a SUPER_ADMIN requests `GET /admin/permissions`, the system SHALL return all permission rows sorted by `resource ASC, action ASC` as `{ id, code, resource, action }[]`.
- **R1.3** When an admin without `admin.permission:view` calls `GET /admin/permissions`, the system SHALL respond with `403 Forbidden` (no permission-list leakage).
- **R1.4** Where a permission already exists (code collision on re-seed), the system SHALL keep the existing row untouched (UPSERT semantics; no duplicates on `code`).

## R2 — Role Management

- **R2.1** When a SUPER_ADMIN calls `POST /admin/roles` with `{ code, name, permissionIds: string[] }`, the system SHALL create a `role` row with `isAdmin = true` and `tenantId = null` (platform-level) and create `role_permission` rows for each `permissionId`; response `201 Created` with role summary.
- **R2.2** When a SUPER_ADMIN calls `GET /admin/roles`, the system SHALL return all platform-level roles (`isAdmin = true`) as `{ id, code, name, isSystem, permissions: string[] (codes), createdAt, updatedAt }[]` sorted by code.
- **R2.3** When a SUPER_ADMIN calls `PATCH /admin/roles/:id` with `{ name?, addPermissionIds?, removePermissionIds? }`, the system SHALL update the role name (if provided), adjust `role_permission` rows idempotently, AND emit one `ROLE_UPDATE` audit row PLUS N `ROLE_PERMISSION_GRANT` and N `ROLE_PERMISSION_REVOKE` audit rows (one per added/removed permission); response `200 OK` with updated role.
- **R2.4** When a SUPER_ADMIN calls `DELETE /admin/roles/:id` on a role with `isSystem = true`, the system SHALL respond `400 Bad Request` with reason `SYSTEM_ROLE_PROTECTED`.
- **R2.5** When a SUPER_ADMIN calls `DELETE /admin/roles/:id` on a role currently assigned to ≥1 admin, the system SHALL respond `409 Conflict` with reason `ROLE_IN_USE`.
- **R2.6** When a SUPER_ADMIN calls `DELETE /admin/roles/:id` on an unused non-system role, the system SHALL delete the role and its `role_permission` rows (`ON DELETE CASCADE`); response `204 No Content`.
- **R2.7** Where `code` collides with an existing admin role (`@@unique WHERE is_admin = true`), the system SHALL respond `409 Conflict` with reason `ROLE_CODE_DUPLICATE`.
- **R2.8** Where any provided `permissionIds` does not exist in the `permission` table, the system SHALL respond `400 Bad Request` with reason `INVALID_PERMISSION_ID` and list the missing IDs.

## R3 — Admin User CRUD

- **R3.1** When a SUPER_ADMIN calls `POST /admin/users` with `{ email, password, fullName, roleIds: string[] }`, the system SHALL hash the password (argon2id), create a `platform_admin` row (status `ACTIVE`), and create `admin_role_assignment` rows for each `roleId`; response `201 Created` with admin summary (no password hash).
- **R3.2** When a SUPER_ADMIN calls `GET /admin/users`, the system SHALL return paginated list (default `page=1, pageSize=20`) of admins as `{ id, email, fullName, status, roles: string[] (codes), permissions: string[] (codes), lastLoginAt, createdAt }[]` sorted by `createdAt DESC`.
- **R3.3** When a SUPER_ADMIN calls `GET /admin/users/:id`, the system SHALL return `{ id, email, fullName, status, roles: string[] (codes), permissions: string[] (codes), lastLoginAt, createdAt, updatedAt }`; `404 Not Found` if missing.
- **R3.4** When a SUPER_ADMIN calls `PATCH /admin/users/:id` with `{ fullName?, roleIds? }`, the system SHALL update the admin row and replace role assignments if `roleIds` provided (delete + insert in transaction); response `200 OK`. Email and status NOT updatable here.
- **R3.5** When a SUPER_ADMIN calls `POST /admin/users/:id/deactivate`, the system SHALL set `status = DISABLED`; response `204 No Content`. Self-deactivation SHALL fail with `400` (`CANNOT_DEACTIVATE_SELF`). Deactivating the sole remaining active SUPER_ADMIN SHALL fail with `409` (`LAST_SUPER_ADMIN`) to prevent lockout — `isLastActiveSuperAdmin(targetId) = countActiveSuperAdmins() <= 1 AND target has SUPER_ADMIN assignment`, where `countActiveSuperAdmins()` counts via the `admin_role_assignment` table joined with `role.code='SUPER_ADMIN'` and `platform_admin.status='ACTIVE'`.
- **R3.6** When a SUPER_ADMIN calls `POST /admin/users/:id/reactivate`, the system SHALL set `status = ACTIVE`; response `204 No Content`.
- **R3.7** When a SUPER_ADMIN calls `POST /admin/users/:id/reset-password` with `{ newPassword }`, the system SHALL hash the new password, update `passwordHash`, revoke all refresh-token families for that admin (R3.7.a), and write audit log; response `204 No Content`.
- **R3.8** When an admin calls `GET /admin/users*` without `user:view` permission (and not SUPER_ADMIN), the system SHALL respond `403 Forbidden`.
- **R3.9** Where duplicate email on `POST /admin/users`, the system SHALL respond `409 Conflict` with reason `EMAIL_DUPLICATE`.
- **R3.10** Where `roleIds` contains an ID not found in `role` table, the system SHALL respond `400 Bad Request` with reason `INVALID_ROLE_ID`.

## R4 — Permission Enforcement (Guard Layer)

- **R4.1** When any admin endpoint is annotated `@RequirePermission('X:Y')` and the JWT `permissions` claim does not include `'X:Y'`, the system SHALL respond `403 Forbidden` with reason `PERMISSION_DENIED`.
- **R4.2** When `req.user.roleCodes` includes `'SUPER_ADMIN'`, the system SHALL bypass all `@RequirePermission` checks (super-admin shortcut).
- **R4.3** When multiple permissions are listed on `@RequirePermission('A:B', 'C:D')`, the system SHALL require ALL listed codes to be present (AND semantics); missing ANY → `403`.
- **R4.4** When a request has no JWT (unauthenticated) hitting an `@RequirePermission`-protected route, the system SHALL respond `401 Unauthorized` (existing AccessTokenGuard behavior preserved).

## R5 — JWT Claim Update

- **R5.1** When `AuthService.login()` succeeds, the system SHALL compute `permissions: string[]` from the admin's current role assignments (DB JOIN at login time) and include it in the access JWT claim, alongside the existing `role` (concatenated role codes string).
- **R5.2** When `AuthService.refresh()` rotates, the system SHALL re-compute `permissions` from DB and re-issue the access token with updated claim.
- **R5.3** When `AccessTokenStrategy.validate()` runs, the system SHALL return `{ id, email, roleCodes: string[], permissions: string[] }` as `req.user`.
- **R5.4** When a `PermissionGuard` reads `req.user.permissions`, the system SHALL enforce R4.1–R4.3 using the new shape.

## R6 — Audit Logging

- **R6.1** When any R2/R3 endpoint succeeds (CREATED/UPDATED/DELETED/STATUS_CHANGED/PASSWORD_RESET), the system SHALL write one `audit_log` row with `actorType=PLATFORM_ADMIN`, `actorId=<caller>`, `actorRoleCode=<R6.2 value>`, `action=<R6.5 code>`, `resource=<table>`, `resourceId=<target>`, `before` JSON, `after` JSON, `ipAddress`, `userAgent`. For SYSTEM-initiated events (e.g. seed bootstrap), `actorId=null`, `actorType=SYSTEM`, `actorRoleCode=null`.
- **R6.2** `actor_role_code` is the role code whose permission grant was used to authorize this action; when multiple roles authorize the request, codes are joined with `,` (e.g. `"SUPER_ADMIN,BILLING"`). For SYSTEM actor, `actorRoleCode = null`. The field is denormalized for SQL filter efficiency; canonical authority remains the JWT claim + assignment table.
- **R6.3** Failed operations (validation/permission errors) SHALL NOT write audit logs (only state-changing successes do).
- **R6.4** Audit log writes SHALL run inside the same DB transaction as the state change, OR fail closed (rollback state change) — no orphan rows. Implementation: `AuditLogger.run(input, async (tx) => { ... stateChange ... })` wraps both in a single `prisma.$transaction` (see task-R0-05 step 1).
- **R6.5** Audit action code vocabulary (`AuditAction` enum): `ADMIN_CREATE`, `ADMIN_UPDATE`, `ADMIN_DEACTIVATE`, `ADMIN_REACTIVATE`, `ADMIN_RESET_PASSWORD`, `ADMIN_ROLE_ASSIGN`, `ADMIN_ROLE_REVOKE`, `ROLE_CREATE`, `ROLE_UPDATE`, `ROLE_DELETE`, `ROLE_PERMISSION_GRANT`, `ROLE_PERMISSION_REVOKE`. The same `audit_log` table also accepts pre-existing enum values `LOGIN`, `LOGOUT`, `REFRESH_REUSE_DETECTED` written by the `admin-authentication` spec (added to the enum explicitly per Decision 4 / F-04).

## R7 — Frontend Admin Pages

- **R7.1** When an authenticated admin visits `/admin/nguoi-dung-quan-tri`, the system SHALL render a paginated table of admins (R3.2 shape) with columns: email, fullName, status, roles (chips), lastLoginAt; actions per row: Sửa / Vô hiệu hoá–Kích hoạt / Đặt lại mật khẩu / Gán lại vai trò. Action buttons (Sửa, Vô hiệu hoá, Kích hoạt, Đặt lại mật khẩu, Gán vai trò) SHALL be hidden when `admin.id === currentUser.id` to avoid self-block round-trips.
- **R7.2** When the user clicks "Tạo admin" on `/admin/nguoi-dung-quan-tri`, the system SHALL open a modal/drawer with form: email, fullName, password, multi-select roles (R2 response); submit hits R3.1.
- **R7.3** When the user clicks "Sửa" on an admin row, the system SHALL open edit form (fullName + roleIds) → R3.4.
- **R7.4** When the user clicks "Đặt lại mật khẩu", the system SHALL open a confirm dialog with password input → R3.7.
- **R7.5** When the user visits `/admin/vai-tro`, the system SHALL render table of roles (R2.2 shape) with per-row expand to show permission codes; "Tạo vai trò" modal with code, name, multi-select permission IDs → R2.1.
- **R7.6** When the user clicks "Sửa" on a role row, the system SHALL open role editor (name, add/remove permission chips) → R2.3.
- **R7.7** When the user visits `/admin/quyen-han`, the system SHALL render grouped-by-resource permission list (R1.2 shape), read-only.
- **R7.8** When an admin lacks `admin.user:view` / `admin.role:view` / `admin.permission:view`, the corresponding menu item AND the route SHALL be inaccessible (client guard + server 403).
- **R7.9** When admin navigates to a route they lack permission for, the system SHALL redirect to the fixed route `/admin/khong-co-quyen` (NotAuthorized page) which always renders + shows toast `Bạn không có quyền truy cập trang này.`, regardless of route gating. The route is unconditional so a fully hidden nav can never strand the user without feedback.

## R8 — Backward Compatibility & Migration

- **R8.1** The `PlatformAdmin.role` enum column SHALL be retained as a deprecated back-fill column during migration phase (read-only). New code reads from `AdminRoleAssignment` only.
- **R8.2** When a pre-migration admin (with `role = SUPER_ADMIN`) logs in during the migration phase, the system SHALL auto-create an `AdminRoleAssignment` row linking them to the seeded `SUPER_ADMIN` system role (idempotent on `adminId+roleId`).
- **R8.3** When the migration completes (enum column scheduled for removal in a follow-up), back-fill column SHALL be ignored by all endpoints.

## Non-Functional Requirements

- **NFR-1 (Performance)**: `POST /admin/users` and `PATCH /admin/users/:id` SHALL complete in <500ms p95 (DB INSERT + 1-3 role links + audit log).
- **NFR-2 (Security)**:
  - Password hashing: argon2id (existing `PasswordService` reused — no new hashing algorithm).
  - Password policy: min 12 chars, ≥1 letter, ≥1 digit, ≥1 special (client-side check + server-side DTO validator).
  - Email format validated server-side (`class-validator @IsEmail`).
  - All admin endpoints require `AccessTokenGuard` + `PermissionGuard` (fail closed).
  - Reset-password requires old-password confirmation IF called by self (R3.7.b — same admin, NOT a separate endpoint: simply SELF-reset returns `400 CANNOT_RESET_OWN_VIA_ADMIN_API` to force using change-password flow out-of-scope here).
- **NFR-3 (Reliability)**: Migration script MUST be idempotent and reversible (down migration drops new tables, restores enum column data).
- **NFR-4 (Compatibility)**: Existing `admin-authentication` tests (9 task files) MUST pass unchanged after migration (token claim additive, not breaking).
- **NFR-5 (Observability)**: Every audit log row includes `ipAddress` and `userAgent`; admin endpoints emit `console.info('[RBAC] <action> actor=<id> target=<id>')` for ops visibility.
- **NFR-6 (Accessibility)**: Frontend RBAC pages SHALL meet WCAG 2.1 AA — table headers semantic `<th>`, modals use `role="dialog"` and trap focus, all controls keyboard-reachable.
- **NFR-7 (Internationalization)**: All user-facing strings in Tiếng Việt, sourced from existing UI strings registry (no i18n setup in this spec — match existing app Vietnamese-only convention).

## Resolved / Open Questions

| # | Question | Resolution |
|---|---|---|
| Q1 | Use existing `Role` table (tenantId=null) or new `AdminRole` table? | **Use existing `Role` table** (D6 selection); enforce `tenantId IS NULL` at API for admin endpoints. |
| Q2 | Can admin have 0 roles? | **Yes** — empty permissions array; all guards deny; recovery only via SUPER_ADMIN. Audit `ADMIN_ROLE_REVOKE_ALL` not blocked. |
| Q3 | How to handle deactivate-while-logged-in? | **Soft delete only** — status flip → existing access token still valid until 15min expiry; next refresh fails (`status !== ACTIVE` → 401 revoke family). |
| Q4 | Audit log viewer UI in scope? | **No** — write-only this spec. Viewer endpoint is separate spec. |
| Q5 | Can SUPER_ADMIN delete themselves? | **No** — `CANNOT_DELETE_SELF` enforced at API (only deactivation blocked; deletion not in scope R2 — no admin DELETE endpoint). |
