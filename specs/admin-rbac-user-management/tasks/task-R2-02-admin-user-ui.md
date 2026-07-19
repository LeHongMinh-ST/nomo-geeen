# Task R2-02: Admin user ui

**Requirement:** R7.1, R7.2, R7.3, R7.4 — Admin user management UI
**Status:** pending
**Priority:** P1
**Estimated Effort:** M (1 day)
**Dependencies:** tasks/task-R2-01-admin-user-api.md, tasks/task-R1-02-role-ui.md
**Spec:** specs/admin-rbac-user-management/

## Context

- **Why**: SUPER_ADMIN needs UI to manage admin users. Backend done in task-R2-01; needs Next.js pages following existing admin patterns.
- **Current state**: No admin user management page exists. Admin shell + sidebar nav exist.
- **Target outcome**: `/admin/nguoi-dung-quan-tri` page with table of admins, "Tạo admin" button, row actions (Sửa/Vô hiệu/Kích hoạt/Đặt lại MK/Gán vai trò). All modals keyboard-accessible.

## Constraints

- **MUST**: All strings in Tiếng Việt.
- **MUST**: WCAG 2.1 AA.
- **MUST**: Confirm dialogs for destructive actions (deactivate, reset-password).
- **MUST**: Re-fetch after mutation (no stale cache).
- **SCOPE**: Page + table + modals only. Sidebar nav entry added in task-R3-01.

## Steps

- [ ] 1. Create `lib/admin-api/admin-users.ts`
  - Functions: `listAdmins`, `getAdmin`, `createAdmin`, `updateAdmin`, `deactivateAdmin`, `reactivateAdmin`, `resetPassword`.
  - _Requirements: 3.1–3.7_

- [ ] 2. Create `/admin/nguoi-dung-quan-tri/page.tsx`
  - Server fetch + client table; permission guard via `useHasPermission('admin.user:view')`.
  - _Requirements: 7.1, 7.8_

- [ ] 3. Create `<AdminUserTable>` (client) (F-17 — hide actions on self row)
  - Columns: email, fullName, status badge, roles chips, lastLoginAt, actions menu.
  - Filter self row from action menu: when `admin.id === currentUser.id`, the action buttons (Sửa / Vô hiệu hoá–Kích hoạt / Đặt lại mật khẩu / Gán vai trò) SHALL NOT render. This avoids the user clicking → 400 toast round-trip.
  - Pagination footer.
  - _Requirements: 7.1, 7.17 (self-block UX)_

- [ ] 4. Create `<AdminUserFormModal>` (client)
  - Used for both create + edit (fullName + roleIds + password on create only).
  - Submit calls appropriate API.
  - _Requirements: 7.2, 7.3_

- [ ] 5. Create `<ResetPasswordDialog>`
  - Confirm + password input.
  - _Requirements: 7.4_

- [ ] 6. Component tests
  - Render with mock data; submit flows; error toast handling.
  - Run `pnpm --filter frontend test`.
  - _Requirements: 7.1–7.4_

## Requirements

- 7.1 — Admin list table
- 7.2 — Create admin modal
- 7.3 — Edit admin modal
- 7.4 — Reset-password confirm
- 7.8 — Permission check on route

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/admin-api/admin-users.ts` | Create | API client |
| `frontend/app/admin/nguoi-dung-quan-tri/page.tsx` | Create | Page |
| `frontend/components/admin/admin-user-table.tsx` | Create | Table |
| `frontend/components/admin/admin-user-form-modal.tsx` | Create | Form modal |
| `frontend/components/admin/reset-password-dialog.tsx` | Create | Confirm dialog |

## Completion Criteria

- [ ] Page lists admins with status/roles
- [ ] "Tạo admin" opens modal; submit creates
- [ ] "Sửa" opens modal; submit updates
- [ ] Deactivate/reactivate button toggles status
- [ ] Reset-password dialog confirms before API call

## Evidence

- [ ] Automated verification
  - Command: `pnpm --filter frontend test`
  - Expected: component tests pass
- [ ] Artifact / runtime verification
  - Inspect: dev server `/admin/nguoi-dung-quan-tri` loads; shows seeded admins
  - Expect: 3 seeded system actors + any from POST tests
- [ ] Runtime reachability verification
  - Entrypoint: Next.js router
  - Expect: route loads at `/admin/nguoi-dung-quan-tri`
- [ ] Contract / negative-path verification
  - Check: deactivate self → modal hides button OR shows 400 toast
  - Expect: no API call; user sees friendly message

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Long admin list overwhelms UI | Low | Pagination per R3.2 |
| Reset-password accidental | Low | Two-step: confirm dialog + password input |
| Form state on error | Low | Keep form data; toast error |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
