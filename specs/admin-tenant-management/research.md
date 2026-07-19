# Research & Design Decisions

## Summary
- **Feature**: admin-tenant-management
- **Discovery Scope**: Complex platform CRUD and lifecycle extension
- **Key Findings**:
  - `Tenant` already exists as a platform-level Prisma model with `slug`, `name`, `tenantType`, `mode`, `status`, `logoUrl`, timestamps, and `deletedAt`.
  - Admin RBAC already reserves `admin.tenant:view`, `admin.tenant:edit`, `admin.tenant:approve`, and `admin.tenant:export`; the RBAC spec is an implementation dependency.
  - The admin frontend already exposes `/admin/cua-hang` in `frontend/lib/admin-navigation.ts`, gated by `admin.tenant:view`, but no tenant page/API exists yet.
  - Tenant status is an enum (`ACTIVE`, `SUSPENDED`, `LOCKED`); lifecycle transitions need an explicit server-side state machine.

## Evidence Summary
- **Codebase Scout**: Required and completed.
  - Result: existing platform schema and RBAC permission taxonomy support this feature without introducing a new tenant table.
  - Relevant files/modules: `backend/prisma/schema.prisma`, `backend/src/platform/auth/guards/permission.guard.ts`, `backend/src/platform/auth/decorators/require-permission.decorator.ts`, `backend/src/platform/admin-users/`, `backend/src/platform/roles/`, `backend/src/platform/audit/`, `frontend/lib/admin-navigation.ts`, `frontend/app/admin/(quan-tri)/layout.tsx`.
  - Existing patterns/contracts: NestJS module-per-domain, Prisma service, DTO validation, `AccessTokenGuard` + `PermissionGuard`, `AuditLogger`, Next.js admin pages, permission-gated navigation.
  - Tests/checks affected: backend unit tests under `backend/src/**/*.spec.ts`, e2e suites under `backend/test/*.e2e-spec.ts`, frontend build and runtime permission checks.
- **External / Current Research**: Required and completed.
  - Primary source: OWASP Authorization Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html (retrieved 2026-07-18).
  - Constraints: deny by default, least privilege, server-side authorization on every request and object, safe denial responses, consistent audit logs, bounded export access.
- **Selected Decision**:
  - Build a platform-level `TenantModule` with paginated list/detail/edit/status/export APIs and a small admin UI slice.
  - Enforce permissions on every route with `AccessTokenGuard`, `PermissionGuard`, and exact `admin.tenant:*` metadata.
  - Use explicit lifecycle transitions, soft-delete-free scope, transaction-backed audit writes, and bounded CSV export.
- **Rejected Alternatives**:
  - Reuse tenant-user routes — rejected because platform admin data is not tenant-scoped and has a different authorization boundary.
  - Add tenant deletion now — rejected because irreversible deletion and retention policy are outside the requested management slice.
  - Client-only permission gating — rejected by OWASP guidance; it cannot protect API data.
- **Remaining Gaps / Questions**:
  - RBAC implementation must finish and verify permission-bearing access claims before this spec can implement (R5.6 preflight).
  - Product policy may later define subscription-driven status rules; this spec keeps lifecycle transitions explicit, local, and **metadata-only**.
  - Downstream session/API enforcement for SUSPENDED/LOCKED is deferred to a future `tenant-status-enforcement` spec.
- **Downstream Task & Test Implications**:
  - R0 must define status transition and export contracts, migration artifact for AuditAction, RBAC preflight, and SUPPORT grant for `admin.tenant:view` before APIs.
  - Every mutating operation needs permission-negative tests, atomic-race tests, and audit assertions via `AuditLogger.run`.
  - Final integration must prove `/admin/cua-hang` reaches real API routes, non-authorized admins receive 403, formula-safe export, and stale-token denial window for export/status.

## Codebase Scout

| Area | Finding | Evidence / Path | Implication |
|------|---------|-----------------|-------------|
| Project surface | Next.js frontend + NestJS backend monorepo; Prisma 7/Postgres; Redis-backed auth | `frontend/`, `backend/package.json`, `backend/prisma/schema.prisma` | Use existing package commands and module boundaries |
| Tenant persistence | Platform `Tenant` model already exists | `backend/prisma/schema.prisma:164-190` | No new tenant table; add service queries/indexes only if required |
| Tenant relations | Tenant relates to users, subscriptions, invoices, feature flags, audit logs, tickets, announcements | `backend/prisma/schema.prisma:176-185` | Detail endpoint can return bounded aggregate counts; avoid unbounded relation loading |
| Authorization | Permission metadata + guard already exist in RBAC work | `backend/src/platform/auth/guards/permission.guard.ts`, `backend/src/platform/auth/decorators/require-permission.decorator.ts` | All routes require server-side guards and exact permission codes |
| Permission taxonomy | `admin.tenant` actions already reserved | `backend/prisma/seed-admin-rbac.ts:49-56` | Do not invent alternate codes |
| Audit | Shared `AuditLogger` exists in platform audit module | `backend/src/platform/audit/audit-logger.service.ts` | Reuse transaction-aware audit boundary |
| Frontend nav | `/admin/cua-hang` nav item already gated | `frontend/lib/admin-navigation.ts:54-60` | Create matching page without changing permission code |
| Existing admin UI | Admin shell and permission components exist | `frontend/components/admin/`, `frontend/app/admin/(quan-tri)/layout.tsx` | Reuse shell, fetch, and permission patterns |
| Staleness | Required baseline docs (`docs/development-rules.md`, `docs/codebase-summary.md`, `docs/code-standards.md`, `docs/design-guidelines.md`) are absent | repository scan | Use `CLAUDE.md`, `docs/architecture.md`, `docs/base_spec.md`, and source as evidence; flag docs gap |

