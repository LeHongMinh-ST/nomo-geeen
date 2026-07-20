# Requirements — tenant-user-management

## Overview

Implement Phase 1 store staff management for the current one-user-one-tenant model. Owner and eligible Manager users manage staff accounts inside their tenant; the platform remains the authority for plans and seat bonuses.

## R1 — Tenant user list and seat visibility

- **R1.1** When an authenticated tenant user with `user:view` opens the staff surface, the system shall return only non-deleted users belonging to the token tenant.
- **R1.2** The response shall include full name, username, phone/email, role, status, last login, and no password/hash/secret fields.
- **R1.3** The response shall include `activeCount`, `effectiveMaxUsers`, active plan code, and `seatBonus`; only ACTIVE users consume seats.
- **R1.4** Cross-tenant IDs and records shall return a non-disclosing not-found response.

## R2 — Create and edit users

- **R2.1** An authenticated tenant user with `user:create` shall be able to create an ACTIVE OWNER/MANAGER/STAFF user only in the current tenant.
- **R2.2** Create shall require full name, username, role, and exactly one password mode: explicit password or generated password.
- **R2.3** Create shall re-check the seat quota inside a serializable transaction and return `409 SEAT_LIMIT_REACHED` when no seat is available.
- **R2.4** Username conflicts shall return a stable tenant-scoped conflict reason without leaking another tenant.
- **R2.5** Profile edits shall allow only full name, username, phone, and email; tenant, status, role, password hash, and audit ownership are not client-editable fields.

## R3 — Roles, lifecycle and password reset

- **R3.1** Owner and eligible Manager actions shall be enforced server-side; UI hiding is not authorization.
- **R3.2** Changing a role or deactivating a user shall never leave a tenant without an active OWNER; the last OWNER attempt shall return `409 LAST_OWNER`.
- **R3.3** Deactivation shall be soft (`DISABLED`), preserve history, and release the seat; reactivation shall consume a seat and be rejected if the quota is full.
- **R3.4** Reset password shall accept an explicit or generated password, persist only its hash, set `mustChangePassword=true`, and return a generated password only once when requested.
- **R3.5** Manager cannot promote/demote an OWNER or perform an action outside the Phase 1 role boundary; OWNER remains the highest tenant role.

## R4 — Frontend staff management

- **R4.1** The user app shall expose a Vietnamese “Nhân viên” screen from `/thiet-lap`, protected by user auth and permission state.
- **R4.2** The screen shall show seat usage, clear full-seat messaging, list/loading/empty/error states, and mobile-friendly create/edit/action flows.
- **R4.3** The create form shall disable create/reactivate when seats are full but still surface the server error if state races.
- **R4.4** Generated passwords shall be shown once with copy support and an explicit change-password warning; secrets shall not be persisted in browser storage.
- **R4.5** Staff actions shall use the user API client with bearer token, credentials, single refresh/retry behavior, and Vietnamese error mapping.

## R5 — Audit and verification

- **R5.1** Create, role change, deactivate/reactivate, reset password, and profile changes shall write audit rows with USER actor context, tenantId, actorId, target user, and no credential material; use dedicated additive `USER_*` audit actions when the existing enum has no compatible action.
- **R5.2** Backend unit/integration coverage shall prove tenant isolation, role boundaries, last-owner protection, seat exhaustion, concurrent create/re-enable safety, and reset-password semantics.
- **R5.3** Frontend build/lint and browser verification shall prove `/thiet-lap` reachability, permission gating, responsive form behavior, and no regression to admin tenant users panel.

## Explicit non-goals

Multi-tenant membership, tenant selection, custom roles, invitations, plan/seat administration, and public self-registration changes remain out of scope.

## Unresolved Questions

- Whether the product later exposes a dedicated `/nhan-vien` route or keeps the screen nested under `/thiet-lap`; this spec uses `/thiet-lap/nhan-vien` to match the current settings navigation.
