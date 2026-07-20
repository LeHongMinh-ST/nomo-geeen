# Task R5-02: User auth screens (P)

**Requirement:** R6 — Frontend registration and authentication
**Status:** [x]
**Priority:** P0
**Estimated Effort:** L
**Dependencies:** tasks/task-R1-01-public-registration-backend.md, tasks/task-R5-01-user-auth-state.md
**Spec:** specs/user-registration-authentication/

## Context

- **Why**: `/dang-nhap` is a mock form and there is no user registration form or real session flow.
- **Current state**: `frontend/app/dang-nhap/page.tsx` renders `LoginForm`; `frontend/components/auth/login-form.tsx` validates only phone/password and delays locally.
- **Target outcome**: Real, accessible, responsive registration/login/password-change screens are reachable from the user app.

## Constraints

- **MUST**: Follow `DESIGN.md` and `docs/design-guidelines.md`: mobile-first, 48px targets, Be Vietnam Pro/Inter, semantic labels, visible focus, Vietnamese labels/errors.
- **SHOULD**: Preserve existing brand marketing layout while replacing only the mock form behavior.
- **MUST NOT**: Put admin login UI/store on user routes or show raw API/credential errors.
- **SCOPE**: User-facing screens and route wiring only.

## Steps

- [x] 1. Modify `frontend/components/auth/login-form.tsx` and `frontend/app/dang-nhap/page.tsx` to collect identifier and password, call `UserAuthStore.login`, preserve safe fields, and redirect after success. The current one-user-one-tenant model does not require a tenant picker.
  - _Requirements: 6.2, 6.5, 6.6_
- [x] 2. Create `frontend/app/dang-ky/page.tsx` and `frontend/components/auth/register-form.tsx` for tenant + OWNER fields and validation; call `UserAuthStore.register` and show success/409/429 states.
  - _Requirements: 6.1, 6.5, 6.6_
- [x] 3. Create forced-password-change UI under `frontend/app/doi-mat-khau/page.tsx` or the existing user app route convention and wire it to `changePassword`; update links and route guard behavior.
  - _Requirements: 4.4, 6.4, 6.5, 6.6_
- [x] 4. Verify keyboard/focus/viewport states with the project browser workflow and add no visual regressions to admin pages.
  - _Requirements: 6.6, 7.3_

## Requirements

- 6.1 — Registration form fields and advisory validation.
- 6.2 — Real login form and redirect.
- 6.3 — Session hydration behavior.
- 6.4 — Logout and guarded user routes.
- 6.5 — Vietnamese error/forced-change states.
- 6.6 — Responsive/accessibility/design rules.
- 4.4 — Forced password-change route.
- 7.3 — Runtime UI proof.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/app/dang-nhap/page.tsx` | Modify | User login page context text/layout |
| `frontend/components/auth/login-form.tsx` | Modify | Real user login form |
| `frontend/app/dang-ky/page.tsx` | Create | Registration route |
| `frontend/components/auth/register-form.tsx` | Create | Registration UI |
| `frontend/app/doi-mat-khau/page.tsx` | Create | Forced password change route |
| `frontend/components/auth/user-auth-guard.tsx` | Modify | User redirect/gating integration |

## Completion Criteria

- [x] `/dang-nhap` sends identifier + password to real API and redirects after success; tenant identity comes from the credential match.
- [x] `/dang-ky` creates account through real API and preserves non-secret fields on validation/conflict failure.
- [x] Forced password change is reachable and blocks business UI until success.
- [x] Auth UI passes mobile/desktop viewport, keyboard/focus, labels, and 48px touch-target checks.

## Evidence

- [x] Automated verification
  - Command(s): `PATH='<node-runtime>':$PATH pnpm --dir frontend build`; `PATH='<node-runtime>':$PATH pnpm --dir frontend lint`
  - Proof: Next build PASS with 41 routes; Biome lint PASS across 206 files.
- [x] Artifact / runtime verification
  - Inspect: `/dang-ky`, `/dang-nhap`, forced-change route at 390px and 1440px.
  - Proof: Playwright snapshots reached `/dang-nhap` and `/dang-ky` with semantic labels, loading-capable CTA, Vietnamese copy, visible password toggle, and 390px responsive layout; forms import only user auth state.
- [x] Runtime reachability verification
  - Entrypoint/caller: Next routes → forms → `UserAuthStore` → `user-auth-api.ts` → backend auth routes.
  - Proof: route graph contains `/dang-ky`, `/dang-nhap`, `/doi-mat-khau`; Playwright navigation from login to registration succeeded without 404.
- [x] Contract / negative-path verification
  - Check: invalid slug, duplicate slug, invalid credentials, locked login, forced-change response.
  - Proof: client validation covers slug/password/email; API status mapping covers 400/401/403/409/429/5xx with Vietnamese inline errors.

## Verification Receipt

- 2026-07-20: frontend build PASS — 41 routes, TypeScript passed.
- 2026-07-20: frontend lint PASS — 206 files.
- 2026-07-20: Playwright PASS — login and registration route snapshots; 390×844 responsive snapshot; 0 browser errors.
- 2026-07-20: Review: no critical findings; admin routes remain outside user auth components.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| User form remains disconnected from API | Critical | Browser network/runtime proof |
| Auth errors leak technical details | Medium | Explicit status-to-Vietnamese mapping |
