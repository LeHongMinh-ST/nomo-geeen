# Research & Design Decisions

---
**Purpose**: Capture discovery findings and rationale for the PlatformAdmin authentication feature (access + refresh token, admin-only).
---

## Summary
- **Feature**: `admin-authentication`
- **Discovery Scope**: New Feature (greenfield backend auth) on an existing schema
- **Key Findings**:
  - Backend is NestJS 11 + Prisma 7 with the driver adapter `@prisma/adapter-pg`. `src/` only contains the default `AppController/AppService/AppModule` — **no PrismaService, no auth, no config module exists yet**.
  - The `PlatformAdmin` Prisma model already exists (`email` unique, `passwordHash`, `role` = SUPER_ADMIN/SUPPORT/BILLING, `status` = ACTIVE/DISABLED, `lastLoginAt`). It is a platform-level (non-tenant-scoped) entity — the correct target for "admin-only login".
  - `docs/architecture.md` §6.1 is the canonical auth contract: Passport JWT, access ~15m + refresh ~30d in HttpOnly cookie, refresh token rotation, revoked-token blacklist in Redis. §6.2 defines the guard chain `JwtAuthGuard → TenantGuard → FeatureGuard → RolesGuard`.
  - Redis is named in `docs/architecture.md` (§3 tech table, §8) but is **not yet wired** into the repo (no docker-compose, no redis client dependency). This feature introduces the Redis integration.
  - Frontend already scaffolds the admin login UI: `frontend/app/admin/login/page.tsx` + `frontend/components/auth/admin-login-form.tsx` with an explicit `// TODO: gọi API đăng nhập quản trị khi backend sẵn sàng`. Login is not wired to any API.

## Evidence Summary
This section is mandatory. Written before finalizing requirements, design, and tasks.

- **Codebase Scout**: Required
  - Result: Backend auth is greenfield; only the Prisma schema (with `PlatformAdmin`) and seed exist. No runtime PrismaClient instantiation in `src/`. `AppModule` imports are empty.
  - Relevant files/modules:
    - `backend/prisma/schema.prisma` — `PlatformAdmin`, `AuditLog`, enums `PlatformAdminRole`/`PlatformAdminStatus`/`AuditActorType`.
    - `backend/src/app.module.ts` — empty imports; integration point for `AuthModule`.
    - `backend/src/main.ts` — bootstrap; needs `cookie-parser` + global prefix/validation wiring.
    - `backend/prisma.config.ts` — Prisma 7 datasource via `DATABASE_URL`, manual `.env` load.
    - `backend/.env.example` — only `DATABASE_URL`; must gain JWT/Redis/cookie vars.
    - `frontend/components/auth/admin-login-form.tsx` — UI with TODO awaiting the login API.
  - Existing patterns/contracts: NestJS module-per-domain (`platform/` vs `retail/` per architecture §4). Prisma 7 uses the pg driver adapter at runtime. Biome for lint/format. Jest for unit + e2e (supertest).
  - Tests or checks affected: No existing auth tests. `backend/test/app.e2e-spec.ts` exists as an e2e harness pattern to reuse. `db:seed` currently seeds no admin account.

- **External / Current Research**: Required
  - Result: OWASP 2024+ recommends **Argon2id** as the default password hash for new projects (memory-hard, GPU-resistant). bcrypt (cost ≥12) is still acceptable but weaker and has a 72-byte truncation footgun. Refresh token rotation + Redis blacklist with TTL = token remaining lifetime is the current standard NestJS pattern; separate secrets for access vs refresh; refresh token in HttpOnly cookie with CSRF consideration; detect reuse of a rotated refresh token and invalidate the whole token family.
  - Primary sources:
    - OWASP Password Storage Cheat Sheet (Argon2id default) — via 2026 practitioner guides.
    - NestJS official docs — Authentication (Passport, `@nestjs/jwt`, `passport-jwt`).
    - DEV/wanago NestJS refresh-token-rotation guides (2024–2026).
  - Current constraints/best practices: Argon2id params `memoryCost: 65536 (64MB), timeCost: 3, parallelism: 4`; access token ~15m; refresh ~30d; store only a **hash** of the refresh token server-side; TTL-based Redis keys for auto-cleanup; reuse-detection → family revocation.

