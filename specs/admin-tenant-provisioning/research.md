# Research — admin-tenant-provisioning

## Evidence Summary

### Codebase scout result (targeted)

**Tenant creation is entirely absent.**
- `backend/src/platform/tenants/tenants.controller.ts` exposes `GET /admin/tenants`, `GET export`, `GET :id`, `PATCH :id`, `POST :id/status` — **no `POST /admin/tenants`**.
- No `tenant.create` / `createTenant` anywhere in `src/` or `prisma/` (seed included).
- Frontend `frontend/app/admin/(quan-tri)/tenants/page.tsx` renders `TenantList`; no create route/form. `tenant-list.tsx` has an `onExport`/`onRefresh` action surface to extend.

**System roles already seeded (decisive).**
- `backend/prisma/seed.ts:169-200` seeds `OWNER` (rank 1), `MANAGER` (rank 2), `STAFF` with `tenantId = null`, `isSystem = true`. → Owner assignment can reference the shared system OWNER role; **no per-tenant role seeding needed**. `User.roleId` is a plain FK to `role` (no tenant match constraint on the relation), so a tenant user may point at a `tenantId=null` system role.

**Default plan seed exists.**
- `backend/prisma/seed.ts` upserts `starter` (maxUsers 2) < `professional` (5) < `enterprise` (20). "Lowest default plan" = `starter`. **However user decided NOT to assign a plan at creation** → this fact is retained only as rationale; assignment defers to the existing subscription API/UI (`admin-plan-subscription-management`).

**User model & enums.**
- `User`: `tenantId`, `username`, `email?`, `phone?`, `passwordHash`, `mustChangePassword`, `fullName`, `roleId`, `status (UserStatus)`, `createdByType (CreatedByType?)`, `createdById?`, `lastLoginAt?`, soft-delete `deletedAt`. Unique `@@unique([tenantId, username])`.
- `UserStatus = ACTIVE | INVITED | DISABLED`. `CreatedByType = PLATFORM_ADMIN | USER`.
- `Tenant`: `slug @unique`, `name`, `tenantType`, `mode`, `status`, `logoUrl?`, `seatBonus (default 0)`, soft-delete.

**Password + audit primitives to reuse.**
- `backend/src/platform/auth/password.service.ts` → `hash(plain)` (Argon2id). Reuse for owner + tenant-user passwords.
- `AuditLogger` used by billing/tenants services (`PlanAuditContext { actorId, actorRoleCode, ipAddress?, userAgent? }`). Reuse the same context shape.
- `AuditAction` enum **lacks** `TENANT_CREATE` and `USER_CREATE` → additive migration required.

**Permission catalog.**
- `backend/prisma/seed-admin-rbac.ts` defines `admin.tenant:{view,edit,approve,export}` and `admin.user:{view,create,edit,delete,deactivate,reactivate,reset_password}` (the latter are for **platform** admins, module `admin-users`). **No `admin.tenant:create`; no tenant-user permissions.** New codes needed.

**Reference module for tenant-user CRUD.**
- `backend/src/platform/admin-users/` (controller + 16KB service + specs) is the closest pattern: guarded CRUD, create/reset-password DTOs, audit context, `AdminPublicShape` (never returns passwordHash). Tenant-user module mirrors this pattern but scoped by `:tenantId` and using `user` table + 3-tier roles + seat enforcement.

**Seat model (base_spec §3.8.3).**
- `effective_max_users = plan.maxUsers + tenant.seatBonus`; `active_count = users where status IN (ACTIVE, INVITED)`. There is **no live counter table for users** — count is a query. Tenant with no subscription has no `plan.maxUsers` → must define behavior (see gap).

**App wiring.**
- `backend/src/app.module.ts` imports TenantsModule, AdminUsersModule, etc. New TenantUsersModule must be registered here.
- `frontend/lib/admin-api/` clients: `tenants.ts`, `admin-users.ts`, `roles.ts`, `fetch.ts` (adminFetch: bearer + silent refresh). `frontend/lib/admin-navigation.ts` groups; `components/admin/can-permission.tsx` (`Can`), `hooks/use-has-permission.ts`.

