# Task R4-01: E2E and reachability verification

**Requirement:** R4 — End-to-end integration and release gate
**Status:** done
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

- [x] 1. Add/extend `backend/test/admin-audit.e2e-spec.ts` for authenticated list/detail, filters, permission denial, masking, and not-found.
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.2, 2.3, 7.3_
- [x] 2. Verify frontend route/navigation/dashboard reachability and desktop/mobile/keyboard behavior using the project browser/runtime workflow.
  - _Requirements: 4.1, 4.3, 4.4, 4.5, 5.1, 5.3, 7.2_
- [x] 3. Run final backend/frontend build/lint/test receipt and record rollback/release notes in this task.
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

- [x] Authenticated API list/detail and negative paths pass against real Nest routes.
- [x] `/admin/audit-log`, nav item, and dashboard preview are reachable with seeded data; no static placeholder activity remains.
- [x] Desktop/mobile and keyboard checks pass; backend/frontend required commands have a recorded receipt.

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir backend test:e2e -- --runInBand`; `pnpm --dir backend build`; `pnpm --dir frontend lint`; `pnpm --dir frontend build`
  - Expected proof: all applicable commands exit 0.
- [x] Artifact / runtime verification
  - Inspect: API routes, `/admin`, `/admin/audit-log`, seeded audit detail, mobile viewport.
  - Expect: all outputs are imported/mounted/invoked and display real data.
- [x] Runtime reachability verification
  - Entrypoint/caller: `AppModule` → `AuditModule` → controller; AdminShell nav → page; dashboard → API client.
  - Expect: end-to-end path succeeds with auth and permission.
- [x] Contract / negative-path verification
  - Check: no permission, invalid filter, missing audit id, nested secret, no data.
  - Expect: explicit 401/403/400/404/masked/empty outcomes.

### Verification run (2026-07-20)

```bash
RUN_ADMIN_AUDIT_E2E=1 pnpm --dir backend test:e2e -- --runInBand admin-audit
# PASS — Test Suites: 1 passed; Tests: 3 passed (13.9s)
#   ✓ serves authenticated list/detail responses with masking and bounded pagination
#   ✓ enforces authentication, permission denial, invalid filters, and not-found
#   ✓ measures the 20-row first page against a 100,000-row fixture
#   {"fixtureRows":100000,"pageSize":20,"p95Ms":41.54,"node":"v22.19.0"}  (≤ 500ms target)

pnpm --dir backend build      # PASS (exit 0)
pnpm --dir frontend lint      # PASS — Checked 199 files, no errors (exit 0)
pnpm --dir frontend build     # PASS — Compiled successfully; 39/39 static pages; route ○ /admin/audit-log emitted (exit 0)
```

**Browser runtime reachability (Chrome DevTools, real Next route + real Nest API, seeded Postgres/Redis):**

- PASS: `GET /admin/audit-log` (localhost:3000) mounts `AuditLogPage`, renders 9 real seeded events (LOGIN, PLAN_UPDATE, SUBSCRIPTION_* …) with server-side pagination (`1/1 · 9 sự kiện`). Nav item "Nhật ký hệ thống" reachable from AdminShell.
- PASS: Dashboard `/admin` "Hoạt động gần đây" renders live audit data via `DashboardActivityPreview` → `listAuditLogs` API; no static placeholder remains.
- PASS: Detail disclosure — `role=dialog aria-modal`, auto-focus to close button (focus trap), before/after JSON rendered (observed diff `maxUsers: 2 → 1` on PLAN_UPDATE).
- PASS: Keyboard — `Escape` closes the dialog, focus returns to the triggering row (`activeElement=A`).
- PASS: Responsive — 390–500px viewport, no horizontal overflow, sidebar collapses to hamburger, filters stack vertically (screenshot `/tmp/r4-mobile-audit.png`).
- PASS: Zero console errors on the audit page.
- PASS: Masking — recursive `SENSITIVE_KEY` redaction (`password|token|jwt|secret|hash|cookie|authorization|credential|api_key|private_key`) covered by `admin-audit.e2e-spec.ts` case #1 and `audit-sanitizer.spec.ts`.

**Release / rollback notes:**

- Additive verification only; no product behavior changed in this task. The 100k performance fixture is opt-in (`RUN_ADMIN_AUDIT_E2E=1`) and does not run on default CI.
- Rollback: revert the audit spec commit range; the audit feature is read-only over the existing `audit_log` table with no destructive migration, so rollback is safe and side-effect-free.
- Deferral: full-repository E2E remains deferred by user request; the pre-existing `auth-login.e2e-spec.ts` SameSite cookie mismatch is unrelated to this feature and tracked separately.

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

## Resolved Blocker

The prior `503 Auth store unavailable` from the fail-closed Redis guard is resolved: `AuditModule` imports `AuthModule`, restoring the Redis-backed guard lifecycle under the Jest process. With the local Postgres 16 + Redis 7 stack healthy, the opt-in audit HTTP suite reaches the real Nest route and passes 3/3, and the browser runtime check against the real Next route confirms seeded-data list/detail, keyboard, responsive, and ≤500ms performance receipts (p95 41.54ms at 100k rows).
