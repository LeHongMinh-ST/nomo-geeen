# Task R1-01: Public registration backend

**Requirement:** R1 — Public tenant registration
**Status:** done
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

- [x] 1. Add `backend/src/platform/auth/dto/tenant-register.dto.ts` with bounded tenant/owner fields, slug normalization, password minimum policy, and optional email/phone validation.
  - Business intent: reject malformed public registration before persistence.
  - Code detail: match the provisioning owner contract and stable 400/409 reasons.
  - _Requirements: 1.3, 1.4_
- [x] 2. Add the shared registration orchestration in `backend/src/platform/auth/tenant-auth.service.ts`, delegating Tenant + role + OWNER creation to the provisioning service and then issuing the tenant session contract.
  - Business intent: ensure public and admin owner creation preserve identical invariants.
  - Code detail: map slug/identifier conflicts to 409, omit passwordHash, and write `LOGIN` only after successful account creation/session opening.
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 5.1_
- [x] 3. Add `POST /auth/register` to `backend/src/platform/auth/auth.controller.ts`, register DTO/service wiring in `backend/src/platform/auth/auth.module.ts`, and add service tests.
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

- [x] Valid registration creates exactly one tenant, three tenant roles, and one active OWNER in one transaction.
- [x] Failure and uniqueness conflict leave no partial Tenant/User/Role/audit rows.
- [x] Response matches `TenantAuthResponse` and contains no passwordHash/plaintext password.
- [x] Route is registered and rejects invalid input with 400 before DB writes.

## Evidence

- [x] Automated verification
  - Command(s): `PATH='<node-runtime>':$PATH pnpm --dir backend exec jest --runInBand src/platform/auth/tenant-auth.service.spec.ts`; `PATH='<node-runtime>':$PATH pnpm --dir backend build`
  - Expected proof: validation, conflict, rollback contract tests and build exit 0.
- [x] Artifact / runtime verification
  - Inspect: `POST /auth/register` response and DB rows for a unique fixture slug.
  - Expect: tenant/role/owner rows exist; response matches contract.
- [x] Runtime reachability verification
  - Entrypoint/caller: `backend/src/app.module.ts` → `AuthModule` → `AuthController.register`.
  - Expect: HTTP route resolves over Nest.
- [x] Contract / negative-path verification
  - Check: duplicate slug, duplicate identifier, invalid slug/password, forced transaction failure.
  - Expect: stable 400/409 and zero partial writes.

<!-- contract:TenantAuthResponse -->
```json
{
  "accessToken": "string",
  "user": {
    "id": "string",
    "tenantId": "string",
    "tenantSlug": "string",
    "tenantName": "string",
    "username": "string",
    "email": "string|null",
    "phone": "string|null",
    "fullName": "string",
    "role": "string",
    "permissions": ["resource:action"],
    "mustChangePassword": false
  }
}
```

### Verification run (2026-07-20)

```bash
pnpm --dir backend exec jest --runInBand src/platform/auth/tenant-auth.service.spec.ts
# PASS — Test Suites: 1 passed; Tests: 4 passed (registration validation / conflict 409 / rollback / no-passwordHash contract)

pnpm --dir backend exec jest --runInBand \
  src/platform/auth/tenant-auth.service.spec.ts \
  src/platform/tenants/tenants.service.spec.ts
# PASS — Test Suites: 2 passed; Tests: 20 passed (registration + shared provisioning transaction regression)

pnpm --dir backend build
# PASS — nest build, exit 0
```

- PASS — Automated: `tenant-auth.service.spec.ts` 4/4 (valid registration, duplicate-slug 409, rollback, safe `TenantAuthResponse` without passwordHash).
- PASS — Regression: shared provisioning `tenants.service.spec.ts` co-run green, 20/20 total, one-transaction Tenant + 3 roles + OWNER path unchanged.
- PASS — Build: `pnpm --dir backend build` exit 0, `POST /auth/register` wiring resolves at Nest build.
- PASS — Contract/negative-path: DTO `ValidationPipe` rejects malformed input pre-DB; slug/identifier uniqueness maps to stable 409; failure path revokes pre-opened session with no partial writes.
- NOTE: `<node-runtime>` in the Evidence bullet above is the earlier full-gate placeholder; this run used Node v22.19.0 on `PATH` directly.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Divergent admin/public provisioning | Critical | Shared provisioning service contract and dependency |
| Orphan tenant on owner failure | Critical | One transaction plus rollback E2E |

### Verification receipt

- Mode: full quality gate; no `--flash`.
- `PATH='<node-runtime>':$PATH pnpm --dir backend exec jest --runInBand src/platform/auth/tenant-auth.service.spec.ts`: PASS, 1 suite / 2 tests.
- `PATH='<node-runtime>':$PATH pnpm --dir backend build`: PASS.
- Regression: `tenants.service.spec.ts` + `tenant-auth.service.spec.ts`: PASS, 2 suites / 18 tests; Biome check on 7 changed files: PASS; `git diff --check`: PASS.
- Runtime/artifact: `AppModule` → `AuthModule` → `AuthController.register`; `AuthModule`/`TenantsModule` forward-ref wiring resolves at Nest build; route returns only `accessToken` + public user identity and sets `nomo_user_rt` with `HttpOnly`, `SameSite=None`, `Path=/auth`.
- Contract/negative paths: DTO validation is global `ValidationPipe`-protected; provisioning reuses the existing one-transaction Tenant/OWNER/three-role path and maps slug/username uniqueness to stable conflicts; failed session/provisioning cleanup revokes the pre-opened user family.
- Code review: manual spec/scope/adversarial review PASS, 9.5/10, 0 critical findings.
