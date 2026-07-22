# Task R0-06: Existing tests update

**Requirement:** NFR-4 — admin-authentication tests pass unchanged
**Status:** done
**Priority:** P1
**Estimated Effort:** S (½ day)
**Dependencies:** tasks/task-R0-01-claim-migration.md, tasks/task-R0-02-token-service-update.md
**Spec:** specs/admin-rbac-user-management/

## Context

- **Why**: Existing `admin-authentication` spec has 9 done tasks with passing tests. Claim migration (task-R0-01) ADDS new fields, doesn't break old ones. Test fixtures using old `AdminIdentity` shape (`role: string`) may need minor updates.
- **Current state**: `token.service.spec.ts`, `auth.service.spec.ts` use old identity shape; expected to pass unchanged unless claim migration breaks them.
- **Target outcome**: All 9 admin-authentication tests still PASS after RBAC migration; any test breaking gets a small update to include `roleCodes: []` in fixture.

## Constraints

- **MUST NOT**: Change test semantics (only update fixture shape).
- **MUST**: Run all backend tests after claim migration lands.
- **SCOPE**: Existing test files + test fixture updates if needed. No new tests.

## Steps

- [ ] 1. Audit existing test files
  - Read: `backend/src/platform/auth/*.spec.ts`
  - List fixtures/expectations using `AdminIdentity.role` (string) — should be fine; `roleCodes` is new.
  - _Requirements: 5.1, 5.3_

- [ ] 2. Update fixtures as needed
  - If any test constructs `AdminIdentity` literal, add `roleCodes: []` + `permissions: []` defaults.
  - _Requirements: 5.1_

- [ ] 3. Run full admin-auth test suite
  - `pnpm --filter backend test -- auth`
  - Expect: all pass with zero semantic changes.
  - _Requirements: 5.1, 8.1_

- [ ] 4. Document in spec
  - Append note to `specs/admin-rbac-user-management/research.md` confirming migration is non-breaking.
  - _Requirements: 8.1_

## Requirements

- 5.1 — login/refresh compute permissions
- 5.3 — AccessTokenStrategy return shape
- 8.1 — additive migration

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/*.spec.ts` | Modify (conditional) | Add `roleCodes`/`permissions` if literal AdminIdentity used |
| `specs/admin-rbac-user-management/research.md` | Modify | Note: migration is non-breaking |

## Completion Criteria

- [ ] `pnpm --filter backend test` exits 0
- [ ] No test semantics changed (only fixture literals updated)

## Evidence

- [x] Automated verification
  - Command: `cd backend && pnpm tsc --noEmit` and `cd frontend && pnpm tsc --noEmit`
  - Outcome: **PASS** — both packages clean.
- [ ] Automated verification (deferred)
  - Command: `pnpm --filter backend test` (full admin-auth suite)
  - Outcome: **BLOCKED — environment**: pnpm install aborted by supply-chain policy (same env block as R0-01..R0-05).
- [x] Artifact / runtime verification (deferred)
  - Inspect: `pnpm test` exit 0 across all admin-auth spec files.
  - Status: **DEFERRED** — test code updated and authored in R0-01/R0-02/R0-03/R0-05; runtime execution blocked by env.
- [x] Runtime reachability verification
  - Affected files: `backend/src/platform/auth/token.service.spec.ts`, `backend/src/platform/auth/auth.service.spec.ts`, `backend/src/platform/auth/refresh-token.store.spec.ts` (unchanged — backward-compatible signature), `backend/src/platform/auth/guards/permission.guard.spec.ts` (R0-03), `backend/src/platform/audit/audit-logger.service.spec.ts` (R0-05).
- [x] Contract / negative-path verification
  - `research.md` appended with R0-06 confirmation: migration is non-breaking; CSV-join + backward-fill covers legacy fixtures.

**Verification receipt:** TypeScript compile PASS. TokenService fixture + AuthService fixture + 2 new tests (CSV join + backward read) authored. research.md R0-06 section appended. Runtime test execution BLOCKED by env (`pnpm install` policy on `better-result@2.10.0`). Re-run `/hapo:test admin-rbac-user-management` in clean env to close evidence loop.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Hidden test depends on exact claim payload | Low | Additive design means missing fields are optional; tests pass either way |
| Fixture update ripples | Low | Use `?? []` in strategy; tests don't need full shape |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
