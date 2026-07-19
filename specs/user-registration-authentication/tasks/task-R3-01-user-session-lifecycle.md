# Task R3-01: User session lifecycle

**Requirement:** R3 — User session lifecycle
**Status:** pending
**Priority:** P0
**Estimated Effort:** L
**Dependencies:** tasks/task-R0-01-session-contract-foundation.md, tasks/task-R2-01-tenant-login-identity.md
**Spec:** specs/user-registration-authentication/
Contracts: TenantMeResponse

## Context

- **Why**: Access-only tenant JWTs cannot survive reload, logout, or refresh-token replay safely.
- **Current state**: Admin refresh/logout/me is complete; tenant guard only checks access blacklist.
- **Target outcome**: User-specific refresh rotation, logout, `/me`, revocation and reuse audit are reachable from HTTP.

## Constraints

- **MUST**: Use `nomo_user_rt`, user Redis keys, atomic rotation, reuse family revocation, and fail-closed Redis behavior.
- **SHOULD**: Mirror admin controller cookie/error semantics while keeping user realm explicit.
- **MUST NOT**: Accept admin refresh cookies or return raw refresh tokens in JSON/logs.
- **SCOPE**: Refresh/logout/me; password change gating is R4.

## Steps

- [ ] 1. Add user cookie helpers and routes to `backend/src/platform/auth/auth.controller.ts`; keep admin route behavior unchanged and dispatch `/auth/refresh` only from distinct realm cookies.
  - _Requirements: 3.1, 3.3, 3.5, 8.6_
- [ ] 2. Add refresh/logout/me orchestration to `backend/src/platform/auth/tenant-auth.service.ts`, reloading user/role grants on refresh/me and writing lifecycle audit rows.
  - _Requirements: 3.1–3.4_
- [ ] 3. Add `backend/src/platform/auth/guards/tenant-access-token.guard.spec.ts` and extend E2E coverage for rotation, grace, reuse, logout, `/me`, and Redis failure.
  - _Requirements: 3.2, 3.4, 3.5, 7.2, 8.3_

## Requirements

- 3.1 — Valid user refresh rotation.
- 3.2 — Reuse detection and family revocation.
- 3.3 — Logout revocation/blacklist/clear-cookie/audit.
- 3.4 — Current `/auth/me` identity.
- 3.5 — Namespace separation.
- 7.2 — HTTP lifecycle coverage.
- 8.3 — Transaction/session reliability proof.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/auth.controller.ts` | Modify | User refresh/logout/me routes |
| `backend/src/platform/auth/tenant-auth.service.ts` | Modify | Session orchestration |
| `backend/src/platform/auth/guards/tenant-access-token.guard.ts` | Modify | User blacklist/fail-closed behavior |
| `backend/src/platform/auth/guards/tenant-access-token.guard.spec.ts` | Create | Guard tests |
| `backend/test/tenant-auth.e2e-spec.ts` | Create | Full lifecycle E2E |

<!-- contract:TenantMeResponse -->
```json
{
  "id": "string",
  "tenantId": "string",
  "tenantSlug": "string",
  "tenantName": "string",
  "username": "string",
  "email": "string|null",
  "phone": "string|null",
  "fullName": "string",
  "role": "string",
  "permissions": ["resource:action"],
  "mustChangePassword": false
}
```

## Completion Criteria

- [ ] Refresh rotates user cookie and access token; original token is rejected after grace/reuse policy.
- [ ] Logout revokes family, blacklists access token, clears cookie, and audits USER LOGOUT.
- [ ] `/auth/me` returns current `TenantMeResponse` and rejects revoked/wrong-realm tokens.
- [ ] Admin auth lifecycle tests remain unchanged and passing.

## Evidence

- [ ] Automated verification
  - Command(s): `PATH='<node-runtime>':$PATH pnpm --dir backend exec jest --runInBand src/platform/auth/guards/tenant-access-token.guard.spec.ts`; `PATH='<node-runtime>':$PATH pnpm --dir backend exec jest --config test/jest-e2e.json tenant-auth`
  - Expected proof: unit and Postgres/Redis lifecycle E2E exit 0.
- [ ] Artifact / runtime verification
  - Inspect: `Set-Cookie` for `nomo_user_rt`, Redis user keys, `/auth/me` response.
  - Expect: HttpOnly cookie, no raw token storage, current public identity.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `AuthController` routes registered by `AuthModule` in `AppModule`.
  - Expect: refresh/logout/me are HTTP routes, never 404.
- [ ] Contract / negative-path verification
  - Check: missing cookie, reused cookie, revoked access, admin cookie on user refresh, Redis unavailable.
  - Expect: 401/503 and no cross-realm session mutation.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Refresh reuse not detected | Critical | Lua CAS, family revocation, sequential/concurrent E2E |
| Logout only clears browser state | Critical | Server blacklist + family revoke assertions |
