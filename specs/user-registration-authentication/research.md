# Research & Design Decisions

## Summary

- **Feature**: `user-registration-authentication`
- **Discovery Scope**: Complex integration / security-critical extension
- **Key Findings**:
  - Backend already has a minimal tenant login and tenant JWT guard, but it issues access-only tokens and has no tenant session lifecycle.
  - The public login page is still a delay-based mock and does not provide the backend-required tenant slug.
  - `User`, `Role`, `AuditLog`, Redis, Argon2id, and admin refresh-rotation patterns already exist and should be reused.
  - Public registration must reuse the tenant owner/role creation boundary from `admin-tenant-provisioning`; otherwise the two flows can diverge on role grants and atomicity.

## Evidence Summary

- **Codebase Scout**: Required and completed.
  - Result: identified exact backend auth, schema, Redis, audit, frontend, test, and provisioning-spec surfaces.
  - Relevant files/modules: `backend/src/platform/auth/*`, `backend/src/platform/audit/audit-logger.service.ts`, `backend/prisma/schema.prisma`, `frontend/components/auth/login-form.tsx`, `frontend/components/auth/auth-guard.tsx`, `frontend/stores/admin-auth-store.ts`, `backend/test/auth-flow.e2e-spec.ts`, `backend/test/tenant-products.e2e-spec.ts`.
  - Existing patterns/contracts: Nest module-per-domain, `ValidationPipe`, Prisma transactions, Argon2id `PasswordService`, Redis refresh family CAS, in-memory Zustand admin session, bearer tenant guard.
  - Tests/checks affected: existing admin auth and tenant product E2E must remain green; new tenant auth E2E is required.
