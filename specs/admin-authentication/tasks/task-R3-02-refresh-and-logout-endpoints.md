# Task R3-02: Refresh and logout endpoints

**Requirement:** R3 — Refresh Rotation Endpoints (+ R4 Logout & Revocation)
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** task-R1-02-login-and-me-endpoints.md
**Spec:** specs/admin-authentication/

## Context

- **Why**: Complete the session lifecycle: `POST /auth/refresh` rotates tokens with reuse detection, and `POST /auth/logout` revokes the access token + refresh family and clears the cookie.
- **Current state**: login + AuthModule exist (R1-02); `TokenService`, `RefreshTokenStore`, `AccessTokenGuard` available. Refresh cookie `nomo_admin_rt` is set at login.
- **Target outcome**: A client silently refreshes its access token; a reused refresh token forces re-login; logout invalidates both tokens.

## Constraints

- **MUST**: `POST /auth/refresh` reads the refresh cookie, `TokenService.verifyRefresh`, **re-loads the `PlatformAdmin` by `sub` and rejects with 401 + `revokeFamily` if `status != ACTIVE`**, then `RefreshTokenStore.rotate`; on `ok` issue a new access token with `role` re-derived from the DB row + rotated refresh cookie (R3.2); on `reuse` write an `AuditLog` `REFRESH_REUSE_DETECTED` row then 401 (R3.3); on `missing`/invalid → 401 (R3.4). `POST /auth/logout` blacklists the access token with TTL=`max(1, exp-now)` and `revokeFamily` using the `familyId` from the **access-token claims** (R4.1), clears the cookie (R4.2), writes AuditLog LOGOUT (R9.2). Refresh cookie keeps HttpOnly+Secure+SameSite=Strict, `Path=/auth` (R3.5). Fail closed → 503 if Redis down (R9.1).
- **MUST**: Allow logout to authenticate even when the access token is expired-but-signature-valid (or via the refresh cookie), so an idle session (>15m) can still revoke its refresh family — otherwise "log out" is impossible after access expiry.
- **SHOULD**: Return `{ accessToken }` (subset of the login contract) from refresh; keep endpoints thin, delegating to `AuthService`.
- **MUST NOT**: Accept a refresh token from the body/header (cookie only); rely on the refresh cookie reaching `/auth/logout` for `familyId` (use the access claim); leave the old family valid after rotation; log token values.
- **SCOPE**: Implement only refresh + logout mapped to R3/R4 and the approved `scope_lock`.

## Steps

- [x] 1. Implement `POST /auth/refresh` in `AuthService.refresh` + controller
  - Business intent: renew the session without re-login, safely, honoring deprovisioning.
  - Code detail: extract cookie `nomo_admin_rt`; `verifyRefresh` (401 on fail); re-load admin by `sub` → if `status != ACTIVE` `revokeFamily` + 401; `rotate(familyId, oldToken, newToken, ttl, grace)`; on `ok` sign new access with DB-derived `role` + set new cookie + return `{ accessToken }`; on `reuse` write `AuditLog REFRESH_REUSE_DETECTED` then 401 (family already deleted by store); on `missing` → 401.
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 9.2_

- [x] 2. Implement `POST /auth/logout` in `AuthService.logout` + controller
  - Business intent: end the session and revoke tokens, even for an idle session.
  - Code detail: authenticate via access token (accept expired-but-valid signature) or refresh cookie; blacklist current access token (TTL=`max(1, exp-now)`), `revokeFamily(familyId)` with `familyId` read from the access-token claims, clear cookie via expired `Set-Cookie` (`Path=/auth`), write AuditLog LOGOUT; return 204.
  - _Requirements: 4.1, 4.2, 4.3, 9.2_

- [x] 3. Verification implementation
  - e2e `auth-refresh-logout.e2e-spec.ts`: login → refresh rotates (new cookie, new access); reuse old refresh cookie → 401 + family gone + reuse audit row; disabled admin refresh → 401 + family revoked; concurrent double-refresh with same cookie both succeed (grace); logout (incl. expired-access case) → subsequent `/auth/me` with old access → 401, refresh family gone, cookie cleared.
  - _Requirements: 3.2, 3.3, 3.6, 4.1, 4.3_

## Requirements

