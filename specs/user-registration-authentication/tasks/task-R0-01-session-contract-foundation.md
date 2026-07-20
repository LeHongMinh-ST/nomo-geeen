# Task R0-01: Session contract foundation (P)

**Requirement:** R0 — Shared auth/session foundation
**Status:** done
**Priority:** P0
**Estimated Effort:** M
**Dependencies:** none
**Spec:** specs/user-registration-authentication/

## Context

- **Why**: User auth must share proven crypto/session primitives without colliding with admin sessions.
- **Current state**: `TokenService`, `RefreshTokenStore`, `PasswordService`, `AuthModule`, Prisma User/Role/AuditLog, and runtime config exist, but tenant tokens are access-only.
- **Target outcome**: Canonical user realm types, cookie/key namespace helpers, permission identity shape, and configuration are available to downstream tasks.

## Constraints

- **MUST**: Preserve admin token claims, cookie `nomo_admin_rt`, Redis `admin:*` keys, and existing admin tests.
- **SHOULD**: Reuse Argon2id and Lua CAS logic rather than adding a second crypto implementation.
- **MUST NOT**: Store raw credentials, put access tokens in browser storage, or silently change admin endpoints.
- **SCOPE**: Foundation only; user route behavior is implemented by R1–R4.

## Steps

- [x] 1. Extend `backend/src/platform/auth/token.service.ts` with typed tenant access/refresh claims and the `TenantAuthResponse`/`TenantMeResponse` domain shapes from `design.md`; keep `userType=tenant`, `tenantId`, `permissions[]`, and `familyId` explicit.
  - Business intent: all BE/FE tasks consume one identity contract.
  - Code detail: maintain backward compatibility for `signAccess`/admin claims and add separate tenant sign/verify methods.
  - _Requirements: 8.1_
- [x] 2. Extend `backend/src/platform/auth/refresh-token.store.ts` with user-namespaced key helpers and rotation/revocation/blacklist methods; add bounded Redis throttle helpers without sharing admin keys.
  - Business intent: user sessions can rotate and revoke without affecting admins.
  - Code detail: store SHA-256 values only; preserve the existing grace-window Lua behavior.
  - _Requirements: 3.5, 5.1, 5.4, 8.1_
- [x] 3. Extend `backend/src/platform/audit/audit-logger.service.ts` with optional `tenantId` propagation in `AuditInput` and both write paths; preserve existing admin callers.
  - Business intent: tenant auth audit rows remain correctly scoped for the admin audit consumer.
  - Code detail: add `tenantId` to `AuditLog.create` data in `run()` and `log()`; never add secrets.
  - _Requirements: 2.5, 5.3_
- [x] 4. Add configured Origin validation for cookie-backed user refresh/logout endpoints in `backend/src/platform/auth/` and explicitly reject ambiguous admin/user refresh cookies.
  - Business intent: preserve cross-origin development while preventing CSRF and realm confusion.
  - Code detail: reuse `CORS_ORIGIN`; browser requests with missing/mismatched Origin/Referer are rejected before cookie rotation; bearer-only logout still requires the user realm.
  - _Requirements: 3.1, 3.3, 8.6_
- [x] 5. Add focused unit tests in `backend/src/platform/auth/token.service.spec.ts`, `refresh-token.store.spec.ts`, and `backend/src/platform/audit/audit-logger.service.spec.ts` for realm separation, key names, CAS outcomes, tenant audit propagation, and Origin rejection.
  - _Requirements: 7.1, 8.5, 8.6_

## Requirements

