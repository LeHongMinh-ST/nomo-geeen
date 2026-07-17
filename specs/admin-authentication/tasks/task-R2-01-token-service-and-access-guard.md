# Task R2-01: Token service and access guard

**Requirement:** R2 — Access Token Issuance & Verification
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** task-R0-01-backend-auth-foundation.md
**Spec:** specs/admin-authentication/

## Context

- **Why**: Guarded admin endpoints need a stateless, signed access token plus instant revocation. This task builds token signing/verifying and the `AccessTokenGuard` (passport-jwt + Redis blacklist check).
- **Current state**: greenfield — no JWT strategy, no guard. `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` added in R0-01; `RedisService` available from R0-01.
- **Target outcome**: `TokenService` signs/verifies access (~15m) and refresh (~30d) JWTs with separate secrets; `AccessTokenStrategy` + `AccessTokenGuard` authenticate bearer tokens and reject blacklisted ones; guarded routes expose the admin identity.

## Constraints

- **MUST**: Sign access JWT with `JWT_ACCESS_SECRET` (~15m, payload `{ sub, email, role, type:'access', familyId }`) and refresh JWT with `JWT_REFRESH_SECRET` (~30d, payload `{ sub, familyId, type:'refresh' }`); verify asserts the correct `type` claim. The access token carries `familyId` so logout can revoke the family from the bearer token (R4.1). Guard checks the Redis blacklist and rejects on hit (R2.4). Match the canonical Auth/session contract in `design.md`.
- **SHOULD**: Read TTLs from `JWT_ACCESS_TTL`/`JWT_REFRESH_TTL`; keep `TokenService` free of HTTP concerns.
- **MUST NOT**: Reuse one secret for both token types; grant access when Redis is unreachable (fail closed → 503, R9.1); log full token values.
- **SCOPE**: Implement only token signing/verifying + access guard mapped to R2 and the approved `scope_lock`; refresh rotation state lives in R3-01, endpoints in R1-02/R3-02.

## Steps

- [x] 1. Create `TokenService` at `backend/src/platform/auth/token.service.ts`
  - Business intent: single source for signing/verifying both token types.
  - Code detail: use `JwtService` with two secrets; `signAccess(admin, familyId)` (embeds `familyId`), `signRefresh(adminId, familyId)`, `verifyAccess(token)`, `verifyRefresh(token)`; assert `type` claim on verify and throw `UnauthorizedException` on mismatch/expiry.
  - _Requirements: 2.1_

- [x] 2. Create `AccessTokenStrategy` + `AccessTokenGuard`
  - Business intent: authenticate bearer tokens and enforce revocation.
  - Code detail: `AccessTokenStrategy extends PassportStrategy(Strategy,'jwt')` with `ExtractJwt.fromAuthHeaderAsBearerToken()` and `JWT_ACCESS_SECRET`; `validate(payload)` returns admin identity. `AccessTokenGuard extends AuthGuard('jwt')` overrides `canActivate` to first call `RedisService.isAccessBlacklisted(token)` (reject 401 on hit; on Redis error throw 503 → fail closed) then `super.canActivate`.
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 3. Verification implementation
  - Unit `token.service.spec.ts`: access verified with access secret only; refresh token rejected by `verifyAccess`; expired token throws; access payload carries `familyId`. Guard unit/integration: valid token passes; blacklisted token → 401; Redis-down → 503.
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

## Requirements

