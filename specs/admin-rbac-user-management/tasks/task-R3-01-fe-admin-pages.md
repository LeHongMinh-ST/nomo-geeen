# Task R3-01: Fe admin pages

**Requirement:** R7 — Frontend admin pages (final integration task)
**Status:** done
**Priority:** P1
**Estimated Effort:** M (1 day)
**Dependencies:** tasks/task-R1-02-role-ui.md, tasks/task-R2-02-admin-user-ui.md, tasks/task-R0-03-permission-guard.md
**Spec:** specs/admin-rbac-user-management/

## Context

- **Why**: After individual admin pages exist (R1-02, R2-02), need final integration: nav gating, permissions page, route guards, store extension. This is the final integration task that proves prior tasks' outputs are reachable end-to-end.
- **Current state**: Pages created in prior tasks; admin shell + nav hard-coded.
- **Target outcome**: Admin nav filters by user permissions; `/admin/quyen-han` read-only permission catalog; `useHasPermission` hook + `<Can>` wrapper; redirect on missing permission.

## Constraints

- **MUST**: Filter `adminNavGroups` based on `useAdminAuth().admin.permissions` (R7.8).
- **MUST**: Persist `permissions` in `admin-auth-store.ts` (extend AdminIdentity).
- **MUST**: Bootstrap from `/auth/me` populates `permissions` field.
- **MUST**: WCAG 2.1 AA.
- **SCOPE**: Final integration task — reaches every prior UI/API task via runtime navigation.

## Steps

- [ ] 1. Extend `AdminIdentity` in `admin-auth-store.ts`
  - Add `permissions: string[]` field. Update `hydrate`, `partialize`, sessionStorage shape.
  - _Requirements: 7.8_

- [ ] 2. Create `hooks/use-has-permission.ts`
  - Hook: `useHasPermission(code: string): boolean`. Reads from store.
  - _Requirements: 7.8, 7.9_

- [ ] 3. Create `<Can permission="...">` component
  - Renders children only if user has permission; else fallback (or nothing).
  - _Requirements: 7.8_

- [ ] 4. Filter `adminNavGroups` in admin shell
  - In `frontend/components/admin/admin-shell.tsx` import `useHasPermission`; filter each nav item by `permission` field (extend AdminNavItem type).
  - Update `frontend/lib/admin-navigation.ts` to include `permission: string` on RBAC items.
  - _Requirements: 7.8_

- [ ] 5. Create `/admin/quyen-han/page.tsx`
  - Read-only catalog grouped by resource. Permission chip per row.
  - _Requirements: 7.7_

- [ ] 6. Add `<NoPermission>` fallback + redirect to fixed `/admin/khong-co-quyen` (F-13)
  - Create fixed route `frontend/app/admin/khong-co-quyen/page.tsx` — always renders + shows toast `Bạn không có quyền truy cập trang này.`, regardless of route gating.
  - When user lacks route permission, redirect to `/admin/khong-co-quyen` (NOT `/admin` — the toast never fires if nav is fully hidden).
  - Update `frontend/lib/admin-guard.ts` (or create) to perform the redirect.
  - _Requirements: 7.9_

- [ ] 7. Bootstrap permissions in admin layout
  - On `/auth/me` response, populate `permissions` from JWT claim via `frontend/lib/auth-api.ts` `adminMe` (new helper if missing).
  - _Requirements: 5.1, 7.8_

- [ ] 8. Integration E2E test
  - Use Playwright (existing pattern, check `frontend/tests/` or `e2e/`).
  - Login as seeded SUPER_ADMIN; verify all 3 new pages reachable.
  - Login as SUPPORT (no `role:create`); verify `/admin/vai-tro` "Tạo vai trò" button hidden.
  - Run `pnpm --filter frontend e2e`.
  - _Requirements: 7.8, 7.9_

## Requirements

- 7.7 — Permission catalog page
- 7.8 — Nav + route permission gating
- 7.9 — Redirect + toast on missing permission
- 5.1 — login response includes permissions
- NFR-6 — WCAG 2.1 AA

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/stores/admin-auth-store.ts` | Modify | Add `permissions` to AdminIdentity |
| `frontend/hooks/use-has-permission.ts` | Create | Hook |
| `frontend/components/admin/can-permission.tsx` | Create | Wrapper component |
| `frontend/lib/admin-navigation.ts` | Modify | Add `permission` field |
| `frontend/components/admin/admin-shell.tsx` | Modify | Filter nav |
| `frontend/lib/auth-api.ts` | Modify | Add `adminMe` helper (if missing) |
| `frontend/lib/admin-guard.ts` | Modify (or create) | Add permission check |
| `frontend/app/admin/quyen-han/page.tsx` | Create | Permission catalog |
| `frontend/tests/rbac.spec.ts` | Create | E2E test |

## Completion Criteria

- [ ] Nav filters items based on permissions
- [ ] `/admin/quyen-han` shows all admin permissions grouped
- [ ] Non-SUPER_ADMIN nav has fewer items
- [ ] Direct URL access to disallowed route → redirect + toast

## Evidence

- [ ] Automated verification
  - Command: `pnpm --filter frontend test && pnpm --filter frontend e2e`
  - Expected: all pass
- [ ] Artifact / runtime verification
  - Inspect: dev server; login as SUPER_ADMIN; nav shows "Quản lý người dùng" + "Vai trò" + "Quyền hạn"; login as SUPPORT; "Vai trò" hidden
  - Expect: filtered nav per permissions
- [ ] Runtime reachability verification
  - Entrypoint: dev server `/admin/quyen-han` loads; data fetched
  - Expect: permission chips visible
- [ ] Contract / negative-path verification
  - Check: SUPPORT visits `/admin/vai-tro` directly → redirect + toast
  - Expect: URL becomes `/admin`; toast "Bạn không có quyền truy cập trang này."

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Permission drift between JWT and nav | Low | Single source: `useAdminAuth().admin.permissions` from `/auth/me` |
| Race condition during bootstrap | Low | Layout waits for store hydration before rendering nav |
| TOCTOU on permission revocation | Low | Max 15-min JWT lifetime; user logs out if permissions change |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
