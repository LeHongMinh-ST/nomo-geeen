# Task R1-02: Role ui

**Requirement:** R7.5, R7.6, R7.8 — Role management UI
**Status:** done
**Priority:** P1
**Estimated Effort:** M (1 day)
**Dependencies:** tasks/task-R1-01-role-api.md
**Spec:** specs/admin-rbac-user-management/

## Context

- **Why**: SUPER_ADMIN needs UI to manage roles. Backend API done in task-R1-01; needs Next.js pages + components following existing admin shell pattern.
- **Current state**: `frontend/components/admin/admin-shell.tsx` renders nav. `frontend/lib/admin-navigation.ts` has hard-coded items.
- **Target outcome**: `/admin/vai-tro` page renders role table; per-row "Sửa" opens role editor modal. Permission catalog fetched via `frontend/lib/admin-api/permissions.ts`.

## Constraints

- **MUST**: Use existing UI components (lucide-react icons, Tailwind tokens per DESIGN.md).
- **MUST**: All strings in Tiếng Việt.
- **MUST**: WCAG 2.1 AA: keyboard nav, focus trap in modals, semantic `<th>`.
- **MUST**: Optimistic UI on delete (with rollback on failure).
- **SCOPE**: Page + role editor modal only. Sidebar nav update is task-R3-01.

## Steps

- [ ] 1. Create `lib/admin-api/roles.ts`
  - Functions: `listRoles`, `createRole`, `updateRole`, `deleteRole`. All `fetch` against `/admin/roles*` with auth header.
  - _Requirements: 2.1, 2.2, 2.3, 2.6_

- [ ] 2. Create `lib/admin-api/permissions.ts`
  - Functions: `listPermissions`. Returns `PermissionPublicShape[]`.
  - _Requirements: 1.2_

- [ ] 3. Create `/admin/vai-tro/page.tsx`
  - Server component fetches roles + permissions; passes to client `<RoleTable>`.
  - Permission check via `useHasPermission('admin.role:view')`; if false → render `<NoPermission />` fallback (or redirect to `/admin/khong-co-quyen` per R7.9).
  - _Requirements: 7.5, 7.8_

- [ ] 4. Create `<RoleTable>` (client)
  - Columns: code, name, permission count, isSystem chip, actions (Sửa/Xóa).
  - Row click expands to show permission codes list.
  - "Tạo vai trò" button opens modal.
  - _Requirements: 7.5_

- [ ] 5. Create `<RoleEditorModal>` (client)
  - Form: code (disabled if editing system), name, multi-select permission picker grouped by resource.
  - Submit calls createRole or updateRole.
  - _Requirements: 7.6_

- [ ] 6. Component tests
  - `<RoleTable>`: renders mock data; calls delete handler; shows error on API failure.
  - Run `pnpm --filter frontend test`.
  - _Requirements: 7.5, 7.6_

## Requirements

- 7.5 — `/admin/vai-tro` role table + create modal
- 7.6 — Role edit modal with permission picker
- 7.8 — Permission check on route

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/admin-api/roles.ts` | Create | API client |
| `frontend/lib/admin-api/permissions.ts` | Create | API client |
| `frontend/app/admin/vai-tro/page.tsx` | Create | Page |
| `frontend/components/admin/role-table.tsx` | Create | Table component |
| `frontend/components/admin/role-editor-modal.tsx` | Create | Editor modal |

## Completion Criteria

- [ ] `/admin/vai-tro` renders role list
- [ ] Click "Tạo vai trò" → modal opens; submit creates role
- [ ] Click "Sửa" → modal opens; submit updates role
- [ ] Permission picker grouped by resource
- [ ] System role has `code` field disabled in edit

## Evidence

- [ ] Automated verification
  - Command: `pnpm --filter frontend test`
  - Expected: component tests pass
- [ ] Artifact / runtime verification
  - Inspect: dev server `/admin/vai-tro` loads; renders rows from API
  - Expect: 3 system roles visible (SUPER_ADMIN, SUPPORT, BILLING)
- [ ] Runtime reachability verification
  - Entrypoint: Next.js router; `frontend/app/admin/vai-tro/page.tsx` is a route
  - Expect: page loads at URL `/admin/vai-tro`
- [ ] Contract / negative-path verification
  - Check: submit role with duplicate code → modal shows error toast
  - Expect: 409 from API; user sees error

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Modal focus trap broken | Medium | Use Radix Dialog (existing pattern) or shadcn/ui Dialog |
| Form state lost on submit error | Low | Keep form data; only show error toast |
| Long permission list overwhelms UI | Low | Group by resource + collapsible sections |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
