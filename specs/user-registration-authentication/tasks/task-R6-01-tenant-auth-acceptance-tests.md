# Task R6-01: Tenant auth acceptance tests

**Requirement:** R7 — Verification and reachability
**Status:** pending
**Priority:** P0
**Estimated Effort:** L
**Dependencies:** tasks/task-R1-01-public-registration-backend.md, tasks/task-R2-01-tenant-login-identity.md, tasks/task-R3-01-user-session-lifecycle.md, tasks/task-R4-01-authorization-password-change.md
**Spec:** specs/user-registration-authentication/

## Context

- **Why**: Auth is a critical path and cannot be accepted from unit tests alone.
- **Current state**: Admin auth lifecycle and tenant product login fixtures exist; there is no dedicated tenant auth suite.
- **Target outcome**: A deterministic HTTP suite proves the complete tenant lifecycle and protects existing suites.

## Constraints

- **MUST**: Use real Nest HTTP boundary with Postgres/Redis fixtures where available; never mark no-tests as passing.
- **SHOULD**: Use unique suffixes and cleanup that respects FK order.
- **MUST NOT**: Depend on production credentials or leave fixture sessions/rows behind.
- **SCOPE**: Acceptance evidence; implementation fixes belong to R1–R5.

## Steps

- [ ] 1. Create `backend/test/tenant-auth.e2e-spec.ts` covering registration happy/rollback/conflicts, identifier login, status denial, `/me`, refresh/reuse/logout, and forced password change.
  - _Requirements: 7.2, 8.3_
- [ ] 2. Add cross-tenant/permission/Redis outage cases and verify audit rows contain no secret material.
  - _Requirements: 4.2, 4.3, 5.2, 5.3, 5.4, 7.2_
- [ ] 3. Run existing `backend/test/auth-*.e2e-spec.ts` and `backend/test/tenant-products.e2e-spec.ts` as regression checks.
  - _Requirements: 7.4_

## Requirements

- 7.1 — Unit verification.
- 7.2 — Backend HTTP E2E verification.
- 7.3 — Frontend/runtime verification support.
- 7.4 — Existing suite regression verification.
- 8.2 — Performance fixture and p95 evidence.
- 8.3 — Rollback/cleanup evidence.
- 8.4 — Indexed query evidence.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/test/tenant-auth.e2e-spec.ts` | Create | Tenant auth HTTP acceptance suite |
| `backend/test/auth-flow.e2e-spec.ts` | Read / Regression | Existing admin lifecycle |
| `backend/test/tenant-products.e2e-spec.ts` | Read / Regression | Existing tenant login/guard behavior |
| `backend/test/jest-e2e.json` | Read / Modify if needed | E2E discovery/config |

## Completion Criteria

- [ ] Tenant auth E2E covers all lifecycle success and negative paths in R1–R5.
- [ ] No secret fields appear in responses/audit rows and no fixture residue remains.
- [ ] Existing admin and tenant product E2E suites remain passing.
- [ ] Performance fixture reports p95 for login/me/refresh separately from Argon2 cost.

## Evidence

- [ ] Automated verification
  - Command(s): `PATH='<node-runtime>':$PATH pnpm --dir backend exec jest --config test/jest-e2e.json tenant-auth --runInBand`; existing auth/product E2E commands; `PATH='<node-runtime>':$PATH pnpm --dir backend build`
  - Expected proof: all suites exit 0 with non-zero tests and explicit lifecycle assertions.
- [ ] Artifact / runtime verification
  - Inspect: E2E response bodies, Set-Cookie headers, audit rows, and cleanup counts.
  - Expect: contract shapes, secure cookie flags, no secret material, zero fixture residue.
- [ ] Runtime reachability verification
  - Entrypoint/caller: HTTP server from `AppModule` and `AuthController` routes.
  - Expect: no 404 on registration/login/refresh/logout/me/change-password.
- [ ] Contract / negative-path verification
  - Check: all invalid/disabled/locked/reused/cross-tenant/Redis-down cases.
  - Expect: stable status/reason and no unauthorized state change.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| False green from missing E2E discovery | High | Explicit suite path and non-zero test count |
| Tests pollute shared DB/Redis | Medium | Unique fixture namespace and deterministic cleanup |
