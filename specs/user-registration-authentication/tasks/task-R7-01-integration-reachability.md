# Task R7-01: Integration and reachability verification

**Requirement:** R7 — Verification and reachability; R8 — Non-functional release gate
**Status:** pending
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

- [ ] 1. Wire and verify the user app layout/entry route to `frontend/components/auth/user-auth-guard.tsx`, preserving public `/dang-ky` and `/dang-nhap`.
  - _Requirements: 6.3, 6.4, 7.3_
- [ ] 2. Run backend build/unit/E2E and frontend build/lint plus the browser flow at mobile and desktop sizes; record p95 login/me/refresh evidence.
  - _Requirements: 7.1–7.4, 8.2, 8.4_
- [ ] 3. Produce the implementation receipt and identify docs/changelog updates required after source changes; verify rollback instructions are actionable.
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

- [ ] User public routes, guarded app route, and backend routes are all reachable in one smoke flow.
- [ ] Backend/frontend required commands pass with explicit test counts and no placeholder TODO path.
- [ ] Mobile/desktop and keyboard/focus checks pass for auth screens.
- [ ] Rollback and docs-sync receipt is recorded before the implementation spec is marked done.

## Evidence

- [ ] Automated verification
  - Command(s): `PATH='<node-runtime>':$PATH pnpm --dir backend build`; backend unit/E2E commands from R6; `PATH='<node-runtime>':$PATH pnpm --dir frontend build`; `PATH='<node-runtime>':$PATH pnpm --dir frontend lint`
  - Expected proof: all required commands exit 0 and test suites execute non-zero tests.
- [ ] Artifact / runtime verification
  - Inspect: browser routes `/dang-ky`, `/dang-nhap`, authenticated user route, `/auth/me`, cookie and Redis namespaces.
  - Expect: complete user journey and no admin/user cross-wiring.
- [ ] Runtime reachability verification
  - Entrypoint/caller: Next user layout → UserAuthGuard → UserAuthStore → AuthController; backend `AppModule` → `AuthModule`.
  - Expect: each link is mounted/invoked over HTTP.
- [ ] Contract / negative-path verification
  - Check: reload, expired access, logout, forced change, disabled user, cross-tenant URL/resource.
  - Expect: correct redirect/denial and no token persistence.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| UI appears complete but route is not mounted | Critical | Browser reachability flow and route inspection |
| Docs/spec marked complete before source/docs sync | High | Receipt plus docs update as release gate |