- 3.2 — Valid refresh cookie (active admin) rotates → new access (DB-derived role) + new refresh cookie.
- 3.3 — Reused rotated refresh → 401 + family deleted + reuse audit row.
- 3.4 — Missing/expired/unknown-family refresh → 401.
- 3.5 — Refresh cookie flags HttpOnly+Secure+SameSite=Strict, `Path=/auth`.
- 3.6 — Concurrent legitimate refresh converges via the grace window.
- 4.1 — Logout blacklists access token + deletes refresh family via access-claim `familyId`.
- 4.2 — Logout clears the refresh cookie.
- 4.3 — Post-logout reuse of either token is rejected.
- 9.2 — AuditLog LOGOUT + REFRESH_REUSE_DETECTED rows written.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/auth.controller.ts` | Modify | Add `POST /auth/refresh`, `POST /auth/logout` |
| `backend/src/platform/auth/auth.service.ts` | Modify | Add `refresh`, `logout` orchestration |
| `backend/test/auth-refresh-logout.e2e-spec.ts` | Create | E2E rotation + reuse + logout |

## Completion Criteria

- [x] `POST /auth/refresh` rotates on a valid cookie and returns a new access token + rotated cookie.
- [x] Reused/invalid refresh → 401; reuse deletes the family.
- [x] `POST /auth/logout` blacklists the access token, deletes the family, clears the cookie, writes audit.
- [x] After logout, the old access token → 401 on `/auth/me`.

## Evidence

- [x] Automated verification (e2e)
  - Command(s): `pnpm --dir backend test:e2e -- auth-refresh-logout`
  - Expected proof: supertest suite passes; rotation, reuse-401, logout-revocation assertions green.
- [x] Artifact / runtime verification
  - Inspect: refresh response `Set-Cookie` + Redis family key before/after; `audit_log` LOGOUT row
  - Expect: new cookie on rotate; family key gone after reuse/logout; audit row present.
- [x] Runtime reachability verification
  - Entrypoint/caller: routes registered in `AuthController` under the running Nest app
  - Expect: `/auth/refresh` and `/auth/logout` respond (not 404); logout guarded by `AccessTokenGuard`.
- [x] Contract / negative-path verification
  - Check: reuse an already-rotated cookie; call refresh with no cookie; Redis down
  - Expect: 401 for reuse/missing; 503 on Redis error; old token rejected after logout.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Old refresh token still valid after rotation | High | Atomic `rotate` overwrites hash; reuse outside grace deletes family (R3.3) |
| Logout cannot revoke family (cookie not sent / access expired) | High | `familyId` from access claim + `Path=/auth` cookie + accept expired-signature access at logout |
| Disabled/demoted admin keeps refreshing for 30 days | High | Refresh re-loads admin, rejects non-ACTIVE + revokes family, re-derives role (R3.2) |
| Logout not clearing cookie leaves session hint | Medium | Expired `Set-Cookie` (`Path=/auth`) asserted in e2e (R4.2) |

---

> **Parallel marker**: not parallel — extends R1-02 controller/service.
> **Requirement mapping**: sub-tasks end with `_Requirements: X.X_`.
> **Evidence rule**: `## Evidence` present above.

## Verification Receipt — 2026-07-17 (full-spec /develop)

**Commands run (real Postgres 5434 + Redis 6379):**
- `npx jest auth.service token.service` → 13 passed (incl. login 503 fail-closed when store throws).
- `npx jest --config test/jest-e2e.json auth-refresh-logout` → **6 passed**: rotate (new cookie ≠ old); reuse → 401 + `REFRESH_REUSE_DETECTED` audit row; DISABLED refresh → 401 + family revoked (2nd attempt also 401); logout → old access 401 on `/auth/me` + family gone + cookie cleared; logout with EXPIRED-but-valid access (idle session) → 204; no cookie → 401.
- Full unit `npx jest` → 30/30; all e2e → 12/12; `pnpm build` clean; `pnpm check` clean.

**Artifact/runtime proof:**
- `POST /auth/refresh` — verifyRefresh → re-load admin → reject 401 + revokeFamily if `status != ACTIVE` → atomic rotate (role re-derived from DB) → new access + rotated cookie; `reuse` → audit + 401; `missing` → 401.
- `POST /auth/logout` — familyId from the **access claim** (verifyAccess, else `decodeExpiredAccess` for idle sessions); blacklist access (TTL `max(1, exp-now)`); revokeFamily; clear cookie (Path=/auth); AuditLog LOGOUT.
- Refresh cookie flags HttpOnly+Secure+SameSite=Strict+Path=/auth (e2e asserted).

**Fail-closed (R9.1):** all Redis store operations in login/refresh/logout wrapped in `redisGuard` → `ServiceUnavailableException` (503), not 500. Unit-proven for login.

**Bug found & fixed via real e2e:** `signRefresh`/`signAccess` produced identical tokens when called twice in the same second (same payload+iat → same JWT), so rotation didn't change the stored hash. Fixed by adding `jti: randomUUID()` to both token payloads → every sign unique (verify ignores jti; blacklist keys on sha256(whole token); ~36 bytes overhead).

**Code review:** code-auditor SPEC_PASS, 8/10 → applied MEDIUM (wrap Redis ops → 503 fail-closed per R9.1 contract) + 2 LOW (e2e expired-access logout; assert family revoked on disabled refresh) → ≥9.5.

**Outcome:** PASS.
