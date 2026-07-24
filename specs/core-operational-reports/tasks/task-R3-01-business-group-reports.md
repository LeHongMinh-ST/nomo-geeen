# Task R3-01: Business group reports

**Requirement:** R7, R8 — Business group filter & breakdown  
**Status:** done  
**Priority:** P1  
**Estimated Effort:** 0.5 day  
**Dependencies:** tasks/task-R1-01-core-report-endpoints.md, tasks/task-R2-01-reports-ui-shell.md  
**Spec:** specs/core-operational-reports/

## Context

- **Why**: Báo cáo tồn/bán cần lọc + phân rã theo 5 nhóm kinh doanh Phase 1 đã có trong catalog; UI shell chỉ hiện raw group code, chưa filter/breakdown.
- **Current state**: `GET /tenant/reports/stock-summary` + `sales-summary` + `/bao-cao` shell; product có `businessGroup` enum; `BUSINESS_GROUP_CATALOG` trong `product-contract.ts`.
- **Target outcome**: Query `businessGroup` optional trên 2 endpoint; response có `filter` + `byBusinessGroup`; UI select 5 nhóm + breakdown list; loading/error/empty giữ nguyên.

## Constraints

- **MUST**: Chỉ dùng enum `BusinessGroup` Phase 1 (`CROP_INPUTS`, `CROP_SEEDLINGS`, `ANIMAL_FEED`, `VETERINARY_DRUGS`, `LIVESTOCK`); tenant-scoped; DTO `@IsEnum`.
- **SHOULD**: Label từ `BUSINESS_GROUP_CATALOG` / `REPORT_BUSINESS_GROUPS`.
- **MUST NOT**: Invent group mới; aquaculture; chart/export/profit; đụng livestock state, returns, sales-error mapper, UI không thuộc reports.
- **SCOPE**: R7 backend filter/breakdown + R8 FE filter/UI; reports-only files.

## Steps

- [x] 1. DTO + service filter/breakdown stock & sales
  - Business: lọc theo nhóm kinh doanh ổn định, breakdown cho vận hành
  - Code: `report-stock-query.dto.ts`, `report-date-query.dto.ts`, `reports.service.ts`
  - _Requirements: R7_

- [x] 2. Controller query wiring + unit tests
  - Business: API contract ổn định, guard giữ nguyên
  - Code: `reports.controller.ts`, `*.spec.ts`
  - _Requirements: R7_

- [x] 3. FE client + ReportsPage filter + breakdown
  - Business: user chọn nhóm → reload stock/sales; thấy phân rã
  - Code: `tenant-reports-api.ts`, `reports-page.tsx`, tests
  - _Requirements: R8_

- [x] 4. Verification focused tests + lint/build
  - Backend reports specs; FE vitest reports; biome/typecheck scoped
  - _Requirements: R7, R8_

## Requirements

- R7 — Optional `businessGroup` query; `filter` + `byBusinessGroup` on stock/sales
- R8 — UI filter (Tất cả + 5 groups) reloads both summaries; show breakdown

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/reports/dto/report-stock-query.dto.ts` | Create | Stock query `businessGroup` |
| `backend/src/platform/reports/dto/report-date-query.dto.ts` | Modify | Add `businessGroup` |
| `backend/src/platform/reports/reports.service.ts` | Modify | Filter + breakdown |
| `backend/src/platform/reports/reports.controller.ts` | Modify | Pass query DTOs |
| `backend/src/platform/reports/*.spec.ts` | Modify | Cover filter/breakdown |
| `frontend/lib/tenant-reports-api.ts` | Modify | Query param + types |
| `frontend/components/app/reports/reports-page.tsx` | Modify | Filter UI + breakdown |
| `frontend/lib/tenant-reports-api.test.ts` | Modify | Query param tests |
| `frontend/components/app/reports/reports-page.test.tsx` | Modify | Filter reload + contract |
| `specs/core-operational-reports/requirements.md` | Modify | R7/R8 |
| `specs/core-operational-reports/design.md` | Modify | Contract design |

## Completion Criteria

- [x] Optional `businessGroup` on stock-summary and sales-summary; only catalog enum values
- [x] Response includes `filter` + `byBusinessGroup` with catalog labels
- [x] UI select reloads both APIs with group param; loading/error/empty preserved
- [x] Focused backend + frontend tests pass; no unrelated file ownership

## Evidence

- [x] Automated verification (unit/component/integration/E2E as applicable)
  - Command(s):
```bash
cd backend && npx jest src/platform/reports --runInBand
# PASS 8/8
cd frontend && pnpm exec vitest run lib/tenant-reports-api.test.ts components/app/reports/reports-page.test.tsx
# PASS 14/14
cd backend && npx biome check --write src/platform/reports
# Lint: No issues found
cd frontend && pnpm exec biome check --write lib/tenant-reports-api.ts components/app/reports/**
# Lint: No issues found
cd backend && pnpm run build  # nest build OK
cd frontend && pnpm run build  # includes ○ /bao-cao
```
  - Expected proof: focused tests PASS exit 0; builds OK
  - Run at: 2026-07-25T00:48:51+07:00
- [x] Artifact / runtime verification
  - Inspect: `filter` + `byBusinessGroup` in service tests; UI testids `reports-business-group`, `stock-by-group`, `sales-by-group`
  - Expect: PASS — labels from BUSINESS_GROUP_CATALOG / REPORT_BUSINESS_GROUPS
- [x] Runtime reachability verification
  - Entrypoint/caller: `ReportsController` query DTOs → `ReportsService`; `ReportsPage` via `app/(app)/bao-cao/page.tsx`
  - Expect: build lists `/bao-cao`; controller/service specs assert query forward
- [x] Contract / negative-path verification
  - Check: inverted/oversized range still BadRequest; empty stock empty UI; invalid range blocks sales call
  - Expect: PASS in service + page tests


## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Sales order totals include multi-group orders when filtered by line | Medium | Documented: aggregate uses `lines.some`; line breakdown is group-accurate |
| FE/BE label drift | Low | Mirror `BUSINESS_GROUP_CATALOG` ids/labels in `REPORT_BUSINESS_GROUPS` |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
