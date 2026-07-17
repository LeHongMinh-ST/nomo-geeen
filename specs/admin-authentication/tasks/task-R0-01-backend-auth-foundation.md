# Task R0-01: Backend auth foundation

**Requirement:** R0 — Shared auth infrastructure (supports R8.1, R8.5, R9.1)
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** none
**Spec:** specs/admin-authentication/

## Context

- **Why**: The backend `src/` only has the default App files — no runtime Prisma client, no config loader, no Redis client, no cookie parsing. Every auth task depends on this shared foundation.
- **Current state**: `backend/src/app.module.ts` has empty `imports`; `backend/src/main.ts` only calls `app.listen`. `backend/.env.example` holds only `DATABASE_URL`. No docker-compose exists. Prisma 7 runtime must use the `@prisma/adapter-pg` driver adapter (see `backend/prisma.config.ts`).
- **Target outcome**: A bootable Nest app exposing injectable `PrismaService` and `RedisService`, a global `ConfigModule`, `cookie-parser` + global `ValidationPipe` registered, new auth env vars documented, and a `redis` service via docker-compose.

## Constraints

- **MUST**: Instantiate `PrismaClient` with the pg driver adapter (`@prisma/adapter-pg`) matching `prisma.config.ts`; load config via `@nestjs/config` (global). Register `cookie-parser`, a global `ValidationPipe({ whitelist: true, transform: true })`, and `app.enableCors({ origin: CORS_ORIGIN, credentials: true })` in `main.ts`. Pin the backend `PORT` (default 3001) so it does not clash with the Next.js dev server on 3000.
- **MUST**: Generate and apply the **initial Prisma migration** (`prisma migrate dev`/`deploy`) so `platform_admin` + `audit_log` tables exist — `backend/prisma/migrations/` does not yet exist and the model in `schema.prisma` alone does not create tables (R9.3).
- **MUST**: Add env vars `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `REDIS_URL`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `AUTH_COOKIE_SECURE`, `CORS_ORIGIN`, `PORT` to `backend/.env.example`, and `NEXT_PUBLIC_API_BASE_URL` to a `frontend/.env.example`, with placeholder (non-secret) values only (R8.5).
- **MUST**: `AUTH_COOKIE_SECURE` defaults to `true`; the app shall refuse to start (hard-error) if it is `false` while `NODE_ENV=production` (R8.4).
- **SHOULD**: Use `ioredis`; expose a `RedisService` with `get/set/del/eval` + a `ping()` health helper; connect lazily and log errors without leaking credentials. Configure the docker-compose `redis` with AOF persistence + a named volume (R9.4).
- **MUST NOT**: Commit real secrets; add auth business logic here (belongs to R1/R2/R3); introduce tenant-scoped logic.
- **SCOPE**: Implement only the shared foundation mapped to R0 and the approved `scope_lock`; do not add out-of-scope features or leave scoped acceptance criteria unwired.

## Steps

- [x] 1. Add dependencies and create `PrismaService` at `backend/src/platform/prisma/`
  - Business intent: give every service a single shared DB client.
  - Code detail: install `@nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt argon2 ioredis cookie-parser` (+ `@types/passport-jwt @types/cookie-parser` dev); `PrismaService extends PrismaClient implements OnModuleInit/OnModuleDestroy`, construct with `new PrismaPg({ connectionString: process.env.DATABASE_URL })` adapter; export a `@Global()` `PrismaModule`.
  - _Requirements: 9.1_

- [x] 2. Create `RedisModule` + `RedisService` at `backend/src/platform/redis/`
  - Business intent: shared low-latency store for token state, with fail-closed health and atomic ops.
  - Code detail: `RedisService` wraps an `ioredis` client from `REDIS_URL`; expose `get`, `set(key,val,ttlSec)`, `del`, `eval` (for the rotation Lua CAS in R3-01), `ping()`; `@Global()` module; surface a typed error so guards fail closed (R9.1).
  - _Requirements: 9.1_

- [x] 3. Materialize the schema via Prisma migration
  - Business intent: ensure the tables actually exist before seed/serve.
  - Code detail: run `pnpm --dir backend prisma migrate dev --name init` (or `prisma db push` for local) to create `backend/prisma/migrations/`; document `prisma migrate deploy` for deploy. Verify `platform_admin` + `audit_log` exist.
  - _Requirements: 9.3_

- [x] 4. Wire global config + `main.ts` bootstrap, CORS, port, and document env
  - Business intent: load secrets from env, enable cookie + DTO validation + credentialed CORS.
  - Code detail: import `ConfigModule.forRoot({ isGlobal: true })`, `PrismaModule`, `RedisModule` in `AppModule`; in `main.ts` add `app.use(cookieParser())`, `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`, `app.enableCors({ origin: process.env.CORS_ORIGIN, credentials: true })`, and `app.listen(process.env.PORT ?? 3001)`; enforce the Secure-cookie prod guard; append new vars to `backend/.env.example` + create `frontend/.env.example`; add a `redis:7` service (AOF + volume) to a new root `docker-compose.yml` (postgres + redis).
  - _Requirements: 8.1, 8.4, 8.5, 9.4_

- [x] 5. Verification implementation
  - Smoke: `pnpm --dir backend build` compiles; migration applied; `pnpm --dir backend start` boots without throwing; confirm `RedisService.ping()` and `PrismaService` connect against local infra; confirm the app refuses to start with `AUTH_COOKIE_SECURE=false` + `NODE_ENV=production`.
  - _Requirements: 9.1, 9.3_

## Requirements

- 8.1 — Separate signing secrets loaded from env (vars introduced here).
- 8.4 — `AUTH_COOKIE_SECURE` defaults true; prod refuses non-Secure cookie.
- 8.5 — New env vars documented in `.env.example` (backend + frontend) without real secrets.
- 9.1 — Redis + Prisma providers available so downstream can fail closed when Redis is unreachable.
- 9.3 — Initial Prisma migration materializes `platform_admin` + `audit_log`.
- 9.4 — docker-compose Redis configured with AOF persistence + volume.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/package.json` | Modify | Add auth/runtime dependencies |
| `backend/src/platform/prisma/prisma.service.ts` | Create | Shared PrismaClient with pg adapter |
| `backend/src/platform/prisma/prisma.module.ts` | Create | Global Prisma module |
| `backend/src/platform/redis/redis.service.ts` | Create | ioredis wrapper + eval + ping health |
| `backend/src/platform/redis/redis.module.ts` | Create | Global Redis module |
| `backend/prisma/schema.prisma` | Read | Source for the initial migration |
| `backend/src/app.module.ts` | Modify | Import ConfigModule, PrismaModule, RedisModule |
| `backend/src/main.ts` | Modify | cookie-parser + ValidationPipe + enableCors + PORT + Secure guard |
| `backend/.env.example` | Modify | Document JWT/Redis/cookie/CORS/PORT/bootstrap env vars |
| `frontend/.env.example` | Create | Document `NEXT_PUBLIC_API_BASE_URL` |
| `docker-compose.yml` | Create | postgres + redis:7 (AOF + volume) |