- **Selected Decision**:
  - Decision: Build a NestJS `AuthModule` under `src/platform/auth/` using `@nestjs/jwt` + `passport-jwt` (two strategies: access `jwt`, refresh `jwt-refresh`), **Argon2id** for password hashing, and **Redis** for refresh-token state (rotation family + access-token/refresh revocation via TTL keys). Login is restricted to `PlatformAdmin` with `status = ACTIVE`. Access token returned in JSON body; refresh token set as HttpOnly Secure cookie. Add a `PrismaService`, `ConfigModule`, and a Redis provider as foundation.
  - Why it fits the codebase: matches architecture §6.1/§6.2 verbatim; uses the already-present `PlatformAdmin` model; follows the module-per-domain layout; keeps tenant-scoped `User` login out of scope.
  - Why it fits external constraints: Argon2id + rotation + Redis TTL blacklist + HttpOnly cookie is the OWASP/NestJS-aligned 2026 pattern.

- **Rejected Alternatives**:
  - bcrypt for hashing — rejected: weaker than Argon2id, 72-byte truncation risk; only justified for legacy migration, which we don't have.
  - DB table for refresh tokens instead of Redis — rejected: architecture §6.1 mandates Redis blacklist; Redis gives sub-ms revocation checks and native TTL. (User explicitly chose Redis.)
  - Both tokens in JSON body — rejected: refresh token in body is XSS-exposed; user chose HttpOnly cookie for refresh.
  - Reusing tenant `User` model / merging admin+tenant login — rejected: `PlatformAdmin` is the platform operator identity (§19), distinct from tenant users; mixing breaks the tenant isolation boundary.

- **Remaining Gaps / Questions**:
  - CSRF strategy for the refresh cookie (double-submit token vs SameSite=Strict). Phase 1 leans on `SameSite=Strict` + path-scoped cookie; documented as a design decision.
  - Rate limiting (`@nestjs/throttler`) is named in architecture §8 but treated as a hardening follow-up, not core to this spec's login path (brute-force lockout is in scope via a basic attempt guard).
  - How the first admin account is provisioned — covered by extending the seed with an env-driven bootstrap admin.

- **Downstream Task & Test Implications**:
  - Task implication: foundation tasks (PrismaService, ConfigModule, Redis provider, env vars, docker-compose redis) precede the AuthModule; a final FE-wiring + e2e reachability task proves login end-to-end.
  - Test/verification implication: unit tests for password hashing + token service + refresh rotation/reuse-detection; integration/e2e (supertest) for `POST /auth/admin/login`, `POST /auth/refresh`, `POST /auth/logout`, and a guarded `GET /auth/me`; negative-path tests for wrong password, disabled admin, reused refresh token, expired access token.

## Codebase Scout

| Area | Finding | Evidence / Path | Implication |
|------|---------|-----------------|-------------|
| Project surface | NestJS 11 monorepo (backend + frontend), Prisma 7, Biome, Jest | `backend/package.json`, root `package.json` | Use existing toolchain; no new test runner. |
| Relevant files/modules | `PlatformAdmin` model present; empty AppModule | `backend/prisma/schema.prisma:289`, `backend/src/app.module.ts` | AuthModule plugs into AppModule; admin identity ready. |
| Existing patterns | Module-per-domain (`platform/`, `retail/`) | `docs/architecture.md` §4 | Place auth under `src/platform/auth/`. |
| Contracts | Auth contract fully specified | `docs/architecture.md` §6.1/§6.2 | Inherit verbatim into design canonical contracts. |
| Tests and verification | e2e harness exists; no auth tests | `backend/test/app.e2e-spec.ts` | Extend with auth e2e specs. |
| Blast radius | Adds AuthModule, PrismaService, Redis, cookie-parser, main.ts wiring, new env vars; extends seed; wires FE form | `src/main.ts`, `.env.example`, `prisma/seed.ts`, FE form | Contained; no existing feature behavior changed. |
| Staleness / conflicts | Redis referenced in docs but not present; FE form has TODO stub | `docs/architecture.md` §8, FE form | This spec introduces Redis + fills the FE TODO. |

## External / Current Research