- **External / Current Research**: Required and completed.
  - Primary sources: [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [RFC 9700 OAuth 2.0 Security BCP](https://www.rfc-editor.org/rfc/rfc9700).
  - Current constraints: passwords must use a slow memory-hard hash; refresh tokens require replay protection through rotation or sender-constraining; tokens/session lifecycle must not rely on browser storage for credentials.
- **Selected Decision**:
  - Use the existing Argon2id service, Redis-backed hash-only refresh families with atomic rotation/reuse detection, separate `nomo_user_rt` cookie namespace, and an in-memory frontend access token.
  - Resolve tenant permissions server-side from the user role at login and `/auth/me`; include a stable `permissions[]` claim in access tokens for request authorization, while reloading identity on refresh.
  - Implement public registration as a transactionally composed tenant + first OWNER operation that delegates role seeding/grant cloning to the provisioning-owned service boundary.
- **Rejected Alternatives**:
  - Persist raw refresh tokens in Postgres — rejected because the existing admin contract already proves Redis hash-only storage and raw token persistence increases breach impact.
  - Store access/refresh tokens in `localStorage` or `sessionStorage` — rejected by OWASP session guidance and the existing admin in-memory pattern.
  - Create a second user/role provisioning implementation in auth — rejected because it would duplicate atomicity, role grants, and audit semantics owned by `admin-tenant-provisioning`.
  - Add OTP/OAuth/MFA now — rejected as explicit out-of-scope expansion for Phase 1.
- **Remaining Gaps / Questions**:
  - `admin-tenant-provisioning` must expose a reusable transactional owner/role creation contract before registration can be integrated.
  - The final public registration URL shape must follow the existing app routing convention; the spec uses `/dang-ky` and `/dang-nhap` as the stable frontend routes.
- **Downstream Task & Test Implications**:
  - Backend tasks must include negative paths for cross-tenant identifiers, disabled tenants/users, lockout, refresh reuse, logout, and forced password change.
  - Frontend tasks must prove cookie credentials, refresh retry, in-memory token handling, tenant slug collection, keyboard/focus behavior, and responsive auth screens.

## Codebase Scout

| Area | Finding | Evidence / Path | Implication |
|---|---|---|---|
| Project surface | pnpm monorepo with Next.js 16/React 19 frontend and NestJS 11/Prisma 7/Postgres/Redis backend | `frontend/package.json`, `backend/package.json`, `docs/codebase-summary.md` | Keep BE/FE tasks separate and use existing commands |
| Auth backend | Tenant login exists but returns only an access token; admin auth has the complete rotation pattern | `backend/src/platform/auth/tenant-auth.service.ts`, `backend/src/platform/auth/auth.service.ts` | Extend shared auth primitives without changing admin semantics |
| Identity schema | `User` is tenant-scoped, username required, email/phone optional, role-linked, soft-deletable, and has `mustChangePassword` | `backend/prisma/schema.prisma:464-494` | No new user table; add only session/lockout data if evidence requires it |
| Authorization | Tenant JWT has `tenantId` and one role code; product routes use tenant guard + entitlement guard | `backend/src/platform/auth/strategies/tenant-access-token.strategy.ts`, `backend/src/platform/products/products.controller.ts` | Add tenant permission loading and keep tenantId server-derived |
| Session storage | Redis refresh family Lua CAS and access blacklist are admin-namespaced | `backend/src/platform/auth/refresh-token.store.ts` | Generalize or add user-namespaced methods; never mix admin/user cookie/key families |
| Audit | Shared logger supports event-only and same-transaction writes; actions already include LOGIN/LOGOUT/REFRESH_REUSE_DETECTED | `backend/src/platform/audit/audit-logger.service.ts`, `backend/prisma/schema.prisma:122-160` | Emit `actorType=USER`, tenantId, role code, IP, and User-Agent without secrets |
| Frontend | User login form is mock; auth guard is admin-only and admin store is in-memory | `frontend/components/auth/login-form.tsx`, `frontend/components/auth/auth-guard.tsx`, `frontend/stores/admin-auth-store.ts` | Create user-specific client/store; do not reuse admin identity types blindly |
| Tests | Admin lifecycle E2E and tenant product login fixture exist; no dedicated tenant auth suite | `backend/test/auth-flow.e2e-spec.ts`, `backend/test/tenant-products.e2e-spec.ts` | Add a complete tenant lifecycle suite and preserve existing suites |
| Blast radius | Auth controller/token/Redis contracts and frontend login route are shared critical paths | `backend/src/platform/auth/*`, `frontend/app/dang-nhap/page.tsx` | Require rollback notes, contract tests, and final reachability verification |
| Staleness / conflicts | `docs/database-design-platform-user.md` describes refresh + permissions claims that current tenant code does not yet implement | `docs/database-design-platform-user.md:301-335` | This spec closes the documented gap; docs sync is required after implementation |

## External / Current Research

| Question | Source | Finding | Decision Impact |
|---|---|---|---|
| Password storage | OWASP Password Storage Cheat Sheet | Prefer Argon2id with memory-hard parameters; never store plaintext or fast hashes | Reuse `PasswordService`; no plaintext persistence or logging |
| Session lifecycle | OWASP Authentication and Session Management Cheat Sheets | Rotate tokens after authentication events; do not store tokens in browser storage; log session lifecycle | Use HttpOnly refresh cookie, in-memory access token, `/me`, logout, and rotation |
| Refresh replay | RFC 9700 §2.2 and §4.14 | Refresh token rotation or sender-constraining is required to detect replay; family revocation is an accepted rotation pattern | Reuse existing Redis Lua CAS family model under user-specific keys |

## Research Log

### Existing tenant auth gap

- **Context**: User requested registration/auth/login after the initial readiness review.
- **Sources Consulted**: `tenant-auth.service.ts`, `auth.controller.ts`, token/guard/strategy files, frontend login and admin store, schema, tests.
- **Findings**: Login validates active tenant/user and password, but no refresh cookie, `/me`, logout, permissions, audit, last-login update, or frontend wiring exists.
- **Implications**: The new spec must extend rather than replace the existing tenant login path and must keep admin routes backward-compatible.

### Shared provisioning boundary

- **Context**: Registration needs to create the first OWNER while admin provisioning is already implementing that path.
- **Sources Consulted**: `specs/admin-tenant-provisioning/requirements.md`, `design.md`, task files, `TenantsService`, Prisma schema.
- **Findings**: Admin provisioning owns transaction, role seeding, seat/audit behavior; public registration was not in its scope.
- **Implications**: Add an explicit shared service contract and dependency; do not duplicate role cloning in auth.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Decision |
|---|---|---|---|---|
| Reuse existing auth primitives with user namespace | Extend `TokenService`/`RefreshTokenStore` and add tenant session orchestration | Smallest change, consistent with admin auth, proven Redis CAS | Requires careful type/namespace separation | Selected |
| Separate auth package/provider | New independent session/token subsystem | Strong isolation | Duplicates cryptography, cookie, Redis, and error behavior | Rejected |
| Stateless access-only tenant JWT | No refresh state | Simple implementation | Cannot meet logout/replay detection/session requirements | Rejected |

## Design Decisions

### Decision: Tenant session uses shared Redis rotation with separate namespace

- **Context**: Admin session machinery already satisfies rotation/reuse semantics, while user auth currently has no session lifecycle.
- **Alternatives Considered**: Duplicate store; stateless JWT; shared store with mixed keys.
- **Selected Approach**: Reuse the store algorithm behind `user:rt:*`, `user:bl:*`, and `nomo_user_rt`; load the user and role on refresh.
- **Rationale**: Minimizes security-sensitive code and prevents admin/user session collision.
- **Status**: Accepted.
- **Trade-offs**: Shared primitives require explicit realm tests; separate cookie/key names make operations auditable.
- **Follow-up**: Add cross-realm and replay E2E coverage.

### Decision: Public registration delegates first-owner creation

- **Context**: Admin provisioning and public registration need identical tenant/role/user invariants.
- **Selected Approach**: Provisioning owns the reusable transaction service; auth supplies the public request context and calls it.
- **Rationale**: One source of truth for role grants, owner linkage, audit, and rollback.
- **Status**: Accepted, blocked by provisioning contract.

## Risks & Mitigations

- Duplicate provisioning logic — High — explicit dependency and shared service contract.
- Refresh token cross-realm collision — High — separate cookie/key prefixes and realm assertions.
- Permission claim staleness — High — reload role/permissions on refresh and `/auth/me`; keep access TTL short.
- Registration abuse — High — bounded validation, generic conflict responses, Redis IP/identifier throttling, and no raw password/audit payloads.
- Auth regression — High — preserve admin E2E and tenant product E2E; add tenant lifecycle E2E before readiness.

## References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700)

## Unresolved Questions

- Exact production hostname/tenant URL strategy remains owned by deployment configuration; the API contract uses `tenantSlug` explicitly for Phase 1.
