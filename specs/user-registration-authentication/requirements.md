# Requirements — user-registration-authentication

## Overview

Deliver a complete tenant-user onboarding and authentication flow for NomoGreen. A new customer can register a store and its first OWNER, then users can log in with a tenant slug plus username, phone, or email and maintain a secure browser session.

Canonical language: English. User-facing labels and errors: Vietnamese.

## R1 — Public tenant registration

**Objective:** As a prospective store owner, I want to register a store and owner account in one flow, so that I can start using NomoGreen without an admin-created credential.

- **R1.1** When a public client submits valid tenant and owner fields to `POST /auth/register`, the system shall create exactly one Tenant, its tenant OWNER/MANAGER/STAFF role set, and one active OWNER user in one database transaction.
- **R1.2** If any registration step fails, the system shall roll back the Tenant, roles, user, and registration audit rows so no partial account remains.
- **R1.3** The system shall require tenant name, normalized slug, owner full name, username, and password; it shall accept optional owner email and phone without storing plaintext password.
- **R1.4** If the slug or owner identifier conflicts with an existing active or soft-deleted record, the system shall return a stable 409 reason and shall not reveal unrelated tenant data.
- **R1.5** On success, the system shall return a public tenant summary, owner public identity, access token, and set the user refresh cookie; it shall never return `passwordHash`.
- **R1.6** The registration response shall not expose a generated password because public registration requires a user-provided password.

## R2 — Tenant user login

**Objective:** As a tenant user, I want to log in using a familiar identifier, so that I can access my store securely.

- **R2.1** When an active user submits tenant slug, identifier, and password to `POST /auth/login`, the system shall resolve the user only within the active tenant and issue a tenant access token plus refresh cookie.
- **R2.2** The identifier resolver shall support username, email, and phone while preserving tenant scope and soft-delete rules.
- **R2.3** If the tenant, user, identifier, or password is invalid, the system shall return a generic 401 response and perform decoy password verification when no matching user exists.
- **R2.4** If the tenant or user is disabled, the system shall reject login with a stable non-success response and shall not issue tokens.
- **R2.5** On successful login, the system shall update `User.lastLoginAt` and emit a `LOGIN` audit row with `actorType=USER`, tenantId, actorId, role code, IP, and User-Agent, without credential material.
- **R2.6** The access token shall contain `userType=tenant`, `sub`, `tenantId`, `role`, `permissions[]`, `familyId`, `type=access`, and a bounded expiry; permission values shall come from the current role grants.

## R3 — User session lifecycle

**Objective:** As a signed-in user, I want sessions to survive reloads and end predictably, so that access is usable without weakening revocation.

- **R3.1** When `POST /auth/refresh` receives a valid `nomo_user_rt` cookie, the system shall atomically rotate the refresh family and return a new access token plus replacement cookie.
- **R3.2** If a rotated user refresh token is reused outside the grace window, the system shall revoke the entire user refresh family, emit `REFRESH_REUSE_DETECTED`, and return 401.
- **R3.3** When an authenticated user calls `POST /auth/logout`, the system shall revoke the refresh family, blacklist the presented access token until expiry, clear the user cookie, and emit `LOGOUT`.
- **R3.4** When an authenticated user calls `GET /auth/me`, the system shall return current public identity, tenant, role, permissions, and `mustChangePassword` state; it shall reload authorization data rather than trust stale client state.
- **R3.5** The user refresh/session namespace shall be separate from the admin namespace in cookie names, Redis keys, token claims, and tests.

## R4 — Tenant authorization and password lifecycle

**Objective:** As a tenant user, I want every request and first-login state to respect my role and tenant boundary, so that I cannot access another store or bypass required password changes.

- **R4.1** The tenant access guard shall reject missing, expired, revoked, wrong-realm, or malformed tokens with 401 and shall fail closed when Redis revocation state is unavailable.
- **R4.2** The tenant permission guard shall resolve required `resource:action` permissions from the authenticated tenant identity and shall deny missing permissions with 403.
- **R4.3** Any tenant-scoped handler using tenant identity shall derive tenantId from the verified server token and shall reject cross-tenant resource access with 404 or 403 according to the existing module convention.
- **R4.4** When `mustChangePassword=true`, the system shall allow only `/auth/me`, `/auth/change-password`, and logout/session-maintenance endpoints until the password is changed.
- **R4.5** When an authenticated user submits a valid current password and new password to `POST /auth/change-password`, the system shall hash the new password, clear `mustChangePassword`, revoke all other user refresh families, and emit an audit row without password material.

