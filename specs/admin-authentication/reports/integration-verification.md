# Integration Verification — admin-authentication

**Date:** 2026-07-17
**Mode:** `/hapo:develop` full-spec, final integration gate (task R2-02)
**Infra:** `docker compose up -d` → `nomogreen-postgres` (host 5434), `nomogreen-redis` (6379, AOF + volume).

## Commands run

```bash
docker compose up -d postgres redis
DATABASE_URL=...5434 pnpm --dir backend prisma migrate deploy   # 1 migration, no pending
# full lifecycle + reachability
DATABASE_URL=...5434 REDIS_URL=redis://localhost:6379 JWT_* AUTH_COOKIE_SECURE=true \
  npx jest --config ./test/jest-e2e.json auth-flow            # 2/2 passed
# whole e2e suite together
... npx jest --config ./test/jest-e2e.json                    # 14/14 passed (4 suites)
# full unit suite
REDIS_URL=redis://localhost:6379 npx jest                     # 30/30 passed (6 suites)
pnpm --dir backend build && pnpm --dir backend check          # clean
```

## Full lifecycle proof (`auth-flow.e2e-spec.ts`, real Postgres + Redis)

1. `POST /auth/admin/login` → 200 + `AdminLoginResponse` + `Set-Cookie nomo_admin_rt` (HttpOnly, SameSite=Strict, Path=/auth).
2. `GET /auth/me` with the access token → 200 (current admin).
3. `POST /auth/refresh` → 200, rotated access + new refresh cookie (cookie ≠ previous).
4. Reuse of the original (rotated-out) refresh cookie → **401** + an `REFRESH_REUSE_DETECTED` audit row is written (theft signal).
5. `POST /auth/logout` with the current access token → 204.
6. Post-logout: the logged-out access token → **401** on `/auth/me` (blacklist + family revoked).
7. Audit trail: `LOGIN` and `LOGOUT` rows present.

## Reachability

- `AuthModule` is imported by `AppModule` (`src/app.module.ts:14`).
- All auth routes respond (never 404): `/auth/me` → 401 unauth, `/auth/refresh` → 401 no-cookie, `/auth/admin/login` (empty body) → 400. Proven in the reachability test.
- Frontend `/admin/login` renders `AdminLoginForm` → calls `lib/auth-api.ts` → real backend; redirect target `/admin` exists.

## Fail-closed (R9.1)

- With `REDIS_URL` pointed at a dead port, `AuthService.login` throws `ServiceUnavailableException` (**503**) — no session is granted on unverifiable token state. App still boots (lazy connect); the call site fails closed via `redisGuard`.
- Guard path (`/auth/me`) likewise returns 503 when the blacklist check cannot reach Redis (unit-proven in `access-token.guard.spec.ts`).

## Log hygiene (R8.2)

- `grep` over `src/platform/auth/` for `console`/`logger` lines containing token/password/hash/secret → **no matches**. Audit rows store only `actorId`/`ip`/`userAgent`, never token or hash.

## Cross-origin (FE ↔ BE)

- CORS preflight `OPTIONS /auth/admin/login` (Origin `http://localhost:3000`) → 204 with `Access-Control-Allow-Origin: http://localhost:3000` + `Access-Control-Allow-Credentials: true`.
- Credentialed login over HTTP returns the exact `AdminLoginResponse` + refresh cookie; wrong password → 401.

## Performance sanity (R7.1, qualitative)

- Login (incl. Argon2id `p=2` verify) completes well within interactive latency on this dev host — each e2e login round-trip is part of suites finishing in ~1.3s total; no CI-gated budget imposed (per validation decision).

## Result

**PASS** — the full admin-auth lifecycle works end-to-end against real Postgres + Redis, all surfaces are reachable, fail-closed and log-hygiene hold, and the FE↔BE contract is proven.

**Environment note:** interactive browser click-through was not run (headless environment). The FE→BE path is proven at the HTTP/CORS contract level plus a compiled Next.js build with the wired form; a human browser pass is the remaining manual confirmation.
