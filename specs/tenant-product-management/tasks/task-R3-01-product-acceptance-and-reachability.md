# Task R3-01 — Product acceptance and reachability

**Status:** done
**Requirement:** R1, R2, R3, R4
**Priority:** P0
**Estimated Effort:** M
**Dependencies:** tasks/task-R1-01-product-crud-and-lookups.md, tasks/task-R2-01-product-ui-api-integration.md
**Spec:** specs/tenant-product-management/

## Context

This task closes the cross-service product flow and records fresh proof before synchronization.

## Constraints

- **MUST:** verify real backend/database and mounted frontend routes.
- **MUST NOT:** claim inventory, sales, purchase, or dashboard behavior as complete.

## Objective

Verify the complete product flow across API, database, user app route, permission boundaries, and docs.

## Steps

- [ ] Run backend unit, E2E, and build verification.
- [ ] Run frontend lint/build and browser route/API reachability verification.
- [ ] Run impact analysis and sync implementation notes/spec evidence.

## Completion Criteria

- [x] Backend and frontend verification commands pass.
- [x] Product UI is mounted from `/san-pham` and no longer depends on seed mutations.
- [x] Spec evidence and implementation notes contain fresh receipts.
- [x] Architecture/changelog and `docs/.sync_hash` are synchronized.

## Requirements

- R1/R2 — API behavior and authorization.
- R3 — UI reachability.
- R4 — complete evidence receipt.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/test/tenant-products.e2e-spec.ts` | Modify | End-to-end API proof |
| `frontend/app/(app)/san-pham/` | Verify | Mounted user product routes |
| `docs/*` | Modify | Architecture and changelog sync |

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| API-backed UI is orphaned or unauthenticated | High | Browser proof for protected route and real API load |

## Runtime Reachability Verification

- [ ] Entrypoint: `/san-pham` → `ProductList` → `tenant-products-api` → `/tenant/products`.

## Evidence

- `git diff --check`
- Product unit/E2E, frontend lint/build, and browser route proof.
- `node .claude/scripts/validate-spec-output.cjs specs/tenant-product-management`
- `node .opencode/scripts/validate-spec-output.cjs specs/tenant-product-management`

## Verification Receipt

- 2026-07-21: Backend full unit PASS — 26 suites / 195 tests.
- 2026-07-21: Product E2E PASS — 1 suite / 6 tests with Postgres/Redis.
- 2026-07-21: Frontend lint PASS, build PASS (42 routes), and test PASS — 3 files / 5 tests.
- 2026-07-21: `git diff --check` PASS; both spec validators PASS.
- 2026-07-21: Impact risk script reported LOW (10/25). The full shell wrapper is incompatible with macOS Bash 3.2 at its unused `declare -A` step; the supported Node risk calculation completed successfully.
- 2026-07-21: Post-fix code review PASS — score 9.7/10, zero Critical/Medium findings.

## Runtime Reachability Verification

- [x] `/san-pham` and `/san-pham/[id]` are mounted routes behind `UserAuthGuard` and redirect anonymous sessions to login.
- [x] Authenticated API path is wired: Product UI → `userFetch` → tenant JWT → guards → Prisma Product/Stock.
