# Task R2-01: Tenant list ui

**Requirement:** R2 — Admin tenant list UI
**Status:** done
**Priority:** P1
**Dependencies:** R1-01, R1-03

## Completion Criteria
- [x] `/admin/cua-hang` under admin shell with `admin.tenant:view` gate
- [x] Filters, pagination, row navigation, shared query state
- [x] Export gated by `admin.tenant:export`
- [x] Safe errors keep prior rows

## Evidence
- [x] `pnpm --dir frontend` tsc PASS · build PASS (routes `/admin/cua-hang`)
- [x] Client: `frontend/lib/admin-api/tenants.ts`, `TenantList`, `useTenantsManagement`

### Verification Receipt — 2026-07-18
```
Mode: full
frontend tsc: PASS
frontend build: PASS
```
