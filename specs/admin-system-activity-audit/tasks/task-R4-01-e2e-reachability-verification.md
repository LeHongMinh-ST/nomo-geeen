# Task R4-01: E2E and reachability verification

**Requirement:** R4 — End-to-end integration and release gate
**Status:** pending
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** tasks/task-R2-01-audit-coverage-contract-tests.md, tasks/task-R3-01-admin-audit-page.md, tasks/task-R3-02-dashboard-activity-integration.md
**Spec:** specs/admin-system-activity-audit/
Contracts: AuditLogQueryResponse

## Context

- **Why**: Multiple backend/frontend outputs can pass isolated checks while remaining unreachable at runtime.
- **Current state**: The nav link is orphaned, dashboard activity is static, and there is no audit HTTP/UI acceptance flow.
- **Target outcome**: One verification receipt proves registration, authz, API contract, page reachability, dashboard integration, and responsive accessibility.

## Constraints

- **MUST**: Verify the real Nest HTTP route and real Next route using seeded audit data; include desktop/mobile and keyboard checks.
- **SHOULD**: Reuse existing Playwright/browser workflow if available; otherwise record a concrete manual runtime receipt.
- **MUST NOT**: Mark complete from unit tests alone or hide unresolved build/runtime failures.
- **SCOPE**: Final integration and verification only; no new product behavior.

## Steps

- [ ] 1. Add/extend `backend/test/admin-audit.e2e-spec.ts` for authenticated list/detail, filters, permission denial, masking, and not-found.
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.2, 2.3, 7.3_
- [ ] 2. Verify frontend route/navigation/dashboard reachability and desktop/mobile/keyboard behavior using the project browser/runtime workflow.
  - _Requirements: 4.1, 4.3, 4.4, 4.5, 5.1, 5.3, 7.2_
- [ ] 3. Run final backend/frontend build/lint/test receipt and record rollback/release notes in this task.
  - _Requirements: 6.1, 7.1, 7.3_

## Requirements

- 1.1, 1.2, 1.4, 1.5 — Real list/detail HTTP flow.
- 2.2, 2.3 — Auth denial and masking.
- 4.1, 4.3, 4.4, 4.5 — Real responsive UI path.
- 5.1, 5.3 — Dashboard and link reachability.
- 6.1, 7.1, 7.2, 7.3 — Performance/error/accessibility/final verification.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/test/admin-audit.e2e-spec.ts` | Create | HTTP acceptance flow |
| `backend/test/jest-e2e.json` | Read/Modify | E2E registration if needed |
| `frontend/app/admin/(quan-tri)/audit-log/page.tsx` | Read | Runtime route |
| `frontend/app/admin/(quan-tri)/page.tsx` | Read | Dashboard runtime path |
| `frontend/lib/admin-navigation.ts` | Read | Navigation reachability |
| `DESIGN.md` | Read | Responsive/accessibility acceptance |

## Completion Criteria

- [ ] Authenticated API list/detail and negative paths pass against real Nest routes.
- [ ] `/admin/audit-log`, nav item, and dashboard preview are reachable with seeded data; no static placeholder activity remains.
- [ ] Desktop/mobile and keyboard checks pass; backend/frontend required commands have a recorded receipt.

## Evidence

- [ ] Automated verification
  - Command(s): `pnpm --dir backend test:e2e -- --runInBand`; `pnpm --dir backend build`; `pnpm --dir frontend lint`; `pnpm --dir frontend build`
  - Expected proof: all applicable commands exit 0.
- [ ] Artifact / runtime verification
  - Inspect: API routes, `/admin`, `/admin/audit-log`, seeded audit detail, mobile viewport.
  - Expect: all outputs are imported/mounted/invoked and display real data.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `AppModule` → `AuditModule` → controller; AdminShell nav → page; dashboard → API client.
  - Expect: end-to-end path succeeds with auth and permission.
- [ ] Contract / negative-path verification
  - Check: no permission, invalid filter, missing audit id, nested secret, no data.
  - Expect: explicit 401/403/400/404/masked/empty outcomes.

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
| UI route passes build but is not mounted | High | Browser/runtime navigation from `/admin` and direct route checks |
| E2E environment unavailable | Medium | Record explicit blocker and keep ready flag false |

## Current Blocker

The release gate is not complete. The opt-in audit HTTP suite reaches the real Nest route, but the current Jest process receives `503 Auth store unavailable` from the fail-closed Redis guard. Therefore authenticated API/UI seeded-data, keyboard, responsive, and <=500ms performance receipts remain pending.