### External / current research result

Skip rationale: no third-party API, provider, or platform-policy dependency. All primitives (NestJS guards, Prisma transaction, Argon2id, Next.js admin shell) are already established in-repo with working patterns. Password-generation and identifier-login rules are defined by base_spec §3.7 (internal source of truth). No external standard governs this internal provisioning flow beyond OWASP-style input hardening already applied in existing DTOs (HTTPS-only logoUrl, CRLF stripping, length caps) which we reuse.

### Selected decisions

1. **Transactional provisioning** — `POST /admin/tenants` creates Tenant + first OWNER user in a single `prisma.$transaction`; roll back everything on any failure (no orphan tenant → satisfies base_spec §3.8.2 "≥1 Owner").
2. **Always create new owner** (user choice). No selection of existing users — users are tenant-scoped by `@@unique([tenantId, username])` and there is no cross-tenant user model.
3. **Reuse seeded system OWNER role** (`tenantId=null`) for the first owner; no per-tenant role rows. (Rejected: per-tenant seeding — adds 3 rows/tenant with no Phase-1 customization need; YAGNI.)
4. **No subscription at creation** (user choice). Tenant is created plan-less; assigning a plan uses the existing subscription API/UI. Retain "lowest plan = starter" only as documentation.
5. **Seat rule with plan-less tenant** — `effective_max_users` when no active subscription = `0 + tenant.seatBonus`. The **first OWNER is exempt** from the seat check (created with the tenant). Subsequent tenant-user creation enforces `active_count < effective_max_users` and returns a stable 403/409 `SEAT_LIMIT_REACHED` when full. This makes "no plan" naturally block extra users until Admin assigns a plan — consistent behavior, no special-casing.
6. **Tenant-user module** mirrors `admin-users` pattern but on `user` table, scoped by `:tenantId`, roles limited to OWNER/MANAGER/STAFF, never returns `passwordHash`, enforces base_spec §3.8.2 Owner rules (cannot disable/last-Owner, Manager cannot touch Owner).

### Rejected alternatives

- **Per-tenant role seeding** — rejected (YAGNI; system roles already exist and suffice for Phase 1 3-tier model).
- **Auto-seed starter plan when table empty** — rejected; superseded by "no plan at creation". Empty-plan case handled by seat rule #5, not by fabricating a plan.
- **Select existing owner user** — rejected; no cross-tenant user identity exists, and the request for a NEW store implies a fresh owner.
- **Separate quota counter for users** — rejected; seat is a cheap indexed `count` query (`@@index([tenantId, status])` exists). No `TenantQuotaCounter` row needed for users.

### Remaining gaps / risks

- **Slug generation vs input** — decide: admin types slug, or auto-derive from name with uniqueness retry. Design picks admin-provided slug with server-side normalization + uniqueness 409 (simplest, explicit).
- **Password generation** — when admin opts to auto-generate, the plaintext must be surfaced **once** in the create response for the admin to hand to the store owner (never stored plaintext, never logged). Design must state this one-time reveal contract.
- **Concurrency** — two admins provisioning the same slug simultaneously → rely on DB unique constraint + mapped 409, not a read-then-write check.
- **Last-Owner protection** — deactivating/deleting the only active OWNER must be blocked at service level.

### Downstream task/test implications

- Additive migration (enum values) is a foundation task (R0) that must deploy before app code emits the new audit actions/permissions.
- Permission seed extension is foundation (R0); role grants for SUPER_ADMIN/SALER.
- Transactional creation needs an integration test proving rollback (owner insert fails → tenant not persisted) and slug-conflict 409.
- Seat enforcement needs tests: no-plan tenant blocks 2nd user; first owner exempt; deactivation frees a seat.
- Frontend needs create-form validation (slug pattern, at least one identifier) and a final integration/reachability task tying navigation → create route → API → tenant detail user panel.