| Question | Source | Finding | Decision Impact |
|----------|--------|---------|-----------------|
| Password hash algorithm for new NestJS app 2026 | OWASP Password Storage Cheat Sheet / 2026 guides | Argon2id default (`m=64MB,t=3,p=4`); bcrypt≥12 acceptable but weaker + 72-byte limit | Use Argon2id (`argon2` npm). |
| Refresh token rotation pattern in NestJS | NestJS docs + DEV/wanago guides | Two strategies (access `jwt`, refresh `jwt-refresh`), rotate on each use, store hashed refresh, detect reuse → revoke family | Drives token service + Redis family design. |
| Where to keep revocation state | architecture §6.1 + NestJS/Redis guides | Redis with TTL = token remaining lifetime; sub-ms lookup; auto-cleanup | Redis provider + TTL keys. |
| Refresh token transport | Security guides | HttpOnly Secure cookie, SameSite, CSRF guard | Refresh in cookie; access in body. |

## Design Decisions

### Decision: Argon2id for password hashing
- **Context**: PlatformAdmin.passwordHash must be produced/verified securely.
- **Alternatives Considered**: 1) Argon2id 2) bcrypt cost 12.
- **Selected Approach**: `argon2.hash` with `type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4`; verify with `argon2.verify`.
- **Rationale**: OWASP-recommended, memory-hard, no truncation footgun, greenfield (no bcrypt legacy).
- **Status**: Accepted
- **Trade-offs**: ~64MB RAM per hash op; acceptable on the Phase 1 VPS for admin-only, low-QPS login.
- **Follow-up**: Confirm login latency < 500ms under target hardware.

### Decision: Redis refresh-token rotation with family reuse detection
- **Context**: Refresh must rotate and be revocable per architecture §6.1.
- **Alternatives Considered**: 1) Redis family + hashed refresh 2) DB refresh table.
- **Selected Approach**: Each login opens a token **family** (`familyId`). Redis stores the current valid refresh-token hash per family with TTL = refresh lifetime. On refresh: validate presented token hash == stored; rotate (new hash) or, on mismatch (reuse), delete the whole family (force re-login). Logout blacklists the access token (TTL = access remaining) and deletes the refresh family.
- **Rationale**: Matches architecture + external best practice; sub-ms checks; native TTL cleanup.
- **Status**: Accepted
- **Trade-offs**: Adds Redis as a hard runtime dependency for auth.
- **Follow-up**: docker-compose redis service + `REDIS_URL` env.

### Decision: Refresh in HttpOnly cookie, access in body
- **Context**: Token transport to the Next.js admin client.
- **Selected Approach**: `Set-Cookie` HttpOnly + Secure + `SameSite=Strict`, path-scoped to the refresh endpoint; access token in JSON response body for the FE to attach as `Authorization: Bearer`.
- **Rationale**: XSS-hardening for the long-lived refresh token; CSRF mitigated via SameSite=Strict + path scope in Phase 1.
- **Status**: Accepted
- **Trade-offs**: FE must call refresh endpoint with credentials; CSRF token deferred.
- **Follow-up**: Revisit CSRF double-submit if cross-site admin usage appears.

## Risks & Mitigations
- Redis unavailable at runtime → login/refresh fail closed (deny) — mitigation: health check + clear 503; documented fail-closed behavior.
- Argon2 native build issues in Docker → mitigation: ensure build deps in backend image; fallback documented.
- Refresh token theft → mitigation: rotation + family reuse detection + short access TTL.
- First-admin bootstrap missing → mitigation: env-driven seed creates an initial SUPER_ADMIN.

## References
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — Argon2id default parameters.
- [NestJS Authentication docs](https://docs.nestjs.com/security/authentication) — Passport JWT strategies.
- [How to Implement Refresh Tokens with Token Rotation in NestJS (DEV)](https://dev.to/zenstok/how-to-implement-refresh-tokens-with-token-rotation-in-nestjs-1deg) — rotation + blacklist pattern.
- [Building Secure JWT Auth in NestJS: Argon2, Redis Blacklisting, and Token Rotation (DEV)](https://dev.to/david_essien/building-secure-jwt-auth-in-nestjs-argon2-redis-blacklisting-and-token-rotation-3gl9) — Redis guard + TTL.
- `docs/architecture.md` §6.1/§6.2 — canonical internal auth contract.
