# Task R1-01: Tenant list detail api

**Requirement:** R1 — Tenant list, search, and detail APIs
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** R0-01, R0-02
**Spec:** specs/admin-tenant-management/
**Contracts:** TenantListItem, TenantDetail

## Context
Platform list/detail under `admin.tenant:view`.

## Constraints
Dual guards, soft-delete exclude, order `createdAt desc, id desc`, schema-grounded counts.

## Steps
- [x] Scaffold TenantsModule/controller/service + app.module registration
- [x] GET /admin/tenants list
- [x] GET /admin/tenants/:id detail with counts
- [x] Unit tests for filters, order, 404, aggregates

## Related Files
| Path | Action |
|---|---|
| `backend/src/platform/tenants/tenants.module.ts` | Create |
| `backend/src/platform/tenants/tenants.controller.ts` | Create |
| `backend/src/platform/tenants/tenants.service.ts` | Create |
| `backend/src/platform/tenants/tenants.service.spec.ts` | Create |
| `backend/src/app.module.ts` | Modify |

## Completion Criteria
- [x] Paginated list ordered createdAt desc, id desc
- [x] Filters status + q; pageSize via DTO
- [x] Detail counts users/subscriptions/openTickets
- [x] Soft-deleted/missing → 404; module registered

## Evidence
- [x] `npx jest --testPathPatterns='tenants.service.spec' --no-coverage` → 4 PASS
- [x] `npx tsc -p tsconfig.json --noEmit` → PASS
- [x] `npx nest build` → PASS
- [x] Routes: GET /admin/tenants, GET /admin/tenants/:id with `@RequirePermission('admin.tenant:view')`
- [x] Reachable via AppModule → TenantsModule

### Verification Receipt — 2026-07-18
```
Mode: full
jest tenants.service: PASS (4)
tsc: PASS
nest build: PASS
```

## Risk Assessment
| Risk | Mitigation |
|---|---|
| Missing PermissionGuard | Dual class-level guards + per-route RequirePermission |
| Soft-deleted leak | deletedAt: null on every query |
