# Task R1-02: Tenant edit status api

**Requirement:** R1 — Tenant profile edit and lifecycle status APIs
**Status:** done
**Priority:** P1
**Dependencies:** R0-01, R0-02, R1-01

## Completion Criteria
- [x] PATCH /admin/tenants/:id with edit permission, field whitelist, expectedUpdatedAt → 409
- [x] POST /admin/tenants/:id/status atomic transitions via canTransition + updateMany
- [x] AuditLogger.run for TENANT_UPDATE / TENANT_STATUS_CHANGE
- [x] No delete route; metadata-only status

## Evidence
- [x] jest tenants.service update/transition/export matrix PASS
- [x] tsc PASS · nest build PASS
- [x] AuditLogger.run after snapshot set in-tx for TENANT_UPDATE

### Verification Receipt — 2026-07-18
```
Mode: full
jest tenants.service|tenant-status|tenant-dto: PASS (28)
nest build: PASS
jest tenants.service: PASS (12)
tsc: PASS
nest build: PASS
```