- 2.1 — Access token signed with access secret, ~15m expiry, `{sub,email,role,type:'access',familyId}` payload.
- 2.2 — Valid bearer token allows the request and exposes admin identity.
- 2.3 — Missing/malformed/expired/wrong-secret token → 401.
- 2.4 — Blacklisted (revoked) token → 401 even if otherwise valid.
  - Note: The former ≤5ms guard-latency budget (a deferred performance criterion) was dropped at validation (2026-07-17); the blacklist check stays O(1) but is not a gated metric.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/token.service.ts` | Create | Sign/verify access + refresh JWT |
| `backend/src/platform/auth/strategies/access-token.strategy.ts` | Create | passport-jwt access strategy |
| `backend/src/platform/auth/guards/access-token.guard.ts` | Create | Bearer guard + Redis blacklist check |
| `backend/src/platform/auth/token.service.spec.ts` | Create | Unit tests for signing/verifying |

## Completion Criteria

- [x] `TokenService` signs access/refresh with distinct secrets and correct TTLs; verify asserts `type`.
- [x] `AccessTokenGuard` allows valid tokens, rejects missing/expired/wrong-secret with 401.
- [x] A blacklisted access token is rejected with 401 (R2.4).
- [x] Redis unreachable during guard check → 503 (fail closed), never grants access.

## Evidence

- [x] Automated verification (unit/integration)
  - Command(s): `pnpm --dir backend test -- token.service` and `pnpm --dir backend test -- access-token.guard`
  - Expected proof: suites pass; cross-secret rejection + blacklist rejection assertions green.
- [x] Artifact / runtime verification
  - Inspect: decoded access JWT payload
  - Expect: contains `sub,email,role,type:'access'` and `exp` ≈ 15m ahead.
- [x] Runtime reachability verification
  - Entrypoint/caller: `AccessTokenGuard` applied on `GET /auth/me` (R1-02) and future guarded routes
  - Expect: strategy + guard registered in `AuthModule`; usable via `@UseGuards(AccessTokenGuard)`.
- [x] Contract / negative-path verification
  - Check: present a refresh token to `verifyAccess`; present a blacklisted token to the guard; disconnect Redis
  - Expect: `verifyAccess` throws; guard returns 401 for blacklist, 503 on Redis error.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Same secret used for both token types | High | Separate env secrets + `type` claim assertion (R8.1) |
| Redis error silently granting access | High | Explicit fail-closed → 503 (R9.1) |
| Token value leaking into logs | Medium | Hash/omit token in any log line (R8.2) |

---

> **Parallel marker**: independent of R1-01; shares Redis with R3-01.
> **Requirement mapping**: sub-tasks end with `_Requirements: X.X_`.
> **Evidence rule**: `## Evidence` present above.

## Verification Receipt — 2026-07-17 (full-spec /develop)

**Commands run:**
- `npx jest token.service access-token.guard` → **10 passed / 10 total**.
- Full suite `npx jest` → **24 passed / 24 total** (no regression).
- `pnpm --dir backend build` → exit 0; `pnpm --dir backend check` → clean.

**Artifact proof:**
- `token.service.ts` — `signAccess(admin, familyId)` payload `{sub,email,role,type:'access',familyId}` / `JWT_ACCESS_SECRET`; `signRefresh` `{sub,familyId,type:'refresh'}` / `JWT_REFRESH_SECRET` (separate, R8.1); verify asserts `type` + pins `HS256`; separate-secret cross-rejection proven.
- `access-token.strategy.ts` — passport-jwt `'jwt'`, bearer extract, asserts secret non-empty, `algorithms:['HS256']`.
- `access-token.guard.ts` — blacklist check via `RefreshTokenStore.isAccessBlacklisted` BEFORE `super.canActivate`; blacklist → 401; Redis error → 503 (fail closed, R9.1); missing token → 401.

**Negative-path proof (unit):** refresh→verifyAccess throws; wrong-secret forged→throws; expired→throws; blacklisted→401 (store called with exact token); missing header→401 (store NOT called); Redis-down→503.

**Reachability:** strategy+guard registration in `AuthModule` and `@UseGuards` on `/auth/me` are owned by R1-02 (deferred); this task ships the reusable service+guard with unit proof.

**Code review:** code-auditor SPEC_PASS, 9/10, 0 Critical. Applied fixes: (MEDIUM) strategy now throws on empty `JWT_ACCESS_SECRET` instead of `?? ''` fallback (removes forge-with-empty-secret risk); (LOW) pinned `algorithms:['HS256']` on all verifies.

**Outcome:** PASS.
