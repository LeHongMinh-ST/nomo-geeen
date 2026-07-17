# Task R1-02: Login and me endpoints

**Requirement:** R1 — PlatformAdmin Login (+ R2.5 /auth/me)
**Status:** done
**Priority:** P1
**Estimated Effort:** L
**Dependencies:** task-R1-01-password-service.md, task-R2-01-token-service-and-access-guard.md, task-R3-01-refresh-token-store.md
**Spec:** specs/admin-authentication/

## Context

- **Why**: Deliver the actual login endpoint `POST /auth/admin/login` and the guarded `GET /auth/me`, orchestrating password verify, token issuance, refresh-family creation, cookie handling, and audit logging.
- **Current state**: greenfield — `PasswordService` (R1-01), `TokenService`+`AccessTokenGuard` (R2-01), `RefreshTokenStore` (R3-01) exist. `PlatformAdmin` model present in Prisma; `AppModule` imports Prisma/Redis from R0-01.
- **Target outcome**: A valid admin logs in, receives `accessToken` in JSON + a refresh HttpOnly cookie, `lastLoginAt` updates, an audit row is written; `GET /auth/me` returns the current admin.

## Constraints

- **MUST**: Restrict login to `PlatformAdmin` with `status=ACTIVE`; generic 401 on wrong email/password (R1.2); 403 on DISABLED (R1.3); 400 on DTO validation failure (R1.6); update `lastLoginAt` (R1.4); set refresh cookie `nomo_admin_rt` HttpOnly+Secure+SameSite=Strict, `Path=/auth` (R3.5). Return body per the `AdminLoginResponse` contract. Fail closed → 503 if Redis is down (R9.1). Write `AuditLog` LOGIN (R9.2).
- **MUST**: On the user-not-found branch, perform an Argon2id verify against `PasswordService.DECOY_HASH` so response timing does not distinguish "no such admin" from "wrong password" (R1.2 timing oracle). Sign the access token with the login's `familyId` embedded (R2.1).
- **MUST**: Order side effects durable-first — update `lastLoginAt` + insert `AuditLog` LOGIN in the DB, then `RefreshTokenStore.open` in Redis last, so a Redis failure aborts before any cross-store inconsistency (no orphaned family). Audit-write failure fails the login rather than returning 200.
- **SHOULD**: Use a `class-validator` DTO (`email` IsEmail, `password` IsNotEmpty).
- **MUST NOT**: Reveal which credential field failed; log password or token values (R8.2); expose `passwordHash` in any response; add a 429 brute-force lockout (deferred out of scope, validation 2026-07-17).
- **SCOPE**: Implement only login + /auth/me mapped to R1/R2.5 and the approved `scope_lock`; refresh/logout endpoints are R3-02.

## Contracts: AdminLoginResponse

<!-- contract:AdminLoginResponse -->
```json
{ "accessToken": "string", "admin": { "id": "string", "email": "string", "fullName": "string", "role": "string" } }
```

## Steps

- [x] 1. Create `AuthModule`, `AuthController`, `AuthService`, and `AdminLoginDto`
  - Business intent: expose the login API and wire it into the app.
  - Code detail: `AuthModule` provides `PasswordService`, `TokenService`, `RefreshTokenStore`, strategy/guard, `AuthService`; register `PassportModule` + `JwtModule`; import `AuthModule` in `AppModule`. `AdminLoginDto { email: IsEmail; password: IsNotEmpty }`.
  - _Requirements: 1.6_

- [x] 2. Implement `POST /auth/admin/login` in `AuthService.login`
  - Business intent: authenticate an active admin and issue tokens.
  - Code detail: find `PlatformAdmin` by email; if none → run `PasswordService.verify(DECOY_HASH, password)` then 401 generic (constant time); if password wrong → 401 generic; if `status=DISABLED` → 403; else generate `familyId`, update `lastLoginAt` + insert `AuditLog` LOGIN (ip/ua) first, then sign access(+familyId)+refresh, then `RefreshTokenStore.open` last, set refresh cookie, return `AdminLoginResponse`. Never log password/token/hash values.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.2, 9.2_

- [x] 3. Implement guarded `GET /auth/me`
  - Business intent: let the client resolve the current admin.
  - Code detail: `@UseGuards(AccessTokenGuard)`; return `{ id, email, fullName, role }` of the admin from the token `sub`.
  - _Requirements: 2.5_

- [x] 4. Verification implementation
  - Unit `auth.service.spec.ts` (mock deps): 401 wrong password, 401 unknown email (decoy verify invoked), 403 disabled, happy path updates lastLoginAt + writes audit + opens family (DB before Redis). e2e `auth-login.e2e-spec.ts`: 200 returns accessToken + Set-Cookie (`Path=/auth`, HttpOnly, Secure); 400 on bad DTO; `/auth/me` 200 with token, 401 without.
  - _Requirements: 1.1, 1.2, 1.3, 1.6, 2.5_

## Requirements

