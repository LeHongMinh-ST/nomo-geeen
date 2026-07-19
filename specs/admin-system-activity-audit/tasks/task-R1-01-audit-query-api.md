# Task R1-01: Audit query API

**Requirement:** R1 — Audit query and detail
**Status:** done
**Priority:** P1
**Estimated Effort:** L
**Dependencies:** tasks/task-R0-01-schema-permission-foundation.md
**Spec:** specs/admin-system-activity-audit/
Contracts: AuditLogQueryResponse

## Context

- **Why**: Audit rows can be written but cannot be browsed through an API.
- **Current state**: `backend/src/platform/audit/audit-logger.service.ts` only writes; controllers use guarded admin patterns in existing platform modules.
- **Target outcome**: A guarded paginated list route supports bounded, validated filters and stable ordering.

## Constraints

- **MUST**: Use `AccessTokenGuard`, `PermissionGuard`, `@RequirePermission('admin.audit:view')`, DTO validation, Prisma count + bounded page, and `(createdAt DESC, id DESC)` ordering.
- **SHOULD**: Select only contract fields and keep query/search values bounded to 100 characters.
- **MUST NOT**: Return unbounded rows, query arbitrary JSON, or expose raw Prisma errors.
- **SCOPE**: List endpoint only; detail masking is R1-02.

## Steps

- [x] 1. Create `backend/src/platform/audit/dto/audit-query.dto.ts` with page/pageSize and date/actor/tenant/action/resource/resourceId/q validation and clamping rules.
  - _Requirements: 1.2, 1.3, 6.2_
- [x] 2. Add `AuditQueryService.list()` in `backend/src/platform/audit/audit-query.service.ts` and `AuditController` route `GET /admin/audit-logs`.
  - _Requirements: 1.1, 1.2, 6.3_
- [x] 3. Register the controller/service in `backend/src/platform/audit/audit.module.ts` and add unit/controller tests.
  - _Requirements: 2.1, 2.2, 7.3_

## Requirements

- 1.1 — Stable newest-first paginated list contract.
- 1.2 — Validated filters apply before pagination.
- 1.3 — Bounded page size and explicit invalid-filter 400.
- 2.1, 2.2 — Guard and permission boundary.
- 6.2, 6.3 — Bounded memory and indexed stable query.
- 7.3 — Automated API verification.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/audit/dto/audit-query.dto.ts` | Create | Query contract and validation |
| `backend/src/platform/audit/audit-query.service.ts` | Create | Prisma query/count and response mapping |
| `backend/src/platform/audit/audit.controller.ts` | Create | Guarded list endpoint |
| `backend/src/platform/audit/audit.module.ts` | Modify | Register query service/controller |
| `backend/src/platform/audit/audit-query.service.spec.ts` | Create | Filter, order, pagination, failure tests |

## Completion Criteria

- [x] `GET /admin/audit-logs` returns the canonical response with stable order and total.
- [x] Invalid enums/dates return 400; page size clamps to 1..100; DB errors use the standard 5xx path.
- [x] Endpoint returns 401/403 before any audit row is returned when auth/permission is absent.

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir backend test -- --runInBand audit-query`; `pnpm --dir backend build`
  - Expected proof: query unit/controller tests and build exit 0.
- [x] Artifact / runtime verification
  - Inspect: `GET /admin/audit-logs?page=1&pageSize=20&action=LOGIN`.
  - Expect: JSON matches contract and `total` reflects filters.
- [x] Runtime reachability verification
  - Entrypoint/caller: `backend/src/app.module.ts` → `AuditModule` → `AuditController`.
  - Expect: route is present in Nest route map.
- [x] Contract / negative-path verification
  - Check: missing token, missing permission, invalid date, pageSize=1000, DB rejection.
  - Expect: 401/403/400/ bounded response/standard 5xx respectively.

### Verification receipt

- `pnpm --dir backend test -- --runInBand audit-query`: PASS, wrapper command executed and audit query suite passed.
- `pnpm --dir backend test --runInBand audit-query audit.controller`: PASS, 2 suites / 9 tests.
- `pnpm --dir backend build`: PASS, exit 0.
- Biome check: PASS, 6 task files checked with no fixes; `git diff --check`: clean.
- Runtime/contract proof: pageSize `0/-5 → 1`, `1000 → 100`; generic audit IDs accepted; invalid date/enum rejected; count/filter/order/take/select verified; DB failure maps to standard 500; missing token 401; missing permission 403; exact guards and `AppModule → AuditModule → AuditController` reachability verified.
- Privacy boundary: list query does not select `before`/`after`; detail route and recursive masking remain R1-02 scope.

<!-- contract:AuditLogQueryResponse -->
```json
{
  "items": [
    {
      "id": "uuid",
      "tenantId": "uuid|null",
      "actorType": "PLATFORM_ADMIN|USER|SYSTEM",
      "actorId": "string|null",
      "actorRoleCode": "string|null",
      "action": "AuditAction",
      "resource": "string|null",
      "resourceId": "string|null",
      "createdAt": "ISO-8601",
      "before": "sanitized JSON|null",
      "after": "sanitized JSON|null"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 0
}
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Unbounded/slow query | High | `take <= 100`, count/page separation, index-plan fixture |
| Cross-scope disclosure | High | Guard test and platform-admin-only route |
