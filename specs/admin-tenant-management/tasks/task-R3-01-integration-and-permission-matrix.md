# Task R3-01: Integration and permission matrix

**Requirement:** R3 — Cross-layer integration, runtime reachability, and permission matrix
**Status:** done
**Priority:** P1
**Dependencies:** R0-01..R2-02

## Completion Criteria
- [x] Unit matrix on service (list/detail/update/status/export + 403/409/413 paths)
- [x] Frontend routes reachable in build
- [x] Permission codes + AuditLogger paths wired
- [x] Full Postgres/Redis e2e suite `backend/test/admin-tenants.e2e-spec.ts` (12/12 PASS)
- [ ] Local p95 benchmark / EXPLAIN — deferred to ops verification

## Evidence
- [x] jest tenants* PASS (DTO + transitions + service)
- [x] backend tsc + nest build PASS
- [x] frontend tsc + next build PASS (`/admin/cua-hang`, `/admin/cua-hang/[id]`)
- [x] SUPPORT seed grants all four admin.tenant:* (R0-01)
- [x] backend test:e2e admin-tenants.e2e PASS (12/12) — list, q filter, getById (200/404/400-uuid), PATCH (200/409-stale-expectedUpdatedAt/400-http-logoUrl), status transition (ACTIVE→SUSPENDED→ACTIVE, 400 invalid transition), export CSV, 401 unauth.

### Verification Receipt — 2026-07-18
```
Mode: full (Postgres + Redis live via docker: nomogreen-postgres, nomogreen-redis)
backend pnpm tsc --noEmit: PASS
backend pnpm jest (full): PASS (105/105, 13 suites) — no regressions
backend pnpm test:e2e (full): PASS (35/35, 6 suites) — no regressions
backend pnpm test:e2e -- --testPathPatterns admin-tenants.e2e: PASS (12/12)
backend pnpm test:e2e -- --testPathPatterns roles.e2e: PASS (9/9)
routes: /admin/cua-hang, /admin/cua-hang/[id]
```

> Correction vs prior receipt: claim "no existing admin e2e harness" was wrong — `auth-login.e2e-spec.ts` (and its auth-flow/refresh-logout siblings) already run real Postgres+Redis e2e for the admin domain. With Postgres + Redis now live, the previously-deferred `admin-tenants.e2e-spec.ts` was authored and run in this pass (12/12 pass). Prisma 7.8.0 + `@prisma/adapter-pg` `rank` aggregate bug surfaced via the sibling `roles.e2e-spec.ts` was root-caused + fixed in `backend/src/platform/roles/roles.service.ts` (add `omit: { rank: true }` on full-row `Role` queries) — the bug only affected that file; tenant queries did not need remediation.