- 3.5 — Separate user/admin namespaces.
- 5.1 — Redis-bounded login throttle primitive.
- 5.4 — Redis fail-closed primitive.
- 7.1 — Unit coverage for claims and rotation decisions.
- 8.1 — Password/token namespace safety.
- 8.5 — Rollback compatibility.
- 8.6 — Origin/CSRF and realm-disambiguation foundation.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/token.service.ts` | Modify | Tenant claims and public identity contracts |
| `backend/src/platform/auth/refresh-token.store.ts` | Modify | User Redis namespaces and rotation helpers |
| `backend/src/platform/auth/auth-request-policy.ts` | Create | Origin and refresh-realm policy |
| `backend/src/platform/auth/auth.module.ts` | Modify | Register/export foundation policy |
| `backend/src/platform/audit/audit-logger.service.ts` | Modify | Optional tenant audit scope |
| `backend/src/platform/auth/token.service.spec.ts` | Modify | Tenant claim tests |
| `backend/src/platform/auth/refresh-token.store.spec.ts` | Modify | User key/CAS tests |
| `backend/src/platform/auth/auth-request-policy.spec.ts` | Create | Origin/realm negative-path tests |
| `backend/src/platform/audit/audit-logger.service.spec.ts` | Modify | Tenant audit propagation tests |

## Completion Criteria

- [x] Tenant claim types and named response contracts match `design.md` byte-for-byte.
- [x] User Redis keys/cookie namespace cannot resolve to admin keys in unit tests.
- [x] Existing admin auth unit tests remain passing.
- [x] New helpers are exported/registered from `AuthModule` and have no orphaned runtime path.

## Evidence

- [x] Automated verification
  - Command(s): `PATH='<node-runtime>':$PATH pnpm --dir backend exec jest --runInBand src/platform/auth/token.service.spec.ts src/platform/auth/refresh-token.store.spec.ts`; `PATH='<node-runtime>':$PATH pnpm --dir backend build`
  - Expected proof: focused tests and backend build exit 0.
- [x] Artifact / runtime verification
  - Inspect: `backend/src/platform/auth/auth.module.ts`, Redis key helper exports, token payload unit snapshots.
  - Expect: user providers are registered and admin providers remain unchanged.
- [x] Runtime reachability verification
  - Entrypoint/caller: `backend/src/app.module.ts` → `AuthModule` → tenant auth routes/guards in later tasks.
  - Expect: foundation providers resolve during Nest compile.
- [x] Contract / negative-path verification
  - Check: tenant token presented to admin guard; admin token presented to tenant guard; wrong cookie/key prefix.
  - Expect: 401 and no cross-realm Redis mutation.

### Verification run (2026-07-20)

```bash
pnpm --dir backend exec jest --runInBand \
  src/platform/auth/token.service.spec.ts \
  src/platform/auth/refresh-token.store.spec.ts \
  src/platform/auth/auth-request-policy.spec.ts \
  src/platform/audit/audit-logger.service.spec.ts
# PASS — Test Suites: 4 passed; Tests: 33 passed (exit 0)
```

- PASS: focused foundation suites — 4 suites / 33 tests (realm separation, Redis key namespaces, Lua CAS rotation, tenant audit propagation, Origin/realm rejection).
- PASS: `auth-request-policy.ts` exists and is registered/exported from `AuthModule`; admin and user Redis prefixes asserted separately (no cross-realm collision).
- PASS: negative paths — admin token rejected by tenant verifier; ambiguous/missing/untrusted cookie realm/origin rejected before rotation.
- NOTE: earlier full-gate receipt (below) also recorded backend build PASS + Biome PASS + admin regression suites PASS with zero critical review findings; the run above is the fresh re-verification for the completion gate.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Admin regression from shared token changes | Critical | Preserve existing methods/claims and run admin E2E |
| User/admin Redis collision | Critical | Prefix assertions and negative tests |

### Verification receipt

- Mode: full quality gate; no `--flash`.
- `PATH='<node-runtime>':$PATH pnpm --dir backend exec jest --runInBand src/platform/auth/token.service.spec.ts src/platform/auth/refresh-token.store.spec.ts`: PASS, 2 suites / 21 tests; Redis-backed namespace and Lua rotation checks ran against Redis 7.
- `PATH='<node-runtime>':$PATH pnpm --dir backend build`: PASS.
- `PATH='<node-runtime>':$PATH pnpm --dir backend exec biome check <9 changed auth/audit files>`: PASS.
- Additional regression: auth suite PASS, 7 suites / 49 tests; audit logger suite PASS, 1 suite / 8 tests; `git diff --check`: PASS.
- Artifact/runtime: `AppModule` imports `AuthModule`; `AuthModule` registers/exports `AuthRequestPolicy`, `RefreshTokenStore`, and tenant token providers; admin and user Redis prefixes are asserted separately.
- Negative paths: admin token rejected by tenant verifier; ambiguous/missing/untrusted cookie realms/origins rejected; tenant audit scope propagates through `run`, `writeInTx`, and `log`.
- Code review: manual spec/scope/adversarial review PASS, 9.5/10, 0 critical findings.
