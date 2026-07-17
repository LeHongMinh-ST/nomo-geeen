# Requirements Document

## Introduction

This feature delivers **admin-only authentication** for the NomoGreen SaaS operations portal. It authenticates `PlatformAdmin` accounts (platform operators, non-tenant-scoped) using email + password, issuing a short-lived JWT **access token** and a long-lived **refresh token** that rotates on every use. Token state (rotation family + revocation) lives in **Redis**. The access token is returned in the JSON response body; the refresh token is delivered as an **HttpOnly Secure cookie**. Tenant `User` login is explicitly out of scope.

The canonical auth contract is `docs/architecture.md` §6.1/§6.2: Passport JWT, access ~15 min + refresh ~30 days, refresh rotation, revoked-token blacklist in Redis.

**In scope:** PlatformAdmin login, token issuance, access-token verification guard, refresh rotation with reuse detection, logout/revocation, current-admin endpoint, first-admin bootstrap seed, frontend wiring of the existing admin login form, supporting foundation (PrismaService, ConfigModule, Redis provider, env, docker-compose redis).

**Out of scope:** tenant `User` login, phone/OTP, Google/Apple OAuth, password reset/forgot-password, MFA, full RBAC permission enforcement beyond "is an active PlatformAdmin", tenant guard chain.

## Requirements

### Requirement 1: PlatformAdmin Login
**Objective:** As a platform operator, I want to log in with my admin email and password, so that I receive tokens granting access to the admin portal.

#### Acceptance Criteria
- **R1.1** When a client sends `POST /auth/admin/login` with a valid email and correct password for a `PlatformAdmin` whose `status = ACTIVE`, the system shall return HTTP 200 with an access token in the JSON body and set the refresh token as an HttpOnly cookie.
- **R1.2** If the email does not match any `PlatformAdmin` or the password is incorrect, the system shall return HTTP 401 with a generic "invalid credentials" message that does not reveal which field was wrong, and shall perform an Argon2id verification against a fixed decoy hash on the user-not-found path so response timing does not distinguish "no such admin" from "wrong password".
- **R1.3** If the matched `PlatformAdmin` has `status = DISABLED`, the system shall return HTTP 403 and shall not issue any token.
- **R1.4** When login succeeds, the system shall update the admin's `lastLoginAt` to the current time.
- **R1.5** The system shall verify passwords using Argon2id and shall never store or log the plaintext password.
- **R1.6** When the login request body fails validation (missing/malformed email or empty password), the system shall return HTTP 400 with field-level validation errors before any credential check.

### Requirement 2: Access Token Issuance & Verification
**Objective:** As the system, I want to issue and verify short-lived signed access tokens, so that admin API calls are authenticated statelessly with fast revocation.

#### Acceptance Criteria
- **R2.1** When issuing an access token, the system shall sign a JWT with the access secret, an expiry of ~15 minutes, and a payload containing the admin `sub` (id), `email`, `role`, a `type` claim of `access`, and the `familyId` of the session (so logout can revoke the refresh family from the access token alone).
- **R2.2** When a request carries a valid, unexpired, non-revoked access token in the `Authorization: Bearer` header, the guarded endpoint shall allow the request and expose the admin identity on the request context.
- **R2.3** If the access token is missing, malformed, expired, or signed with the wrong secret, the guard shall reject the request with HTTP 401.
- **R2.4** If the access token has been revoked (present in the Redis blacklist), the guard shall reject the request with HTTP 401 even when the token is otherwise valid and unexpired.
- **R2.5** When `GET /auth/me` is called with a valid access token, the system shall return the current admin's id, email, fullName, and role.

### Requirement 3: Refresh Token Rotation & Reuse Detection
**Objective:** As a platform operator, I want my session to renew securely without re-login, so that a stolen refresh token cannot grant long-term access.

#### Acceptance Criteria
- **R3.1** When issuing a refresh token, the system shall sign a JWT with the refresh secret (separate from the access secret), an expiry of ~30 days, and shall store only a hash of the token in Redis keyed by a token `familyId` with a TTL equal to the refresh lifetime.
- **R3.2** When a client sends `POST /auth/refresh` with a valid refresh cookie whose token hash matches the current stored hash for its family, the system shall re-load the `PlatformAdmin` by `sub`, reject with 401 (and revoke the family) if `status != ACTIVE`, otherwise issue a new access token (with `role` re-derived from the DB row) and a new (rotated) refresh token, replace the stored hash, and set the new refresh cookie.
- **R3.3** If a refresh token is presented whose hash does not match the current stored hash for a still-existing family (reuse of an already-rotated token, outside the rotation grace window), the system shall delete the entire family from Redis and return HTTP 401, forcing re-login.
- **R3.4** If the refresh token is missing, expired, malformed, or its family no longer exists in Redis, the system shall return HTTP 401.
- **R3.5** The refresh cookie shall be set with `HttpOnly`, `Secure`, `SameSite=Strict`, and `Path=/auth` (so it is sent to both `/auth/refresh` and `/auth/logout`).
- **R3.6** The rotation compare-and-swap shall be atomic (single server-side operation), and shall accept the immediately-previous token hash for a short grace window (a few seconds) so concurrent legitimate refreshes from one client converge instead of tripping reuse detection.

