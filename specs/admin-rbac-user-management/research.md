# Research — Admin RBAC & User Management

## Evidence Summary

### Codebase Scout (result)

| File | Finding |
|---|---|
| `backend/prisma/schema.prisma` (`model PlatformAdmin`) | `role PlatformAdminRole @default(SUPPORT)` — single enum field. Must MIGRATE to M:N join table `PlatformAdminRole` (renamed or new) → keep enum as deprecated or remove. |
| `backend/prisma/schema.prisma` (`model Role`) | Has `tenantId String?` — null = system role. Already supports tenant-less role pattern; can be reused for admin (admin roles must be `tenantId=null`). |
| `backend/prisma/schema.prisma` (`model Permission`) | Already has `code` (unique), `resource`, `action`. Permission taxonomy ready: `resource:action` (e.g., `sales:view`, `product:edit`). |
| `backend/prisma/schema.prisma` (`model RolePermission`) | Join table ready. |
| `backend/src/platform/auth/token.service.ts` | `AdminIdentity { id, email, role: string }` — role is single string. JWT access claim `payload.role` MUST expand to `permissionCodes: string[]` (or `roles` + lazy-load permissions). |
| `backend/src/platform/auth/auth.service.ts:74` | `identity.role = admin.role` — must change to compute permission codes from DB. |
| `backend/src/platform/auth/strategies/access-token.strategy.ts:29` | `validate()` returns `{ id, email, role }` — must change to include permission codes for guard. |
| `backend/prisma/schema.prisma` (`model AuditLog`) | Already supports `actorType=PLATFORM_ADMIN`, `action`, `resource`, `resourceId`, `before`, `after`, `ipAddress`, `userAgent`. Reusable directly. |
| `backend/src/platform/auth/auth.module.ts` | Exports `PasswordService`, `TokenService`, `RefreshTokenStore`. New modules (AdminUsersModule, RolesModule, PermissionsModule) can import AuthModule for these services. |
| `frontend/lib/admin-navigation.ts` | Hard-coded nav items. Must become permission-aware (filter by user permission codes). |
| `frontend/stores/admin-auth-store.ts` | `AdminIdentity.role: string` — extend to `permissions: string[]` for client-side gating. |

### External Research (skip)

No external research needed — all patterns are in-codebase (NestJS modules, Prisma M:N, JWT claim design, permission guard decorator pattern is standard NestJS).

Skip rationale: codebase provides all needed primitives; RBAC permission guard pattern is well-established NestJS idiom.

## Selected Decisions

### D1: Multi-role table for PlatformAdmin
- New M:N join table `AdminRoleAssignment { adminId, roleId, assignedAt, assignedBy }`.
- Remove `PlatformAdmin.role` enum column (migration: back-fill SUPER_ADMIN → system role "Super Admin", SUPPORT/BILLING → system roles "Support" / "Billing").
- `Role.tenantId` MUST be `null` for admin roles (validated at API layer).

### D2: JWT access claim shape
- Keep `role` claim for backward compat in logs (`role` = concatenated role codes `"SUPER_ADMIN,BILLING"` or comma-separated).
- ADD `permissions: string[]` to access claim — fetched at login/refresh, signed into JWT.
- Access token TTL 15m — re-fetch from DB every refresh (cheap, single JOIN).

### D3: Permission guard design
- `@RequirePermission('sales:edit')` decorator on controller method.
- `PermissionGuard` reads `req.user.permissions`, throws `ForbiddenException` if missing.
- Compound check: `@RequirePermission('user:create', 'user:edit')` → ALL must match (AND).
- Super-admin override: role code `SUPER_ADMIN` bypasses guard (R8.2 pattern).

### D4: Frontend permission shape
- `useAdminAuth().admin.permissions: string[]` (persisted in sessionStorage).
- `useHasPermission(code)` hook + `<Can permission="...">` wrapper component.
- Filter `adminNavGroups` based on permission codes.

