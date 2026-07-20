# Task R7-01: Integration and reachability verification

**Requirement:** R7 — Verification and reachability; R8 — Non-functional release gate
**Status:** [x]
**Priority:** P0
**Estimated Effort:** M
**Dependencies:** tasks/task-R5-01-user-auth-state.md, tasks/task-R5-02-user-auth-screens.md, tasks/task-R6-01-tenant-auth-acceptance-tests.md
**Spec:** specs/user-registration-authentication/

## Context

- **Why**: Separate backend/frontend tasks can compile while the user journey remains disconnected.
- **Current state**: Admin layout is guarded, but user login page and user app route are not wired to user auth state.
- **Target outcome**: One final proof connects registration → login → app guard → refresh → logout and records rollback/docs requirements.

## Constraints

- **MUST**: Verify the real runtime entrypoints, not only imports; include responsive and keyboard checks.
- **SHOULD**: Use the existing Playwright/browser workflow and exact package commands.
- **MUST NOT**: Change admin navigation or claim completion when a route is only statically present.
- **SCOPE**: Integration verification and release receipt; implementation changes belong to prior tasks.

## Steps

- [x] 1. Wire and verify the user app layout/entry route to `frontend/components/auth/user-auth-guard.tsx`, preserving public `/dang-ky` and `/dang-nhap`.
  - _Requirements: 6.3, 6.4, 7.3_
- [x] 2. Run backend build/unit/E2E and frontend build/lint plus the browser flow at mobile and desktop sizes; record p95 login/me/refresh evidence.
  - _Requirements: 7.1–7.4, 8.2, 8.4_
- [x] 3. Produce the implementation receipt and identify docs/changelog updates required after source changes; verify rollback instructions are actionable.
  - _Requirements: 8.5_

## Requirements

- 7.1 — Final automated proof.
- 7.2 — Final backend runtime proof.
- 7.3 — Final frontend reachability proof.
- 7.4 — Regression proof.
- 8.2 — Performance evidence.
- 8.4 — Index evidence.
- 8.5 — Rollback and docs receipt.
- 8.6 — Cookie Origin/CSRF and realm-disambiguation proof.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/app/(app)/layout.tsx` | Modify | Existing user app route guard entrypoint |
| `frontend/app/dang-nhap/page.tsx` | Read / Modify | Public login entry |
| `frontend/app/dang-ky/page.tsx` | Read | Public registration entry |
| `backend/src/app.module.ts` | Read | Backend module reachability |
| `docs/architecture.md` | Modify after implementation | Auth runtime contract sync |
| `docs/project-changelog.md` | Modify after implementation | User auth release entry |

## Completion Criteria

- [x] User public routes, guarded app route, and backend routes are all reachable in one smoke flow.
- [x] Backend/frontend required commands pass with explicit test counts and no placeholder TODO path.
- [x] Mobile/desktop and keyboard/focus checks pass for auth screens.
- [x] Rollback and docs-sync receipt is recorded before the implementation spec is marked done.

## Evidence

- [x] Automated verification
  - Command(s): `PATH='<node-runtime>':$PATH pnpm --dir backend build`; backend unit/E2E commands from R6; `PATH='<node-runtime>':$PATH pnpm --dir frontend build`; `PATH='<node-runtime>':$PATH pnpm --dir frontend lint`
  - Proof: backend build PASS; auth/product E2E 5 suites/19 tests PASS; tenant p95 E2E 1 suite/2 tests PASS; frontend build PASS (41 routes); frontend lint PASS (206 files).
- [x] Artifact / runtime verification
  - Inspect: browser routes `/dang-ky`, `/dang-nhap`, authenticated user route, `/auth/me`, cookie and Redis namespaces.
  - Proof: Playwright reached login/registration at desktop and registration at 390×844; unauthenticated `/` redirected to `/dang-nhap?next=%2F`; backend E2E exercised `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/change-password`.
- [x] Runtime reachability verification
  - Entrypoint/caller: Next user layout → UserAuthGuard → UserAuthStore → AuthController; backend `AppModule` → `AuthModule`.
  - Proof: route graph and browser snapshots show all public/guarded routes; AppModule smoke and HTTP tests pass.
- [x] Contract / negative-path verification
  - Check: reload, expired access, logout, forced change, disabled user, cross-tenant URL/resource.
  - Proof: guard/HTTP tests cover revoked/forced-change/permission/Redis paths; user auth code contains no storage persistence; p95 receipt: login 105ms (includes Argon2), `/auth/me` 16ms, refresh 13ms on local Postgres/Redis.

## Verification Receipt

- 2026-07-20: frontend route/browser evidence complete at 390×844 and 1440×900; 0 browser errors on auth pages.
- 2026-07-20: unauthenticated app route redirected to `/dang-nhap?next=%2F`.
- 2026-07-20: backend p95 local receipt: login 105ms (Argon2 included), `/auth/me` 16ms, refresh 13ms.
- 2026-07-20: docs, changelog, and implementation notes updated; `docs/.sync_hash` retained at required `39f73c6e9b29773dfa43bbaaf2430c0d054abf7f`.
- 2026-07-20: Rollback: user auth changes are isolated to tenant JWT/cookie/user Redis namespaces and can be disabled/reverted without changing admin cookie/claim contract; admin SameSite=Strict regression passes.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| UI appears complete but route is not mounted | Critical | Browser reachability flow and route inspection |
| Docs/spec marked complete before source/docs sync | High | Receipt plus docs update as release gate |
