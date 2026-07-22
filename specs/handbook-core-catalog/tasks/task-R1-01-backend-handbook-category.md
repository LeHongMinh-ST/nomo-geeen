# Task R1-01: Persist and serve the Handbook category

**Requirement:** R1 — Persistence/API slice for the canonical Handbook catalog
**Status:** pending
**Priority:** P1
**Estimated Effort:** 1.5-2 days
**Dependencies:** `tasks/task-R0-01-handbook-category-contract.md`
**Spec:** specs/handbook-core-catalog/

## Context

- **Why**: The Prisma model already stores Handbook `Disease` records, but no runtime Handbook API was found and the existing domain enum cannot represent the five requested categories.
- **Current state**: `backend/prisma/schema.prisma` has `Disease.domain: AgriDomain`; backend modules follow `backend/src/platform/<domain>` with guards, DTOs, Prisma services, and Jest tests.
- **Target outcome**: Tenant users can list/create/update Handbook entries with a validated category while legacy records remain readable.

## Constraints

- **MUST**: Add a dedicated category persistence field/enum or equivalent explicit value mapping; do not overload product `Category`.
- **MUST**: Validate new writes against the five selectable IDs; return legacy unknown values as `UNCATEGORIZED`.
- **MUST**: Derive tenant scope and permissions from the existing authenticated context.
- **MUST NOT**: Accept a client tenant ID as an authority, delete disease pins/ingredients, or change recommendation ranking.
- **SCOPE**: Backend schema/migration, Handbook DTO/controller/service, seed/mapping, and focused tests only.

## Steps

- [ ] 1. Extend `backend/prisma/schema.prisma` and add the Prisma migration/backfill mapping for a dedicated Handbook category, preserving all existing Disease relations and recording unmappable rows as `UNCATEGORIZED`.
  - Business intent: existing advice remains available after taxonomy rollout.
  - Code detail: use an additive/reversible migration; preserve `AgriDomain` until all legacy mapping reads are safe; add tenant/category/deleted filtering support as justified by the query.
  - _Requirements: 3.2, 3.3, 7.1, 7.2_
- [ ] 2. Implement the tenant-scoped Handbook API using existing Nest conventions under `backend/src/platform/handbook/` (module, controller, service, DTOs) and return the stable category ID plus exact label.
  - Business intent: UI and future Bán nhanh flows use one server-validated source.
  - Code detail: implement paginated list with category filter, create/update validation, guard/permission checks, and explicit 400 for invalid category; never use request tenant IDs.
  - _Requirements: 2.1, 3.1, 3.2, 3.4, 5.2, 6.1, 6.2_
- [ ] 3. Add backend unit/integration/E2E coverage for valid writes, invalid values, legacy fallback, category filtering, and cross-tenant denial.
  - _Requirements: 3.1, 3.3, 3.4, 5.2, 6.1, 6.2, 7.1_

## Requirements

- 2.1 — Category filtering returns only matching tenant entries.
- 3.1 — Invalid category writes return field-level 400.
- 3.2 — Responses include stable ID and exact label.
- 3.3 — Legacy fields remain intact with explicit mapping/fallback.
- 3.4 — Tenant isolation is preserved for reads and writes.
- 5.2 — Backend filters before serialization with existing pagination.
- 6.1 — Missing auth/permission is rejected by existing boundary.
- 6.2 — Client tenant IDs cannot override scope.
- 7.1 — Unmappable rows remain visible and are reported.
- 7.2 — Rollback does not delete Handbook knowledge or pins.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Add dedicated Handbook category persistence contract. |
| `backend/prisma/migrations/` | Create | Additive migration/backfill for category values. |
| `backend/src/platform/handbook/handbook.module.ts` | Create | Runtime module registration boundary. |
| `backend/src/platform/handbook/handbook.controller.ts` | Create | Tenant-scoped list/create/update endpoints. |
| `backend/src/platform/handbook/handbook.service.ts` | Create | Prisma queries, mapping, and tenant enforcement. |
| `backend/src/platform/handbook/dto/` | Create | Validated request/query DTOs. |
| `backend/src/app.module.ts` | Modify | Register the Handbook module. |
| `backend/test/tenant-handbook.e2e-spec.ts` | Create | HTTP contract and tenant-isolation acceptance tests. |
| `backend/src/platform/handbook/handbook.service.spec.ts` | Create | Service-level mapping/validation tests. |
| `backend/prisma/seed.ts` | Modify | Canonical seed/mapping values, if Handbook seed is owned here. |

## Completion Criteria

- [ ] Database and API persist/return the dedicated category without removing existing technical fields or relations.
- [ ] Invalid new category values fail with 400; legacy unmappable values read as `UNCATEGORIZED` and are reported.
- [ ] Category list filtering is tenant-scoped, paginated, and permission-protected.
- [ ] Focused backend tests cover positive and negative paths, including cross-tenant access.
- [ ] Module is registered from `backend/src/app.module.ts`; no created service/controller is orphaned.

## Evidence

- [ ] Automated verification (backend)
  - Command(s): `pnpm --dir backend test -- --runInBand handbook`; `pnpm --dir backend build`
  - Expected proof: focused Handbook tests and Nest build exit 0.
- [ ] Artifact / runtime verification
  - Inspect: `backend/prisma/schema.prisma`, migration directory, and registered module in `backend/src/app.module.ts`.
  - Expect: category field/migration exists and API routes return the canonical contract.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `backend/src/main.ts` → `backend/src/app.module.ts` → Handbook module/controller.
  - Expect: authenticated tenant request reaches the service and DB query.
- [ ] Contract / negative-path verification
  - Check: invalid category, missing permission, mismatched tenant ID, and unmappable legacy value.
  - Expect: 400/401/403 as appropriate; no cross-tenant row; fallback row preserved and reported.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Incorrect migration mapping changes advice meaning | High | Explicit mapping table, `UNCATEGORIZED` fallback, report counts, reversible migration. |
| New API bypasses tenant/permission guards | High | Reuse existing guard/decorator patterns and negative E2E tests. |
| Prisma schema and generated client drift | Medium | Run Prisma generation through backend build and inspect migration before integration. |

---

> **Parallel marker**: Not parallel; it depends on the canonical contract and blocks runtime UI integration.
