# Task R2-01: Reports UI shell

**Requirement:** R4, R5, R6  
**Status:** done  
**Priority:** P1  
**Estimated Effort:** 0.5 day  
**Dependencies:** tasks/task-R1-01-core-report-endpoints.md  
**Spec:** specs/core-operational-reports/

## Context

- **Why**: Nav `/bao-cao` và link dashboard trỏ route chưa có page; vận hành cần đọc stock/sales summary đã có trên API.
- **Current state**: Backend `GET /tenant/reports/stock-summary` + `sales-summary` done; FE chỉ có href placeholder.
- **Target outcome**: Authenticated `/bao-cao` load hai endpoint thật, có loading/error/empty, date validation, ghi chú chưa chart/export.

## Constraints

- **MUST**: Dùng `userFetch` tenant-safe; không mock số liệu business; date range mirror server (`from < to`, ≤ 366 ngày).
- **SHOULD**: Bám layout list/card app hiện có (DESIGN.md, ListSkeleton).
- **MUST NOT**: Sửa backend reports; error mapper Luồng A; returns; livestock; chart/export/dashboard giả.
- **SCOPE**: Implement R4–R6 UI shell only.

## Steps

- [x] 1. Mở rộng requirements/design/scope UI shell trong spec
  - Business: khóa phạm vi Luồng D trước khi code
  - Code: `requirements.md`, `design.md`, `spec.json` scope_lock
  - _Requirements: R4, R5, R6_

- [x] 2. Typed client `tenant-reports-api` + range helper + unit test
  - Business: path/query ổn định, validation trước call sales
  - Code: `frontend/lib/tenant-reports-api.ts`, `*.test.ts`
  - _Requirements: R4, R5_

- [x] 3. Page route + `ReportsPage` shell (stock + sales sections, states)
  - Business: người dùng đọc KPI/top products + tồn kho từ API
  - Code: `frontend/app/(app)/bao-cao/page.tsx`, `frontend/components/app/reports/reports-page.tsx`
  - _Requirements: R4, R5, R6_

- [x] 4. Focused component tests + verify commands
  - Business: proof loading/error/empty/date invalid không hardcode data
  - Code: `reports-page.test.tsx`; vitest + build + diff check
  - _Requirements: R4, R5, R6_

## Requirements

- R4 — `/bao-cao` authenticated; live stock + sales endpoints only
- R5 — loading / error+retry / empty; client date validation
- R6 — explicit out-of-scope note (chart/export/accounting); still show API data

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/tenant-reports-api.ts` | Create | Typed stock/sales client + range helper |
| `frontend/lib/tenant-reports-api.test.ts` | Create | Client/path/range tests |
| `frontend/app/(app)/bao-cao/page.tsx` | Create | Route entry |
| `frontend/components/app/reports/reports-page.tsx` | Create | UI shell |
| `frontend/components/app/reports/reports-page.test.tsx` | Create | UI state tests |
| `specs/core-operational-reports/*` | Modify | Scope + task evidence |

## Completion Criteria

- [x] `/bao-cao` reachable under `(app)` shell; nav href unchanged
- [x] UI calls only live report endpoints (no mock KPIs)
- [x] Loading, error+retry, empty; invalid range blocked client-side
- [x] Out-of-scope chart/export stated in UI
- [x] Focused tests + frontend build + `git diff --check` pass

## Evidence

- [x] Automated verification
  - Command(s):
    ```bash
    pnpm --dir frontend test -- lib/tenant-reports-api.test.ts components/app/reports/reports-page.test.tsx
    pnpm --dir frontend build
    git diff --check
    ```
  - Expected proof: tests PASS; build PASS; diff check clean
- [x] Artifact / runtime verification
  - Inspect: `frontend/app/(app)/bao-cao/page.tsx` imports `ReportsPage`
  - Expect: page mounts client shell; no hardcoded totals
- [x] Runtime reachability verification
  - Entrypoint/caller: `navigation.ts` `/bao-cao`, home link `/bao-cao`, `(app)/layout.tsx`
  - Expect: route file exists under app router
- [x] Contract / negative-path verification
  - Check: invalid `from >= to` or range > 366 days
  - Expect: client error, no sales API call; API error surfaces message

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| 403 permission/entitlement on sales or stock | Medium | Per-section error + retry; partial load allowed |
| Large stock list | Low | Render API items as compact list; no extra client aggregation |

---

> Evidence rule: No `## Evidence` section = invalid task file.

## Verification Receipt

- Focused vitest (`lib/tenant-reports-api.test.ts`, `components/app/reports/reports-page.test.tsx`): **PASS** — 2 files, 9 tests.
- `pnpm --dir frontend build`: **PASS** (TypeScript finished).
- `git diff --check`: **PASS**.
- Runtime reachability: `frontend/app/(app)/bao-cao/page.tsx` mounts `ReportsPage`; nav `href: "/bao-cao"` unchanged.
- Note: working tree also contains unrelated dirty files (livestock, sales-api-error, purchase) outside Luồng D ownership — not modified for this task after discovery.
