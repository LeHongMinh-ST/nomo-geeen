# Research & Design Decisions

## Evidence Summary

- `docs/base_spec.md:414-451` defines one-tenant Simple Mode seat enforcement, Owner/Manager/Staff roles, last-owner protection, soft deactivation, and the in-app Nhân viên screen.
- `docs/database-design-platform-user.md:185-192, 377` defines `effective_max_users = active plan maxUsers + tenant.seatBonus`, ACTIVE/INVITED counting, and quota enforcement on user creation.
- `backend/src/platform/tenant-users/tenant-users.service.ts` already implements public DTOs, seat usage, serializable create/reactivate checks, role resolution, last-owner checks, and generated/reset password behavior.
- `backend/src/platform/tenant-users/tenant-users.controller.ts` currently exposes only `/admin/tenants/:tenantId/users` with platform-admin guards; it cannot be reused directly by the user app without changing auth context.
- `backend/src/platform/auth/guards/tenant-access-token.guard.ts` and `tenant-permission.guard.ts` provide the required tenant JWT and live permission boundary for a new `/tenant/users` controller.
- `frontend/lib/user-fetch.ts` already provides bearer credentials, cookie credentials, one refresh/retry, and session clearing; `frontend/app/(app)/layout.tsx` already protects all user routes with `UserAuthGuard`.
- `frontend/components/admin/tenant-users-panel.tsx` and `frontend/lib/admin-api/tenant-users.ts` provide reusable interaction patterns, but the admin API/client and admin auth must remain separate from the user app.

## Decisions

1. Add tenant-authenticated user-management endpoints under `/tenant/users`; preserve existing admin endpoint contracts.
2. Reuse the tenant user service invariants, generalizing audit actor context so tenant actions are recorded as `USER` with tenantId and actorId.
3. Enforce permissions and role boundaries on the server using live tenant identity/role data; frontend permission checks are UX only.
4. Keep `seatBonus` and plan assignment platform-owned. The tenant app reads seat usage and cannot grant seats or change plans.
5. Use a single settings child route `/thiet-lap/nhan-vien`; no new top-level navigation group is needed for Phase 1.

## Rejected alternatives

- Reuse `/admin/tenants/:tenantId/users` from the user app — rejected because it trusts platform-admin JWTs and `admin.*` permissions.
- Let the browser calculate or reserve seats — rejected because concurrent creates must be protected by a serializable server transaction.
- Add custom roles — rejected by Phase 1 Simple Mode; only OWNER/MANAGER/STAFF are supported.

## Risks and mitigations

- Audit enum/schema compatibility: reuse existing compatible USER lifecycle actions and verify real Postgres writes.
- Manager privilege escalation: test role transitions and target-owner operations with real tenant identities, not only UI checks.
- Concurrent quota race: keep seat check inside the existing serializable transaction and add an integration test.

## Unresolved Questions

- Exact audit action names for profile edit and reset-password are constrained by the current enum; implementation must use existing actions or document a minimal additive enum migration if no compatible action exists.