## Completion Criteria

- [x] `PrismaService` and `RedisService` (with `eval`) are injectable and exported from global modules imported by `AppModule`.
- [x] The initial Prisma migration exists under `backend/prisma/migrations/` and creates `platform_admin` + `audit_log`.
- [x] `main.ts` registers cookie-parser, ValidationPipe, credentialed CORS, pinned PORT, and the Secure-cookie prod guard; app boots.
- [x] `backend/.env.example` + `frontend/.env.example` list all new vars with placeholders; no real secret committed.
- [x] `docker-compose.yml` defines a persistent `redis:7` (AOF + volume); `RedisService.ping()` returns `PONG`.

## Evidence

- [x] Automated verification (smoke)
  - Command(s): `pnpm --dir backend build` then `pnpm --dir backend check` then `pnpm --dir backend prisma migrate deploy`
  - Expected proof: TypeScript build exits 0; Biome check passes; migration applies and reports the created tables.
- [x] Artifact / runtime verification
  - Inspect: `backend/prisma/migrations/` + app boot log + `RedisService.ping()` against `docker compose up -d redis postgres`
  - Expect: migration dir present; Nest boots; `ping()` returns `PONG`; `\dt` shows `platform_admin`, `audit_log`.
- [x] Runtime reachability verification
  - Entrypoint/caller: `backend/src/app.module.ts` imports; `backend/src/main.ts` bootstrap
  - Expect: `ConfigModule`, `PrismaModule`, `RedisModule` imported in `AppModule`; providers resolvable by downstream auth modules.
- [x] Contract / negative-path verification
  - Check: start app with `REDIS_URL` pointing to an unreachable host
  - Expect: `RedisService` surfaces a connection error (does not crash silently) so guards fail closed per R9.1.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Prisma 7 pg adapter misconfiguration at runtime | High | Mirror `prisma.config.ts`; verify connection in smoke boot |
| argon2/ioredis native build failing in Docker image | Medium | Ensure build deps present; document in compose/image notes |
| Committing a real secret to `.env.example` | High | Placeholder values only; reviewed in code review |

---

> **Parallel marker**: Foundation task — blocks most others; not parallel.
> **Requirement mapping**: Every sub-task ends with `_Requirements: X.X_`.
> **Evidence rule**: `## Evidence` present above.

## Verification Receipt — 2026-07-17 (full-spec /develop)

**Commands run:**
- `pnpm --dir backend build` → exit 0 (nest build clean).
- `pnpm --dir backend check` → "No fixes applied" (Biome clean; `import type` no longer reverted thanks to biome-ignore).
- `pnpm --dir backend prisma migrate dev --name init --url postgresql://...5434/nomogreen` → created & applied `prisma/migrations/20260717053127_init/`.
- `docker exec nomogreen-postgres psql -d nomogreen -c "\dt"` → `platform_admin` + `audit_log` present (20 tables total).

**Runtime proof:**
- App boot: `node dist/src/main.js` (PORT 3457) → log `Nest application successfully started`; `curl GET / → 200`.
- Nest context smoke: `RedisService.ping() → PONG`; `PrismaService` queried `platform_admin` (0 rows); Redis `set/get/del` round-trip → `ok`.

**Negative-path proof:**
- `NODE_ENV=production AUTH_COOKIE_SECURE=false node dist/src/main.js` → `[bootstrap] fatal: AUTH_COOKIE_SECURE=false is not allowed when NODE_ENV=production` (app refuses to listen, exits 1). Satisfies R8.4.

**Infra:** `docker compose up -d` → `nomogreen-postgres` (5434), `nomogreen-redis` (6379, AOF `--appendonly yes` + volume) both healthy.

**Code review:** code-auditor initial 4/10, Critical = 1 (Biome reverting the DI import fix, breaking boot). Fixed via `biome-ignore` + `bootstrap().catch()`; re-verified boot + smoke + negative-path all pass.

**Outcome:** PASS. All Completion Criteria met with fresh runtime proof.

**Note:** Real `.env` is privacy-hook protected (still points at 5432); migration/smoke used explicit `--url`/env override to 5434. Operators must set `DATABASE_URL` port 5434 in `.env` to match `docker-compose.yml` (documented in `.env.example`).
