# Task R4-02: Integration reachability verification

**Requirement:** R7 — Integration & reachability
**Status:** pending
**Priority:** P1
**Estimated Effort:** S
**Dependencies:** R1-01, R2-01, R3-01, R3-02
**Spec:** specs/admin-tenant-provisioning/

## Context

- **Why**: All parts must be wired into the running app — a passing unit test on an unregistered module or unmounted panel is not proof the feature works.
- **Current state**: After R1–R3, backend module + FE panel/route exist but end-to-end wiring (module registration, navigation → form → API → detail → panel) is unverified.
- **Target outcome**: Documented end-to-end reachability of the whole chain with an authenticated admin token and confirmation that existing behavior did not regress.

## Constraints

- **MUST**: Confirm `TenantUsersModule` and the extended `TenantsController` are registered in `backend/src/app.module.ts` and resolve over HTTP; confirm the FE chain admin nav → tenant list → "Tạo cửa hàng" → `POST /admin/tenants` → tenant detail → users panel is reachable; confirm no regression to `admin-tenant-management` / `admin-rbac-user-management`.
- **SHOULD**: Reuse an authenticated admin token helper; capture route list / screenshots or curl transcripts as proof.
- **MUST NOT**: Treat isolated unit passes as reachability proof; leave any created route/module/panel orphaned; **duplicate R4-01's exhaustive backend acceptance assertions** (seat/last-owner/field-whitelist/status-code matrix) — this task proves wiring & the FE chain, R4-01 proves behavior.
- **SCOPE**: Verify only the R7 wiring for this feature; do not add new behavior.

## Steps

- [ ] 1. Verify backend registration + HTTP reachability (wiring only): `TenantUsersModule` imported in `app.module.ts`; `POST /admin/tenants` and `admin/tenants/:tenantId/users*` resolve (not 404) and are guard-protected (401/403 without token/permission). Exhaustive status-code/business-rule assertions belong to R4-01 — here prove the routes are live and reachable, not re-test every negative path.
  - Business intent: prove backend routes are registered and reachable, not just compiled.
  - Code detail: hit routes via Nest route table / curl; assert non-404 resolution + a single 401/403 gate sample. Do not duplicate R4-01's seat/last-owner/field-whitelist assertions.
  - _Requirements: 7.1_

- [ ] 2. Verify FE reachability chain end-to-end: from admin navigation to tenant list, open "Tạo cửa hàng", submit to create a tenant, land on tenant detail, and see the users panel with seat usage — using a permitted operator.
  - Business intent: prove the user-facing flow is fully wired.
  - Code detail: exercise via web/e2e or a scripted browser run; confirm gated visibility.
  - _Requirements: 7.2_

- [ ] 3. Regression confirmation: run existing tenant/admin-user suites and a build; record results.
  - Business intent: prove no existing behavior broke (R7.3).
  - Code detail: `pnpm build` + relevant e2e; capture output.
  - _Requirements: 7.3_

- [ ] 4. Verification implementation
  - Record a reachability receipt: route resolution proof, FE chain proof, and regression run output.
  - _Requirements: 7.1, 7.2, 7.3_

## Requirements

- 7.1 — module/controller registered and reachable over HTTP
- 7.2 — end-to-end admin nav → create → detail → panel chain reachable
- 7.3 — no regression to existing tenant/admin-user behavior and tests

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/app.module.ts` | Verify | `TenantUsersModule` registered |
| `backend/src/platform/tenants/tenants.controller.ts` | Verify | `POST` route live |
| `frontend/app/admin/(quan-tri)/tenants/page.tsx` | Verify | Create action reachable |
| `frontend/app/admin/(quan-tri)/tenants/[id]/page.tsx` | Verify | Users panel mounted |

## Completion Criteria

- [ ] `POST /admin/tenants` and `admin/tenants/:id/users*` resolve over HTTP and enforce permissions (R7.1).
- [ ] Full FE chain (nav → list → create → detail → panel) demonstrably reachable for a permitted operator (R7.2).
- [ ] Existing tenant/admin-user suites pass and build succeeds — no regression (R7.3).
- [ ] Reachability receipt recorded; no orphaned route/module/panel remains.

## Evidence

This section is both the task-level test plan and the proof checklist. Keep it short, exact, and executable.

- [ ] Automated verification (smoke/e2e/build)
  - Command(s): `cd backend && pnpm build && pnpm test:e2e -- tenant-provisioning-reachability` and `cd frontend && pnpm build`
  - Expected proof: routes resolve, FE build passes, regression suites green; exit 0.
- [ ] Artifact / runtime verification
  - Inspect: Nest route table / curl transcript; FE flow screenshots or e2e trace.
  - Expect: new routes listed and reachable; FE chain completes end-to-end.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `app.module.ts` imports `TenantUsersModule`; FE actions mounted in the tenant pages.
  - Expect: no orphaned module/route/panel; every created surface reachable from a runtime entrypoint.
- [ ] Contract / negative-path verification
  - Check: unauthenticated/unpermitted access to new routes; existing tenant flow unchanged.
  - Expect: 401/403 as designed; prior behavior and tests intact.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Module implemented but not registered (orphan) | High | Explicit `app.module.ts` registration check + HTTP hit |
| FE panel built but not mounted | Medium | Verify import in tenant detail page + live flow |
| Silent regression in existing suites | Medium | Run existing e2e + build and record output |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
