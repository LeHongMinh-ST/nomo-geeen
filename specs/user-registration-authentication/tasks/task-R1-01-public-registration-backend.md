# Task R1-01: Public registration backend

**Requirement:** R1 — Public tenant registration
**Status:** pending
**Priority:** P0
**Estimated Effort:** L
**Dependencies:** tasks/task-R0-01-session-contract-foundation.md; `admin-tenant-provisioning`
**Spec:** specs/user-registration-authentication/
Contracts: TenantAuthResponse

## Context

- **Why**: New store owners need to create their store and first user without an admin handoff.
- **Current state**: `TenantAuthService` only logs in; tenant/owner transaction and role seeding are being delivered by `admin-tenant-provisioning`.
- **Target outcome**: `POST /auth/register` delegates to the shared provisioning transaction and returns a safe authenticated session.

## Constraints

- **MUST**: Reuse the provisioning-owned owner/role creation service; one transaction must include Tenant, roles, OWNER, and audit rows.
- **SHOULD**: Reuse existing DTO hardening, `PasswordService`, `AuditLogger`, and DB uniqueness mapping.
- **MUST NOT**: Duplicate role cloning, accept existing user references, return/log passwordHash or plaintext password, or assign billing.
- **SCOPE**: Registration only; login/session behavior is R2–R4.

## Steps

- [ ] 1. Add `backend/src/platform/auth/dto/tenant-register.dto.ts` with bounded tenant/owner fields, slug normalization, password minimum policy, and optional email/phone validation.
  - Business intent: reject malformed public registration before persistence.
  - Code detail: match the provisioning owner contract and stable 400/409 reasons.
  - _Requirements: 1.3, 1.4_
- [ ] 2. Add the shared registration orchestration in `backend/src/platform/auth/tenant-auth.service.ts`, delegating Tenant + role + OWNER creation to the provisioning service and then issuing the tenant session contract.
  - Business intent: ensure public and admin owner creation preserve identical invariants.
  - Code detail: map slug/identifier conflicts to 409, omit passwordHash, and write `LOGIN` only after successful account creation/session opening.
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 5.1_
- [ ] 3. Add `POST /auth/register` to `backend/src/platform/auth/auth.controller.ts`, register DTO/service wiring in `backend/src/platform/auth/auth.module.ts`, and add service tests.
  - _Requirements: 1.1, 1.3, 7.1_

## Requirements

- 1.1 — Atomic Tenant + roles + OWNER registration.
- 1.2 — Full rollback on failure.
- 1.3 — Required registration fields.
- 1.4 — Stable conflict handling.
- 1.5 — Safe authenticated response.
- 1.6 — No generated password response.
- 7.1 — Registration service/unit coverage.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/dto/tenant-register.dto.ts` | Create | Public registration request validation |
| `backend/src/platform/auth/tenant-auth.service.ts` | Modify | Registration orchestration |
| `backend/src/platform/auth/auth.controller.ts` | Modify | `POST /auth/register` |
| `backend/src/platform/auth/auth.module.ts` | Modify | DTO/service/provider registration |
| `backend/src/platform/tenants/tenants.service.ts` | Read / Modify if contract requires | Provisioning-owned shared transaction boundary |
| `backend/src/platform/auth/tenant-auth.service.spec.ts` | Create | Registration unit/error tests |

## Completion Criteria

- [ ] Valid registration creates exactly one tenant, three tenant roles, and one active OWNER in one transaction.
- [ ] Failure and uniqueness conflict leave no partial Tenant/User/Role/audit rows.
- [ ] Response matches `TenantAuthResponse` and contains no passwordHash/plaintext password.
- [ ] Route is registered and rejects invalid input with 400 before DB writes.

## Evidence

- [ ] Automated verification
  - Command(s): `PATH='<node-runtime>':$PATH pnpm --dir backend exec jest --runInBand src/platform/auth/tenant-auth.service.spec.ts`; `PATH='<node-runtime>':$PATH pnpm --dir backend build`
  - Expected proof: validation, conflict, rollback contract tests and build exit 0.
- [ ] Artifact / runtime verification
  - Inspect: `POST /auth/register` response and DB rows for a unique fixture slug.
  - Expect: tenant/role/owner rows exist; response matches contract.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `backend/src/app.module.ts` → `AuthModule` → `AuthController.register`.
  - Expect: HTTP route resolves over Nest.
- [ ] Contract / negative-path verification
  - Check: duplicate slug, duplicate identifier, invalid slug/password, forced transaction failure.
  - Expect: stable 400/409 and zero partial writes.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Divergent admin/public provisioning | Critical | Shared provisioning service contract and dependency |
| Orphan tenant on owner failure | Critical | One transaction plus rollback E2E |
