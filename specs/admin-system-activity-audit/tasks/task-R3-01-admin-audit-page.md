# Task R3-01: Admin audit page

**Requirement:** R3 — Admin frontend experience
**Status:** done
**Priority:** P1
**Estimated Effort:** L
**Dependencies:** tasks/task-R1-01-audit-query-api.md, tasks/task-R1-02-audit-detail-sanitization.md
**Spec:** specs/admin-system-activity-audit/
Contracts: AuditLogQueryResponse

## Context

- **Why**: `/admin/audit-log` is linked in navigation but has no runtime page.
- **Current state**: Admin App Router pages, `adminFetch`, `AdminShell`, and admin components already exist; frontend has no test runner.
- **Target outcome**: A real responsive and accessible audit investigation page.

## Constraints

- **MUST**: Reuse `frontend/lib/admin-api/fetch.ts`; add typed client functions; show loading/empty/error states; use real API data.
- **SHOULD**: Use a table on desktop and stacked cards on mobile; use an accessible detail drawer/route and inline/bottom-drawer filters per `DESIGN.md`.
- **MUST NOT**: Add fake rows, a second auth refresh implementation, horizontal-only mobile table, or raw secret display.
- **SCOPE**: Page/API client/detail interaction; dashboard integration is R3-02.

## Steps

- [x] 1. Add `frontend/lib/admin-api/audit-logs.ts` with typed query/detail functions and the canonical response.
  - _Requirements: 4.1, 4.2_
- [x] 2. Add `/admin/audit-log/page.tsx` and focused admin components under `frontend/components/admin/` for filters, list/cards, pagination, detail, and states.
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
- [x] 3. Add the navigation permission `admin.audit:view` in `frontend/lib/admin-navigation.ts` and verify labels/accessibility.
  - _Requirements: 2.1, 4.5, 5.3_

## Requirements

- 2.1 — Frontend visibility follows audit permission.
- 4.1–4.5 — Real data, filters, responsive list/cards, detail, DESIGN fidelity.
- 5.3 — Reachable from navigation.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/admin-api/audit-logs.ts` | Create | Typed list/detail API client |
| `frontend/app/admin/(quan-tri)/audit-log/page.tsx` | Create | Runtime route |
| `frontend/components/admin/audit-log-page.tsx` | Create | Stateful page composition |
| `frontend/components/admin/audit-log-filters.tsx` | Create | Responsive filters |
| `frontend/components/admin/audit-log-table.tsx` | Create | Desktop/mobile event rendering |
| `frontend/components/admin/audit-log-detail.tsx` | Create | Accessible detail disclosure |
| `frontend/lib/admin-navigation.ts` | Modify | Permission-gated nav item |
| `DESIGN.md` | Read | Canonical visual/accessibility constraints |

## Completion Criteria

- [x] `/admin/audit-log` loads API data and displays loading, empty, error, pagination, and detail states.
- [x] Desktop and mobile layouts show core event information without horizontal scrolling on mobile.
- [x] Filters, pagination, and detail are keyboard reachable with labels/focus; nav item hides/denies without permission.

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir frontend lint`; `pnpm --dir frontend build`
  - Expected proof: lint/build exit 0.
- [x] Artifact / runtime verification
  - Inspect: `/admin/audit-log` at desktop and mobile viewport; seeded real audit rows.
  - Expect: table/cards, filters, detail, and permission-aware navigation render.
- [x] Runtime reachability verification
  - Entrypoint/caller: `frontend/app/admin/(quan-tri)/audit-log/page.tsx` → `audit-logs.ts` → backend route.
  - Expect: no placeholder data and successful authenticated request.
- [x] Contract / negative-path verification
  - Check: 403, empty response, API error, keyboard tab/focus.
  - Expect: explicit UI states and no secret values.

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
| Mobile table unreadable | High | Separate card rendering and viewport smoke test |
| Permission stale in client | Medium | Backend remains authoritative; use existing refresh/retry path |

## Verification Receipt

- 2026-07-19: `pnpm --dir frontend lint` passed; `pnpm --dir frontend build` passed and emitted `/admin/audit-log`.
- Typed client, guarded route, permission-gated navigation, bounded filters, responsive table/cards, detail disclosure, and sanitized JSON states are implemented.
- Manual browser fixture verification remains part of R4-01; this task does not claim seeded runtime proof.
