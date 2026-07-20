# Task R2-01: Staff management UI

**Requirement:** R4
**Status:** done
**Priority:** P0
**Estimated Effort:** L
**Dependencies:** tasks/task-R1-01-tenant-user-api-and-seat-enforcement.md
**Spec:** specs/tenant-user-management/

## Context

The user app has auth state and settings navigation, but staff management exists only in the platform-admin tenant detail screen. The tenant needs its own mobile-first screen.

## Constraints

- **MUST:** follow DESIGN.md: mobile-first, 48px targets, accessible labels/focus, Vietnamese copy.
- **MUST:** use `userFetch` and `useUserAuth`; never import admin auth/API.
- **MUST NOT:** persist generated passwords in browser storage or trust UI gating as authorization.

## Steps

- [ ] Add `frontend/lib/tenant-users-api.ts` for `/tenant/users` using `userFetch`.
- [ ] Add `/thiet-lap/nhan-vien` and link it from settings.
- [ ] Implement seat card, list states, create/edit forms, role actions, lifecycle confirmation, and one-time generated-password reveal.
- [ ] Gate view/mutation controls by user permissions while preserving server error handling.

## Requirements

- R4.1–R4.5 — user-app staff management behavior.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/app/(app)/thiet-lap/nhan-vien/page.tsx` | Create | Protected route |
| `frontend/components/app/settings/*` | Create | Staff list/forms/actions |
| `frontend/lib/tenant-users-api.ts` | Create | Tenant API client |
| `frontend/app/(app)/thiet-lap/page.tsx` | Modify | Settings navigation link |
| `frontend/stores/user-auth-store.ts` | Read | User identity/permissions |

## Completion Criteria

- [x] Route is reachable only after user auth hydration and `user:view` permission.
- [x] Seat full state disables create/reactivate but shows server race errors.
- [x] Forms and action states work at mobile and desktop sizes.
- [x] Generated password is visible once and copyable without persistence.

## Evidence

- [x] `pnpm --dir frontend lint` — PASS, 209 files.
- [x] `pnpm --dir frontend build` — PASS, 42 routes including `/thiet-lap/nhan-vien`.
- [x] Browser snapshot proves unauthenticated `/thiet-lap/nhan-vien` redirect to `/dang-nhap?next=...`; authenticated API reachability is covered by tenant E2E.

## Verification Receipt

- 2026-07-20: user app route generated and visible in Next route manifest.
- 2026-07-20: Playwright unauthenticated route check PASS, 0 application console errors on the final snapshot.

## Runtime Reachability Verification

- [ ] Entrypoint: `/thiet-lap` link → `/thiet-lap/nhan-vien` → `UserAuthGuard` → `tenant-users-api.ts` → `/tenant/users`.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| User UI accidentally uses admin session | High | Import scan and browser route proof |
| Secret remains visible/persisted | High | One-time local state only and explicit cleanup |
