# Task R5-01: User auth state and API client (P)

**Requirement:** R5 — Frontend session state
**Status:** pending
**Priority:** P0
**Estimated Effort:** M
**Dependencies:** tasks/task-R3-01-user-session-lifecycle.md, tasks/task-R4-01-authorization-password-change.md
**Spec:** specs/user-registration-authentication/
Contracts: TenantAuthResponse, TenantMeResponse

## Context

- **Why**: The frontend currently has only admin auth state and a mock user login.
- **Current state**: `frontend/stores/admin-auth-store.ts` and `frontend/lib/admin-api/fetch.ts` implement an admin-only refresh/retry pattern.
- **Target outcome**: User API/store/guard state is independent, memory-only, and refresh-aware.

## Constraints

- **MUST**: Keep access token in memory only; use `credentials: include`; deduplicate one refresh and retry once.
- **SHOULD**: Mirror proven admin store/fetch error handling without reusing admin identity/store.
- **MUST NOT**: Persist tokens in local/session storage or send refresh token in JS-readable headers.
- **SCOPE**: State/API/guard; visual forms are R5-02.

## Steps

- [ ] 1. Add `frontend/lib/user-auth-api.ts` with typed register/login/refresh/me/logout/change-password calls and stable Vietnamese error mapping.
  - _Requirements: 6.2, 6.5_
- [ ] 2. Add `frontend/stores/user-auth-store.ts` with hydrate/login/register/logout/changePassword/clear and `frontend/components/auth/user-auth-guard.tsx`; use the canonical response contracts.
  - _Requirements: 6.2–6.5_
- [ ] 3. Add a shared `frontend/lib/user-fetch.ts` retry helper and unit/integration-level state tests if the frontend test harness exists; otherwise document runtime proof in R7.3.
  - _Requirements: 6.3, 6.4, 7.3_

## Requirements

- 6.2 — Real user login API and memory-only token.
- 6.3 — Refresh hydration and bounded retry.
- 6.4 — Logout and independent user guard.
- 6.5 — Vietnamese error and forced-change state.
- 7.3 — Frontend state/runtime verification.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/user-auth-api.ts` | Create | User auth HTTP client |
| `frontend/lib/user-fetch.ts` | Create | Bearer + refresh/retry helper |
| `frontend/stores/user-auth-store.ts` | Create | In-memory user session |
| `frontend/components/auth/user-auth-guard.tsx` | Create | User route guard |
| `frontend/stores/admin-auth-store.ts` | Read | Existing pattern; must remain unchanged |

<!-- contract:TenantAuthResponse -->
```json
{
  "accessToken": "string",
  "user": {
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
}
```

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

- [ ] User store hydrates via refresh + `/auth/me` and clears state after refresh failure.
- [ ] No user auth token is persisted to localStorage/sessionStorage.
- [ ] One concurrent refresh is deduplicated and one request retry is bounded.
- [ ] User guard is importable by the user app layout and does not depend on admin state.

## Evidence

- [ ] Automated verification
  - Command(s): `PATH='<node-runtime>':$PATH pnpm --dir frontend build`; `PATH='<node-runtime>':$PATH pnpm --dir frontend lint`
  - Expected proof: build/lint exit 0; if a frontend test harness exists, focused store/client tests pass.
- [ ] Artifact / runtime verification
  - Inspect: `frontend/lib/user-auth-api.ts`, `frontend/stores/user-auth-store.ts` and browser storage after login.
  - Expect: bearer in memory, refresh handled only by HttpOnly cookie.
- [ ] Runtime reachability verification
  - Entrypoint/caller: user app layout → `UserAuthGuard` → `UserAuthStore.hydrate`.
  - Expect: unauthenticated user redirects to `/dang-nhap`; authenticated user reaches app.
- [ ] Contract / negative-path verification
  - Check: 401 refresh failure, 403 forced change, 429 throttle, 503 backend unavailable.
  - Expect: translated error state and cleared/unchanged safe fields as appropriate.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Token persisted by frontend accidentally | Critical | Storage inspection and code search |
| Refresh loop | High | Single-flight promise and one retry flag |
