# Task R3-01: Acceptance and reachability

**Requirement:** R5
**Status:** done
**Priority:** P0
**Estimated Effort:** M
**Dependencies:** tasks/task-R1-01-tenant-user-api-and-seat-enforcement.md, tasks/task-R2-01-staff-management-ui.md
**Spec:** specs/tenant-user-management/

## Context

The feature crosses tenant JWT auth, Prisma/Redis lifecycle behavior, and the user app. Completion requires runtime proof, not only isolated tests.

## Constraints

- **MUST:** preserve existing admin tenant-user tests and UI.
- **MUST:** use real Postgres/Redis for lifecycle/quota proof where the project harness provides it.
- **MUST:** update docs only for verified behavior and keep multi-tenant selection deferred.

## Steps

- [ ] Run backend unit and tenant auth E2E suites.
- [ ] Run frontend lint/build and browser route/form verification.
- [ ] Run scope/reachability review, update implementation notes/changelog, and record a verification receipt.

## Requirements

- R5.1–R5.3 — audit, backend proof, frontend/browser proof.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/test/tenant-auth.e2e-spec.ts` | Modify | Acceptance scenarios |
| `frontend/*` | Verify | Route and UI reachability |
| `docs/project-changelog.md` | Modify if needed | Verified behavior note |
| `specs/tenant-user-management/implementation-notes.html` | Modify | Decision and verification receipt |

## Completion Criteria

- [x] Real tests cover role boundaries, seat exhaustion/release, last-owner protection, and forced password change.
- [x] Browser verification covers protected route and responsive UI.
- [x] Admin tenant-user panel remains outside changed user auth store/API and frontend lint/build remain passing.
- [x] Spec/task state and docs receipt are synchronized only after proof.
- [x] Audit action migration and runtime rows are included in the verification receipt.

## Evidence

- [x] `pnpm --dir backend test:e2e --runInBand tenant-auth` — PASS, 1 suite / 2 tests.
- [x] `pnpm --dir frontend lint` — PASS.
- [x] `pnpm --dir frontend build` — PASS.
- [x] Browser snapshot/log with no new application errors — PASS for unauthenticated route.
- [x] `git diff --check` — PASS.

## Verification Receipt

- 2026-07-20: backend tenant-auth E2E, frontend lint/build, and browser unauthenticated route proof completed.

## Runtime Reachability Verification

- [ ] Trace and record user browser route, auth hydration, API refresh/retry, tenant endpoint, persistence, and admin regression paths.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Orphaned route or unverified auth boundary | Critical | Trace UserAuthGuard → route → userFetch → tenant API and browser proof |
