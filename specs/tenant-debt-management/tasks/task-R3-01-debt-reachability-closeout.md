# Task R3-01: Debt reachability and closeout

**Requirement:** R1–R5
**Status:** done
**Priority:** P0
**Estimated Effort:** 4–6 hours
**Dependencies:** tasks/task-R1-02-debt-transaction-acceptance-tests.md, tasks/task-R2-01-debt-ui-api-integration.md
**Spec:** specs/tenant-debt-management/
**Contracts:** DEBT_API_V1

## Context
- **Why**: The feature is incomplete until all runtime paths and evidence agree.
- **Current state**: A first pass builds and has targeted unit/frontend proof, but lacks debt E2E and final receipt.
- **Target outcome**: closeout trace proves backend and frontend use shared persisted state.

## Constraints
- **MUST**: run exact required commands and trace real entrypoints.
- **SHOULD**: update only debt notes and spec state.
- **MUST NOT**: mark done with missing E2E or baseline blockers.
- **SCOPE**: integration, reachability, evidence, and registry only.

## Steps
- [x] Trace AppModule -> DebtsModule -> guards -> controller -> service -> Prisma and both frontend routes -> API client -> backend. _Requirements: 1.1, 1.3, 2.1, 2.2, 4.1, 4.2_
- [x] Run backend/frontend checks and isolated E2E; record every outcome. _Requirements: 5.1, 5.2, 5.3_
- [x] Update implementation notes and registry only after all criteria pass. _Requirements: 5.3_

## Requirements
- 1.1, 1.3, 2.1, 2.2, 4.1, 4.2, 5.1, 5.2, 5.3

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/src/app.module.ts | Read | Backend registration |
| frontend/app/(app)/cong-no/page.tsx | Read | List entrypoint |
| frontend/app/(app)/cong-no/[id]/page.tsx | Read | Detail entrypoint |
| specs/tenant-debt-management/implementation-notes.html | Modify | Receipt |
| specs/tenant-debt-management/spec.json | Modify | Registry state |

## Completion Criteria
- [x] Every API/UI surface is reachable from a real entrypoint.
- [x] Backend unit/E2E and frontend test/lint/build have fresh receipts.
- [x] Critical review issues are zero; local database mismatch is recorded in implementation notes; all feature evidence is complete.

## Evidence
- [x] Automated verification: backend build, debt Jest 5/5, isolated debt E2E 1/1, frontend test 17/17, lint/build, and git diff --check pass.
- [x] Artifact verification: AppModule/DebtsModule route trace, App Router list/detail routes, implementation notes, and registry.
- [x] Runtime reachability verification: backend guards/controller/service/Prisma and frontend userFetch/API/list/detail all connect to persisted state.
- [x] Contract/negative path: migration, E2E, replay, permission, isolation, validation, and rollback evidence present; unrelated legacy DB history remains documented.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| False completion | High | evidence-gated registry |
| Baseline migration failure | Medium | isolate and record separately |