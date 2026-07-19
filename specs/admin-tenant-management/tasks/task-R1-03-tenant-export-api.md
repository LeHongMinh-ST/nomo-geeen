# Task R1-03: Tenant export api

**Requirement:** R1 — Permissioned tenant CSV export API
**Status:** done
**Priority:** P1
**Dependencies:** R0-01, R0-02, R1-01

## Completion Criteria
- [x] GET /admin/tenants/export (before :id route)
- [x] take 10001 → 413; formula-safe CSV
- [x] TENANT_EXPORT audit.log before body return
- [x] Shared list filters

## Evidence
- [x] jest exportCsv formula + 413 cases PASS
- [x] tsc PASS · nest build PASS

### Verification Receipt — 2026-07-18
```
Mode: full
jest tenants.service export cases: PASS
tsc: PASS
nest build: PASS
```