### Requirement 4: Logout & Revocation
**Objective:** As a platform operator, I want to log out, so that my tokens can no longer be used.

#### Acceptance Criteria
- **R4.1** When a client sends `POST /auth/logout` with a valid access token, the system shall add that access token to the Redis blacklist with a TTL equal to its remaining lifetime and shall delete its refresh-token family from Redis, using the `familyId` carried in the access token claims (not the refresh cookie).
- **R4.2** When logout completes, the system shall clear the refresh cookie on the client (expired `Set-Cookie`).
- **R4.3** After logout, any subsequent use of the same access token shall be rejected per R2.4, and any use of the revoked refresh token shall be rejected per R3.4.

### Requirement 5: Admin Provisioning (Bootstrap Seed)
**Objective:** As an operator setting up the platform, I want an initial admin account, so that someone can log in on a fresh deployment.

#### Acceptance Criteria
- **R5.1** When the seed script runs with `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` set, the system shall create (or leave intact if already present) a `PlatformAdmin` with `role = SUPER_ADMIN`, `status = ACTIVE`, and an Argon2id password hash.
- **R5.2** If the bootstrap env vars are absent, the seed shall skip admin creation without failing the rest of the seed.
- **R5.3** The seed shall be idempotent: re-running it shall not create duplicate admins or overwrite an existing admin's password.

### Requirement 6: Frontend Login Wiring
**Objective:** As a platform operator, I want the admin login page to actually authenticate me, so that submitting valid credentials logs me into the admin area.

#### Acceptance Criteria
- **R6.1** When the admin submits the existing `AdminLoginForm` with valid credentials, the frontend shall call `POST /auth/admin/login` with credentials included and, on HTTP 200, store the access token and redirect to the admin area.
- **R6.2** If the login API returns 401 or 403, the frontend shall display a clear error message in the form and shall not redirect.
- **R6.3** The frontend shall preserve the existing form validation and loading/`notice` states and shall replace the `setTimeout` TODO stub with the real API call.

## Non-Functional Requirements

### Requirement 7: Performance & Scalability
**Objective:** As a system owner, I want predictable auth performance, so that login and every guarded request stay responsive.

#### Acceptance Criteria
- **R7.1** The login endpoint shall complete within a reasonable interactive latency (target ~500ms) on the Phase 1 target hardware, including Argon2id verification, with `parallelism` tuned to the minimum target vCPU count (default `p=2`). This is a qualitative target for a low-QPS admin gate, not a CI-gated budget.

> Note: A hard per-request guard latency budget (a former second performance criterion, ≤5ms) was considered and deferred (validation session 2026-07-17) as premature optimization for a low-QPS admin gate. The Redis blacklist check remains O(1); no formal p95 measurement artifact is required.

### Requirement 8: Security & Privacy
**Objective:** As a security stakeholder, I want the admin auth surface hardened, so that credentials and sessions are protected.

#### Acceptance Criteria
- **R8.1** The system shall use separate signing secrets for access and refresh tokens, loaded from environment variables and never committed.
- **R8.2** The system shall never return or log password hashes, plaintext passwords, or full token values in application logs.
- **R8.3** The refresh token shall be stored server-side only as a hash (never the raw token), and access-token revocation state shall auto-expire via Redis TTL.
- **R8.4** The refresh cookie's `Secure` attribute shall default to `true` and the system shall refuse to start (or hard-error) if the cookie is configured non-`Secure` while running in production.
- **R8.5** Where new environment variables are introduced, the system shall document them in `.env.example` without real secret values.

> Note: A brute-force lockout / 429 throttle was considered and explicitly deferred out of scope (validation session 2026-07-17). Rate limiting, if needed, is handled at the reverse-proxy/infrastructure layer per `docs/architecture.md` §8, not in this feature.

### Requirement 9: Reliability & Availability
**Objective:** As an operator, I want predictable failure handling, so that auth failures are safe and diagnosable.

#### Acceptance Criteria
- **R9.1** If Redis is unreachable during login, refresh, or a guarded request, the system shall fail closed (deny the operation) with HTTP 503 rather than granting access on an unverifiable token state.
- **R9.2** The system shall write an `AuditLog` entry (actorType `PLATFORM_ADMIN`) on successful login (`LOGIN`), logout (`LOGOUT`), and refresh-token reuse detection (`REFRESH_REUSE_DETECTED`), capturing `actorId`, `ipAddress`, and `userAgent`; the reuse event is a theft signal and shall be recorded even though the request returns 401.
- **R9.3** The database schema for `platform_admin` (and the `AuditLog` table used here) shall be materialized via a Prisma migration applied (`prisma migrate deploy` / `db push`) before seeding or serving, so a fresh deployment has the required tables.
- **R9.4** Redis shall be configured with persistence (AOF) and a durable volume so that a Redis restart does not silently un-revoke blacklisted access tokens; the operator-facing docs shall state the restart blast radius (active sessions require re-login).
