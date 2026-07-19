# Task R4-01: Backend acceptance tests

**Requirement:** R1/R2/R3 acceptance; R8 — NFRs
**Status:** pending
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** R1-01, R2-01
**Spec:** specs/admin-tenant-provisioning/

## Context

- **Why**: The provisioning transaction, seat rule, last-owner guard, and cross-tenant isolation are correctness-critical and must be proven by automated tests, not manual checks.
- **Current state**: Backend e2e suite exists (`backend/test/`); no coverage for tenant creation or tenant-user management.
- **Target outcome**: A backend acceptance suite that exercises the happy paths and every guarded negative path for R1–R3, runnable in CI.

## Constraints

- **MUST**: Assert atomic rollback (no orphan tenant on owner-insert failure), 409 `SLUG_TAKEN`/`USERNAME_TAKEN`, 400 `PASSWORD_MODE_INVALID` (neither/both), 403 without permission, 409 `SEAT_LIMIT_REACHED`, 409 `LAST_OWNER`, 400 `FIELD_NOT_ALLOWED` (protected-field edit), cross-tenant 404, password reset forces `mustChangePassword`, and that no response contains `passwordHash`. Real DB (E2E database), no fake mocks as proof.
- **SHOULD**: Reuse existing e2e harness/auth token helpers and seeded roles/permissions from R0-01.
- **MUST NOT**: Delete or weaken existing tests; assert against stubbed services instead of the real transaction.
- **SCOPE**: Test only R1–R3 behavior and the approved `scope_lock`; no subscription-assignment tests.

## Steps

- [ ] 1. Tenant-creation e2e (`backend/test/tenants-create.e2e-spec.ts`): happy path 201 + public owner shape (incl. `seatBonus`, seeded per-tenant OWNER/MANAGER/STAFF roles, owner linked to per-tenant OWNER); forced owner-insert failure → full rollback (0 tenant rows AND 0 seeded role rows); duplicate slug → 409 `SLUG_TAKEN`; duplicate username → 409 `USERNAME_TAKEN`; password neither/both → 400 `PASSWORD_MODE_INVALID`; missing `admin.tenant:create` → 403; assert no `passwordHash` in any response.
  - Business intent: prove atomic provisioning (tenant + roles + owner + audit) and authz.
  - Code detail: use E2E DB + seeded permissions; simulate failure via duplicate username within the tx; assert audit row survival semantics per design.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.5, 2.6, 8.1, 8.2_

- [ ] 2. Tenant-users e2e (`backend/test/tenant-users.e2e-spec.ts`): seat-full create → 409 `SEAT_LIMIT_REACHED` (threshold = plan `maxUsers` of ACTIVE/TRIALING subscription + `seatBonus`); reactivate when full → 409; deactivate/demote last OWNER → 409 `LAST_OWNER`; protected-field edit (tenantId/status/roleId/roleCode/passwordHash) → 400 `FIELD_NOT_ALLOWED`; role change via separate `PATCH :userId/role` succeeds; password reset sets `mustChangePassword=true`; cross-tenant `:userId` → 404; deactivate frees a seat.
  - Business intent: prove seat, last-owner, mass-assignment, reset, and isolation invariants.
  - Code detail: seed a tenant near cap; toggle `seatBonus`/subscription to exercise thresholds.
  - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 8.1_

- [ ] 3. Regression guard: run existing `admin-tenant-management` / `admin-rbac-user-management` suites to confirm no regression.
  - Business intent: protect existing behavior (R7.3).
  - Code detail: include in the same `pnpm test:e2e` run.
  - _Requirements: 3.7_

- [ ] 4. Verification implementation
  - Execute the full e2e run and capture PASS output with real assertion counts (no `0 tests + exit 0`).
  - _Requirements: 1.1, 3.3, 3.5, 3.7_

## Requirements

- 1.1/1.2/1.3/1.4 — creation happy path, rollback, permission gate, per-tenant role seeding
- 2.2/2.5/2.6 — duplicate slug 409, required username / `USERNAME_TAKEN`, password-mode discriminated union
- 3.3/3.4/3.5/3.6/3.7 — seat, field whitelist / `FIELD_NOT_ALLOWED`, last-owner, seat-freeing, cross-tenant isolation
- 8.1/8.2 — no `passwordHash` leak, atomic integrity

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/test/tenants-create.e2e-spec.ts` | Create | Tenant+owner creation acceptance tests |
| `backend/test/tenant-users.e2e-spec.ts` | Create | Tenant-user seat/last-owner/cross-tenant tests |

## Completion Criteria

- [ ] Creation happy path, rollback (tenant + seeded roles), `SLUG_TAKEN`, `USERNAME_TAKEN`, `PASSWORD_MODE_INVALID`, and 403 all covered and passing (R1.1–R1.4, R2.2, R2.5, R2.6).
- [ ] Seat, `FIELD_NOT_ALLOWED`, last-owner, seat-freeing, reset-forces-`mustChangePassword`, and cross-tenant cases covered and passing (R3.3–R3.7).
- [ ] No response asserts contain `passwordHash`; existing suites still green (R8.1, R7.3).
- [ ] Test run reports real assertion counts — not `NO_TESTS` or `0 tests + exit 0`.

## Evidence

This section is both the task-level test plan and the proof checklist. Keep it short, exact, and executable.

- [ ] Automated verification (e2e)
  - Command(s): `cd backend && pnpm test:e2e -- tenants-create tenant-users`
  - Expected proof: all listed cases PASS with non-zero assertion count; exit 0.
- [ ] Artifact / runtime verification
  - Inspect: e2e reporter output; DB state after the rollback test.
  - Expect: named test cases PASS; zero tenant rows persisted after forced failure.
- [ ] Runtime reachability verification
  - Entrypoint/caller: tests hit real HTTP routes from `TenantsController`/`TenantUsersController`.
  - Expect: routes exercised through the Nest app, not service stubs.
- [ ] Contract / negative-path verification
  - Check: each negative path (403/404/409 variants) asserted with exact status + stable reason.
  - Expect: correct codes/reasons; state unchanged after each failure.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Green suite that asserts nothing (`0 tests`) | High | Require real assertion counts; PRECHECK over NO_TESTS |
| Tests coupled to stubs, not the real tx | High | Exercise real HTTP + E2E DB; inspect DB after rollback |
| Flaky seat thresholds | Medium | Control `seatBonus`/subscription explicitly per case |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
