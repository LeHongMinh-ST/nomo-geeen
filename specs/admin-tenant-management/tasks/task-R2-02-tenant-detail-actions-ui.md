# Task R2-02: Tenant detail actions ui

**Requirement:** R2 — Admin tenant detail and actions UI
**Status:** done
**Priority:** P1
**Dependencies:** R1-01, R1-02, R2-01

## Completion Criteria
- [x] `/admin/cua-hang/[id]` detail with counts
- [x] Edit form gated `admin.tenant:edit` + expectedUpdatedAt
- [x] Status actions gated `admin.tenant:approve` (5 transitions)
- [x] Safe 400/403/404/409 messages

## Evidence
- [x] `TenantDetailPanel` + detail page wired
- [x] frontend tsc/build PASS

### Verification Receipt — 2026-07-18
```
Mode: full
frontend tsc: PASS
frontend build: PASS
```