## External / Current Research

| Question | Source | Finding | Decision Impact |
|----------|--------|---------|-----------------|
| How should authorization be enforced? | OWASP Authorization Cheat Sheet, 2026-07-18 | Deny by default; least privilege; server-side every request and object | Guard every endpoint; no client-only protection |
| How should access failures behave? | OWASP Authorization Cheat Sheet, 2026-07-18 | Do not expose sensitive details in errors; centralize enforcement | Return stable 403 response without tenant data leakage |
| How should audit work? | OWASP Authorization Cheat Sheet, 2026-07-18 | Consistent logging with balanced detail | Log actor, tenant, action, target, request metadata; omit secrets |
| How should exports be protected? | OWASP Authorization Cheat Sheet, 2026-07-18 | Static/export assets require same access policies | Require `admin.tenant:export`, bounded filters, and audit export |

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Dedicated TenantModule | NestJS controller/service/module backed by existing Prisma and audit modules | Clear boundary, matches platform patterns, easy permission review | Adds module files | Selected |
| Put endpoints in AuthModule | Extend auth controller/service | Fewer modules | Mixes identity and tenant lifecycle, weak ownership boundary | Rejected |
| Generic admin CRUD framework | Dynamic route and generic permission rules | Less repetitive code | Harder lifecycle/audit guarantees; unsafe object authorization defaults | Rejected |

## Design Decisions

### Decision: Platform tenant module
- **Context**: Platform admins need tenant operations separate from tenant-user business APIs.
- **Selected Approach**: Add `backend/src/platform/tenants/` module with controller, service, DTOs, and tests.
- **Rationale**: Matches module-per-domain architecture and isolates platform-level authorization.
- **Status**: Accepted
- **Trade-offs**: More files than extending an existing module; stronger reviewability and future subscription integration.

### Decision: Explicit lifecycle state machine
- **Context**: `TenantStatus` has three states and unrestricted PATCH would permit invalid transitions.
- **Selected Approach**: Allow `ACTIVE -> SUSPENDED`, `ACTIVE -> LOCKED`, `SUSPENDED -> ACTIVE`, `SUSPENDED -> LOCKED`, `LOCKED -> ACTIVE` only through named status action with server validation; reject no-op and unsupported transitions.
- **Rationale**: Prevents accidental state corruption and makes audit intent explicit.
- **Status**: Accepted
- **Trade-offs**: Product policy may later tighten transitions; changes require one service rule update.

### Decision: Bounded CSV export
- **Context**: Export is a permissioned data egress path.
- **Selected Approach**: Require `admin.tenant:export`, accept the same filters as list plus a hard maximum of 10,000 rows, stream/serialize only approved columns, and create an audit row.
- **Rationale**: Prevents unbounded memory/data exposure while satisfying operational export needs.
- **Status**: Accepted
- **Trade-offs**: Large exports require later async job work, intentionally out of scope.

## Risks & Mitigations
- Stale permission claims after role changes — owned by `admin-rbac-user-management` (TTL/revocation). This feature tests high-impact ops (export/status) against a token issued before role removal and records the denial window (R5.6 / R3-01).
- IDOR on tenant IDs — load target tenant server-side after permission guard; never trust client-provided tenant ownership context; uniform 403 without payload for missing permission.
- Invalid lifecycle transitions + concurrent races — atomic conditional update on `(id, status, deletedAt IS NULL)` + unit/integration tests.
- Concurrent profile lost-update — `expectedUpdatedAt` / `If-Match` precondition; 409 on stale.
- Export data leakage / formula injection — fixed column allowlist, `take:10001` cap, formula-safe CSV escaping, permission guard, audit before body.
- Soft-delete races on mutation — every write predicate includes `deletedAt IS NULL`; zero rows → 404/409.
- Slow tenant detail — use `_count` for users/subscriptions and filtered count for open tickets; pagination; indexed status/deletedAt.
- Audit non-atomicity — mandate `AuditLogger.run` (already provides same `$transaction` wrapper).
- Metadata-only status — explicitly out of scope for session/Redis/API enforcement; future `tenant-status-enforcement` spec owns runtime effects.