### D5: Audit actions vocabulary
- `ADMIN_CREATE`, `ADMIN_UPDATE`, `ADMIN_DEACTIVATE`, `ADMIN_REACTIVATE`, `ADMIN_RESET_PASSWORD`
- `ROLE_CREATE`, `ROLE_UPDATE`, `ROLE_DELETE`, `ROLE_PERMISSION_GRANT`, `ROLE_PERMISSION_REVOKE`
- `ADMIN_ROLE_ASSIGN`, `ADMIN_ROLE_REVOKE`

### D6: Seed permissions
- Seed script `prisma/seed-admin-rbac.ts` creates:
  - System roles: `SUPER_ADMIN`, `SUPPORT`, `BILLING` (isSystem=true, tenantId=null)
  - Permissions: cover all admin endpoints (resource: `user`, `role`, `permission`, `tenant`, `billing`, `report`, `support`; actions: `view`, `create`, `edit`, `delete`, `approve`, `export`)
- SUPER_ADMIN role: ALL permissions granted at seed time.

## Rejected Alternatives

| Alternative | Why rejected |
|---|---|
| Keep enum `PlatformAdminRole`, add separate permission array on PlatformAdmin | Violates normalization (DRY); permissions not reusable across admins; no role editor UI possible. |
| Use existing `Role` table (tenantId=null already allowed) directly | Works, but admin-only role vs tenant-role naming/migration is ambiguous. Cleaner to keep table shared but enforce `tenantId IS NULL` for admin endpoints. → **Selected this approach.** |
| Fetch permissions from DB on every request instead of caching in JWT | Adds latency to every endpoint; defeats JWT stateless design. → Cache in JWT, refresh on token rotate (every 15-30min). |
| Casbin/OPA policy engine | YAGNI — 3-5 roles, <30 permissions, no attribute-based policy needed. Hand-coded guard is enough. |

## Remaining Gaps

- Migration ordering: must run AFTER admin-authentication is fully deployed (refresh tokens issued under old claim shape must still validate). Plan: 1) dual-write phase (enum deprecated but readable), 2) cutover, 3) drop enum. → Documented in design as phased migration.
- Specific endpoint permission codes — listed in design Canonical Contracts.

## Downstream Implications

| Layer | Impact |
|---|---|
| Backend AuthService | `login()`/`refresh()` must compute `permissions: string[]` from new M:N. |
| Backend TokenService | `signAccess()` signature unchanged; payload now includes `permissions: string[]`. |
| Backend AccessTokenStrategy | `validate()` returns `{ id, email, role, permissions }`. |
| Backend bootstrap seed | Must run AFTER RBAC migration (creates initial SUPER_ADMIN with role). |
| Frontend admin shell | Permission filter on `adminNavGroups`. |
| Existing SUPER_ADMIN env seed | Update to also create `AdminRoleAssignment` for new role. |
| Tests | Update auth.service.spec.ts, token.service.spec.ts for new claim shape. New admin-users.service.spec.ts, roles.service.spec.ts. |
## Post-Migration Confirmation (R0-06, 2026-07-18)

Migration is **non-breaking** for existing `admin-authentication` tests:

- `token.service.spec.ts` fixture extended: admin object now includes `roleCodes: ['SUPER_ADMIN']` and `permissions: [...]`. Existing assertions on `claims.role` (string) still pass because `signAccess` joins roleCodes with `,` and `verifyAccess` returns the joined `role` unchanged.
- New tests added for CSV-join contract and backward-compat decode from `role.split(',')`.
- `auth.service.spec.ts` fixture extended: `admin` object passed to `AuthService` has the new fields; new mocks for `adminRoleAssignment.findMany/count/upsert`, `role.findFirst`, `$transaction` to cover R0-02 wiring.
- `refresh-token.store.spec.ts` unaffected — `open`/`rotate`/`revokeFamily` signatures widened with optional `adminId`; existing call sites still type-check.
- `permission.guard.spec.ts` (R0-03) and `audit-logger.service.spec.ts` (R0-05) authored fresh.

**Runtime verification:** Deferred — `pnpm install` blocked by supply-chain policy on `better-result@2.10.0` (env, not code). Re-run `/hapo:test admin-rbac-user-management` in env with clean pnpm install.