## R5 — Abuse resistance and audit

**Objective:** As a system operator, I want failed authentication attempts bounded and observable, so that credential attacks are harder to scale and diagnosable.

- **R5.1** The system shall rate-limit failed tenant login and public registration attempts by IP and normalized tenant/identifier or slug key using Redis with bounded TTLs, and shall temporarily reject attempts after the configured threshold.
- **R5.2** The system shall use generic authentication failure responses and shall not log passwords, raw access tokens, raw refresh tokens, password hashes, or reset secrets.
- **R5.3** The system shall emit only the existing compatible audit actions (`LOGIN`, `LOGOUT`, `REFRESH_REUSE_DETECTED`) for the tenant auth lifecycle, with `actorType=USER` and tenant context where known.
- **R5.4** Redis outage shall fail closed for guarded session revocation and refresh operations, returning 503 without issuing a token; login throttling failure shall not bypass password verification or tenant/user status checks.

## R6 — Frontend registration and authentication

**Objective:** As a store user, I want a clear mobile-friendly registration/login experience, so that I can enter the tenant context and recover a session without seeing technical errors.

- **R6.1** When a user opens `/dang-ky`, the frontend shall collect tenant name/slug, owner full name, username, optional email/phone, and password with client-side advisory validation matching backend constraints.
- **R6.2** When a user opens `/dang-nhap`, the frontend shall collect tenant slug, identifier, and password, call the real `/auth/login` API, keep the access token in memory only, and redirect to the user app after success.
- **R6.3** The user session store shall hydrate through `/auth/refresh` and `/auth/me`, silently retry one 401 request after refresh, and clear state after refresh failure.
- **R6.4** The frontend shall expose logout and prevent authenticated user routes from rendering before session hydration completes; it shall not reuse admin identity/store state.
- **R6.5** The UI shall surface 400/401/403/409/429/503 states in Vietnamese while preserving entered non-secret fields, and shall show the forced-password-change path when required.
- **R6.6** Auth screens shall follow `DESIGN.md`: mobile-first, minimum 48px interactive targets, semantic labels, visible focus, no text below 14px, and responsive keyboard-accessible controls.

## R7 — Verification and reachability

**Objective:** As a maintainer, I want the complete user auth flow proven at runtime, so that implementation is not considered complete based only on isolated code.

- **R7.1** The backend shall include unit coverage for tenant identity/claims, permission loading, rate-limit decisions, password-change gating, and user refresh rotation/reuse behavior.
- **R7.2** The backend shall include HTTP E2E coverage for registration rollback/conflicts, login variants, disabled states, `/me`, refresh rotation, reuse, logout, cross-tenant denial, permissions, and forced password change.
- **R7.3** The frontend shall pass build/lint checks and a runtime smoke flow shall prove `/dang-ky` → `/dang-nhap` → authenticated app route → refresh → logout reachability.
- **R7.4** Existing admin auth and tenant product E2E suites shall remain passing after user auth changes.

## R8 — Non-functional security, performance, and reliability

**Objective:** As a system owner, I want measurable security and operational behavior, so that the auth feature is safe to release.

- **R8.1** The system shall use the existing Argon2id password service, never persist or return plaintext passwords, and use distinct admin/user cookie and Redis namespaces.
- **R8.2** For a warmed Postgres/Redis environment, login, `/auth/me`, and refresh shall each respond within 500ms at p95 for a fixture of 100 concurrent users, excluding Argon2 hashing time from the network assertion only when the test reports it separately.
- **R8.3** Registration shall complete as one transaction and no failed registration test shall leave orphan Tenant, Role, User, or audit rows.
- **R8.4** User list/identity and permission queries shall use tenant/user/role indexes already present or add a justified additive index migration; no unbounded scan may be introduced on login.
- **R8.5** Rollback shall be possible by reverting the user-auth migration and disabling the user auth routes while preserving admin auth keys, cookies, and routes.
- **R8.6** Cookie-authenticated user refresh/logout endpoints shall validate the configured allowed Origin (and reject missing or mismatched origins for browser requests) so the existing cross-origin `SameSite=None` topology does not introduce an unbounded CSRF path.

## Unresolved Questions

- The provisioning spec must confirm the exact reusable owner/role creation service signature before the registration task is implemented.
