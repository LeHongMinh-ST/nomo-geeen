# Task R0-01: Session contract foundation (P)

**Requirement:** R0 — Shared auth/session foundation
**Status:** pending
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

- [ ] 1. Extend `backend/src/platform/auth/token.service.ts` with typed tenant access/refresh claims and the `TenantAuthResponse`/`TenantMeResponse` domain shapes from `design.md`; keep `userType=tenant`, `tenantId`, `permissions[]`, and `familyId` explicit.
  - Business intent: all BE/FE tasks consume one identity contract.
  - Code detail: maintain backward compatibility for `signAccess`/admin claims and add separate tenant sign/verify methods.
  - _Requirements: 8.1_
- [ ] 2. Extend `backend/src/platform/auth/refresh-token.store.ts` with user-namespaced key helpers and rotation/revocation/blacklist methods; add bounded Redis throttle helpers without sharing admin keys.
  - Business intent: user sessions can rotate and revoke without affecting admins.
  - Code detail: store SHA-256 values only; preserve the existing grace-window Lua behavior.
  - _Requirements: 3.5, 5.1, 5.4, 8.1_
- [ ] 3. Extend `backend/src/platform/audit/audit-logger.service.ts` with optional `tenantId` propagation in `AuditInput` and both write paths; preserve existing admin callers.
  - Business intent: tenant auth audit rows remain correctly scoped for the admin audit consumer.
  - Code detail: add `tenantId` to `AuditLog.create` data in `run()` and `log()`; never add secrets.
  - _Requirements: 2.5, 5.3_
- [ ] 4. Add configured Origin validation for cookie-backed user refresh/logout endpoints in `backend/src/platform/auth/` and explicitly reject ambiguous admin/user refresh cookies.
  - Business intent: preserve cross-origin development while preventing CSRF and realm confusion.
  - Code detail: reuse `CORS_ORIGIN`; browser requests with missing/mismatched Origin/Referer are rejected before cookie rotation; bearer-only logout still requires the user realm.
  - _Requirements: 3.1, 3.3, 8.6_
- [ ] 5. Add focused unit tests in `backend/src/platform/auth/token.service.spec.ts`, `refresh-token.store.spec.ts`, and `backend/src/platform/audit/audit-logger.service.spec.ts` for realm separation, key names, CAS outcomes, tenant audit propagation, and Origin rejection.
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
| `backend/src/platform/auth/token.service.spec.ts` | Modify | Tenant claim tests |
| `backend/src/platform/auth/refresh-token.store.spec.ts` | Modify | User key/CAS tests |

## Completion Criteria

- [ ] Tenant claim types and named response contracts match `design.md` byte-for-byte.
- [ ] User Redis keys/cookie namespace cannot resolve to admin keys in unit tests.
- [ ] Existing admin auth unit tests remain passing.
- [ ] New helpers are exported/registered from `AuthModule` and have no orphaned runtime path.

## Evidence

- [ ] Automated verification
  - Command(s): `PATH='<node-runtime>':$PATH pnpm --dir backend exec jest --runInBand src/platform/auth/token.service.spec.ts src/platform/auth/refresh-token.store.spec.ts`; `PATH='<node-runtime>':$PATH pnpm --dir backend build`
  - Expected proof: focused tests and backend build exit 0.
- [ ] Artifact / runtime verification
  - Inspect: `backend/src/platform/auth/auth.module.ts`, Redis key helper exports, token payload unit snapshots.
  - Expect: user providers are registered and admin providers remain unchanged.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `backend/src/app.module.ts` → `AuthModule` → tenant auth routes/guards in later tasks.
  - Expect: foundation providers resolve during Nest compile.
- [ ] Contract / negative-path verification
  - Check: tenant token presented to admin guard; admin token presented to tenant guard; wrong cookie/key prefix.
  - Expect: 401 and no cross-realm Redis mutation.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Admin regression from shared token changes | Critical | Preserve existing methods/claims and run admin E2E |
| User/admin Redis collision | Critical | Prefix assertions and negative tests |
