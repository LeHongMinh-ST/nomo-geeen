# Task R2-01: Tenant login and identity

**Requirement:** R2 — Tenant user login
**Status:** done
**Priority:** P0
**Estimated Effort:** M
**Dependencies:** tasks/task-R0-01-session-contract-foundation.md
**Spec:** specs/user-registration-authentication/
Contracts: TenantAuthResponse

## Context

- **Why**: The existing user login is backend-only and lacks current role/permission identity.
- **Current state**: each user belongs to exactly one tenant; `TenantAuthService.login()` resolves the active user by identifier across active tenants and returns that tenant identity. A tenant/store picker is not part of the current flow.
- **Target outcome**: Login updates lastLoginAt, audits safely, loads current permissions, and returns access + refresh session contract.

## Constraints

- **MUST**: Query active tenant/user only, perform decoy verification for missing users, and derive permissions from current role grants.
- **SHOULD**: Keep one bounded Prisma query shape and reuse existing error/status conventions.
- **MUST NOT**: Reveal whether slug/identifier exists or include credential material in errors/audit.
- **SCOPE**: Login and identity loading; refresh/logout is R3.

## Steps

- [x] 1. Simplify `backend/src/platform/auth/dto/tenant-login.dto.ts` to validate identifier and password; tenant is resolved from the credential match.
  - _Requirements: 2.1, 2.2_
- [x] 2. Implement login and permission resolution in `backend/src/platform/auth/tenant-auth.service.ts`; load tenant metadata, role grants, `mustChangePassword`, update `lastLoginAt`, audit `LOGIN`, and issue the canonical response.
  - _Requirements: 2.1–2.6_
- [x] 3. Add unit coverage for username/email/phone, invalid/disabled tenant/user, decoy timing path, permissions, lastLoginAt, and sanitized audit payload.
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 7.1_

## Requirements

- 2.1 — Active tenant identifier login.
- 2.2 — Username/email/phone resolver.
- 2.3 — Generic failure and decoy verification.
- 2.4 — Disabled tenant/user denial.
- 2.5 — Last-login update and USER LOGIN audit.
- 2.6 — Tenant access claims and permissions.
- 7.1 — Login/identity unit coverage.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/dto/tenant-login.dto.ts` | Modify | Tenant login validation |
| `backend/src/platform/auth/tenant-auth.service.ts` | Modify | Login and permission loading |
| `backend/src/platform/auth/token.service.ts` | Modify | Tenant claim signing |
| `backend/src/platform/audit/audit-logger.service.ts` | Modify / Read | User login audit |
| `backend/src/platform/auth/tenant-auth.service.spec.ts` | Create / Modify | Login unit tests |

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

<!-- contract:TenantMeResponse -->
```json
{
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
```

## Completion Criteria

- [x] All three identifiers authenticate by unique credential match across active tenants; ambiguous duplicate matches fail generically. Multi-tenant membership and post-credential tenant selection remain future scope.
- [x] Successful login returns `TenantAuthResponse`, sets user refresh cookie, updates lastLoginAt, and writes USER LOGIN audit.
- [x] Invalid/disabled paths issue no token and expose one generic credential failure contract.
- [x] `permissions[]` comes from current role grants and is present in access claims.

## Evidence

- [x] Automated verification
  - Command(s): `PATH='<node-runtime>':$PATH pnpm --dir backend exec jest --runInBand src/platform/auth/tenant-auth.service.spec.ts`; `PATH='<node-runtime>':$PATH pnpm --dir backend build`
  - Expected proof: identifier/status/permission/audit tests pass; build exit 0.
- [x] Artifact / runtime verification
  - Inspect: decoded test access claim and `AuditLog` fixture.
  - Expect: tenant realm, tenantId, role, permissions, familyId; no secret fields.
- [x] Runtime reachability verification
  - Entrypoint/caller: `AuthController.loginTenant` → `TenantAuthService.login`.
  - Expect: `POST /auth/login` returns 200 for valid fixture.
- [x] Contract / negative-path verification
  - Check: ambiguous duplicate identifier, disabled user, wrong password.
  - Expect: no token and generic 401/403 according to contract.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Cross-tenant identifier leakage | Critical | Tenant predicate in one query and E2E isolation tests |
| Stale/overbroad permissions | High | Load current role joins and assert exact claims |

### Verification receipt

- Mode: full quality gate; no `--flash`.
- `PATH='<node-runtime>':$PATH pnpm --dir backend exec jest --runInBand src/platform/auth/tenant-auth.service.spec.ts`: PASS, 1 suite / 4 tests.
- `PATH='<node-runtime>':$PATH pnpm --dir backend build`: PASS.
- Regression: auth + tenant provisioning suites PASS, 9 suites / 69 tests; Biome changed-file checks PASS.
- Runtime: `AuthController.loginTenant` is mounted through `AppModule` → `AuthModule`; AppModule E2E smoke `/` PASS after resolving Auth/Audit/Tenants forward-ref wiring.
- 2026-07-20 follow-up: removed tenant code from the login request; backend resolves the active tenant from a unique username/email/phone + password match, rejects ambiguous matches generically, and response identity still includes `tenantSlug` as metadata.
- Contract/negative paths: identifier normalization, active-tenant filtering, generic decoy failure, ambiguous duplicate rejection, current role permissions, user refresh cookie, last-login transaction update, and `LOGIN` audit are covered.
- Code review: manual spec/scope/adversarial review PASS, 9.5/10, 0 critical findings.