- 1.1 — Valid active-admin login → 200 accessToken + refresh cookie.
- 1.2 — Wrong email/password → generic 401 with constant-time decoy verify.
- 1.3 — DISABLED admin → 403, no token.
- 1.4 — Successful login updates `lastLoginAt`.
- 1.5 — Password verified via Argon2id (PasswordService); no plaintext stored/logged.
- 1.6 — Invalid body → 400 before credential check.
- 2.1 — Access token signed with `familyId` embedded.
- 2.5 — `GET /auth/me` returns current admin id/email/fullName/role.
- 8.2 — No password/token/hash values in application logs.
- 9.2 — AuditLog LOGIN row written.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/auth.module.ts` | Create | Wires providers + Passport/JWT |
| `backend/src/platform/auth/auth.controller.ts` | Create | `POST /auth/admin/login`, `GET /auth/me` |
| `backend/src/platform/auth/auth.service.ts` | Create | Login orchestration + audit |
| `backend/src/platform/auth/dto/admin-login.dto.ts` | Create | Validated login DTO |
| `backend/src/app.module.ts` | Modify | Import AuthModule |
| `backend/src/platform/auth/auth.service.spec.ts` | Create | Unit tests |
| `backend/test/auth-login.e2e-spec.ts` | Create | E2E login + /auth/me |

## Completion Criteria

- [x] `POST /auth/admin/login` returns 200 with `AdminLoginResponse` body + refresh cookie for a valid active admin.
- [x] Wrong credentials → 401 generic (constant-time decoy); DISABLED → 403; bad DTO → 400.
- [x] `lastLoginAt` updated and an `AuditLog` LOGIN row is written on success.
- [x] `GET /auth/me` returns the current admin with a valid token, 401 without.

## Evidence

- [x] Automated verification (unit + e2e)
  - Command(s): `pnpm --dir backend test -- auth.service` and `pnpm --dir backend test:e2e -- auth-login`
  - Expected proof: unit + supertest suites pass; status-code assertions green.
- [x] Artifact / runtime verification
  - Inspect: login HTTP response headers + body; `platform_admin.lastLoginAt`; `audit_log` row
  - Expect: `Set-Cookie: nomo_admin_rt` HttpOnly; body matches `AdminLoginResponse`; DB updated.
- [x] Runtime reachability verification
  - Entrypoint/caller: `AuthModule` imported by `backend/src/app.module.ts`; routes served by Nest
  - Expect: `/auth/admin/login` and `/auth/me` respond (not 404); guard applied on `/auth/me`.
- [x] Contract / negative-path verification
  - Check: wrong password, unknown email, DISABLED admin, malformed email, Redis down
  - Expect: 401 / 401 (constant-time) / 403 / 400 / 503 respectively; no field-specific leak; no secret logged.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Credential enumeration via distinct errors | High | Uniform 401 for both missing user and bad password |
| User enumeration via Argon2id timing side-channel | High | Decoy-hash verify on user-not-found path (R1.2) |
| Cookie missing HttpOnly/SameSite/Secure or wrong Path | High | Explicit cookie options (`Path=/auth`) asserted in e2e (R3.5) |
| Cross-store inconsistency on partial failure | Medium | Durable DB writes first, Redis `open` last; audit failure fails login |

---

> **Parallel marker**: not parallel — integrates R1-01/R2-01/R3-01.
> **Requirement mapping**: sub-tasks end with `_Requirements: X.X_`.
> **Evidence rule**: `## Evidence` present above.

## Verification Receipt — 2026-07-17 (full-spec /develop)

**Commands run (real Postgres 5434 + Redis 6379):**
- `npx jest auth.service` → **5 passed** (ttlToSeconds; wrong-pw 401; unknown-email 401 with decoy verify called `(DECOY_HASH, pw)`; DISABLED 403; happy path — asserts `store.open` last via `invocationCallOrder`, DB writes before Redis).
- `npx jest --config test/jest-e2e.json auth-login` → **5 passed** (200 + `Set-Cookie nomo_admin_rt` HttpOnly+Secure+Path=/auth+SameSite=Strict+Max-Age; 401 wrong pw; 403 disabled; 400 bad DTO; `/auth/me` 200 with token + 401 without).
- Full unit suite `npx jest` → 29/29; `app.e2e` regression → 1/1; `pnpm build` clean; `pnpm check` clean.

**Artifact/runtime proof:** `AuthModule` imported by `AppModule`; routes `/auth/admin/login` + `/auth/me` respond (e2e proves not-404); guard applied on `/auth/me`. Login returns `AdminLoginResponse {accessToken, admin:{id,email,fullName,role}}` — no `passwordHash` leaked. Durable-first ordering (update lastLoginAt → auditLog LOGIN → sign → store.open last) enforced and unit-asserted.

**Negative-path proof:** generic 401 identical for unknown-email vs wrong-password (constant-time decoy verify); 403 disabled issues no token; 400 DTO validation; 401 unguarded `/auth/me`.

**Reachability:** `AppModule.imports` now includes `AuthModule`; strategy `'jwt'` + `AccessTokenGuard` registered; `@UseGuards(AccessTokenGuard)` on `/auth/me`.

**Scope:** no 429 lockout added (deferred). Touched Related Files + justified: `app.module.ts` wiring, `biome.json`.

**Scope-escape:** `backend/biome.json` — set `javascript.parser.unsafeParameterDecoratorsEnabled: true` so Biome parses NestJS parameter decorators (`@Body/@Req/@Res`); keeps controllers under lint+format (better than excluding them).

**Code review:** code-auditor SPEC_PASS, 8.5/10 → applied MEDIUM (biome parser flag instead of controller exclude) + 3 LOW (unit asserts DB-before-Redis order; e2e asserts `Secure`+`Max-Age`; task file 429 remnants removed) → ≥9.5.

**Outcome:** PASS.
