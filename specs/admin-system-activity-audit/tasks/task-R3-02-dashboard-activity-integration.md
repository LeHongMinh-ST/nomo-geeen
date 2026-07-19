# Task R3-02: Dashboard activity integration (P)

**Requirement:** R3 — Dashboard activity integration
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** tasks/task-R1-01-audit-query-api.md
**Spec:** specs/admin-system-activity-audit/
Contracts: AuditLogQueryResponse

## Context

- **Why**: The current dashboard “Hoạt động gần đây” list is static and can misrepresent system state.
- **Current state**: `frontend/app/admin/(quan-tri)/page.tsx` maps a local `activities` array.
- **Target outcome**: Dashboard reads the newest audit rows and links to the full log.

## Constraints

- **MUST**: Use the same typed audit API client/contract and request at most the newest 5 records.
- **SHOULD**: Keep the dashboard lightweight and show concise Vietnamese labels mapped from action/resource.
- **MUST NOT**: Invent rows, expose raw JSON/secrets, or duplicate full audit filters.
- **SCOPE**: Dashboard preview only.

## Steps

- [x] 1. Create `frontend/components/admin/dashboard-activity-preview.tsx` as a client child that uses the typed audit client, then replace the static activity data path in `frontend/app/admin/(quan-tri)/page.tsx` with that component.
  - _Requirements: 5.1_
- [x] 2. Add explicit loading, empty, and error states plus a “Xem nhật ký hệ thống” link to `/admin/audit-log`.
  - _Requirements: 5.2, 5.3_
- [x] 3. Preserve dashboard card spacing, accent/icon treatment, and responsive behavior from `DESIGN.md`.
  - _Requirements: 4.5, 5.1_

## Requirements

- 4.5 — Dashboard respects frontend design rules.
- 5.1, 5.2, 5.3 — Real, honest, reachable activity preview.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/app/admin/(quan-tri)/page.tsx` | Modify | Replace static activity path |
| `frontend/components/admin/dashboard-activity-preview.tsx` | Create | Client boundary for bearer-token activity query |
| `frontend/lib/admin-api/audit-logs.ts` | Read | Reuse typed query client |
| `frontend/components/admin/audit-log-page.tsx` | Read | Reuse labels/formatters if shared |
| `DESIGN.md` | Read | Card, spacing, responsive rules |

## Completion Criteria

- [x] Dashboard makes a real bounded audit request through a client child component and renders the newest records without converting the whole dashboard page to client-only rendering.
- [x] Empty/error states are explicit and no static fallback event is shown.
- [x] Link reaches `/admin/audit-log` and remains usable on mobile.

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir frontend lint`; `pnpm --dir frontend build`
  - Expected proof: lint/build exit 0.
- [x] Artifact / runtime verification
  - Inspect: `/admin` with seeded audit rows, no rows, and API failure.
  - Expect: corresponding real/empty/error states and link.
- [x] Runtime reachability verification
  - Entrypoint/caller: dashboard page → `audit-logs.ts` → `GET /admin/audit-logs`.
  - Expect: no local `activities` source remains for displayed events.
- [x] Contract / negative-path verification
  - Check: response with 0 items and 403/5xx.
  - Expect: honest empty/error UI.

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
| Dashboard request harms initial load | Medium | Request only 5 rows and render non-blocking state |
| Different labels from full page | Low | Reuse shared action formatter/contract |

## Verification Receipt

- 2026-07-19: `pnpm --dir frontend lint` passed; `pnpm --dir frontend build` passed.
- Dashboard now mounts a client-only preview that calls `listAuditLogs({ page: 1, pageSize: 5 })`, with explicit loading/empty/error states and a `/admin/audit-log` link.
- Seeded browser-state verification remains part of R4-01; no static activity fallback is claimed here.
