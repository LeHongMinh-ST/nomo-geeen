# Task R0-01: Wire tenant summary tiles

**Requirement:** R1, R2, R3
**Status:** done
**Priority:** P2
**Estimated Effort:** 0.5 day
**Dependencies:** none (consumes existing `specs/core-stock-lifecycle/` API)
**Spec:** specs/inventory-expiry-tenant-summary-ui/

## Context

- **Why**: `frontend/components/app/inventory/inventory-list.tsx` derived the
  "Còn dưới 30 ngày" and "Đã hết hạn" tiles from `items`, the current page's
  20-row array, undercounting once stock spans more than one page.
- **Current state**: `getTenantInventoryExpirySummary()`
  (`frontend/lib/tenant-inventory-api.ts:87`) and the backend
  `GET /tenant/inventory/expiry-summary` already existed and returned
  tenant-wide `items.byTier` counts (commits `ecb38a3`, `a25ec33`), but no UI
  consumed them.
- **Target outcome**: The two tiles read `summary.items.byTier.CRITICAL` /
  `EXPIRED` from an independently-fetched tenant-wide summary, with its own
  loading/error/retry states that never block the paginated list.

## Constraints

- **MUST**: Keep the summary fetch's loading/error state independent from the
  paginated `listTenantInventory` fetch's loading/error state.
- **SHOULD**: Reuse existing patterns in the repo (`Skeleton`, the
  `xTick`-increment retry pattern from `reports-page.tsx`, the existing
  destructive color pair `#ffebee`/`#c62828`).
- **MUST NOT**: Change the backend `expiry-summary` endpoint/response shape,
  the "Sắp hết"/"Hết hàng" stock tiles, or `listTenantInventory`
  pagination/filtering.
- **SCOPE**: Implement only the behavior mapped to R1-R3 and the approved
  `scope_lock`; do not add out-of-scope features or leave scoped acceptance
  criteria unwired.

## Steps

- [x] 1. Add `summary`/`summaryLoading`/`summaryError`/`summaryTick` state and
  an independent `useEffect` in `InventoryList` calling
  `getTenantInventoryExpirySummary()`.
  - Lets the tiles reflect every batch/item in the tenant, not just the
    current page.
  - Effect keyed on `summaryTick` only (guarded with `active` flag like the
    existing page fetch); incrementing `summaryTick` re-fires the request for
    retry.
  - _Requirements: 1.1_

- [x] 2. Derive `criticalCount`/`expiredCount` from
  `summary?.items.byTier.CRITICAL ?? 0` / `EXPIRED ?? 0` instead of
  `items.filter(...)`; keep tile `onClick` setting the page-local `expiry`
  filter unchanged.
  - Business intent: tile counts must match the tenant-wide warning totals
    users act on, while clicking still filters the page they are looking at.
  - _Requirements: 1.2, 1.3_

- [x] 3. Render loading (`Skeleton` x2), error (single `col-span-2` inline
  alert + "Thử lại" button), and success (existing two `AlertTile`s) states
  for the critical/expired tile slot, mutually exclusive.
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Verification implementation
  - Component tests: tenant-wide count divergence from page-local rows,
    loading placeholder, error + retry recovery.
  - _Requirements: 3.1, 3.2_

## Requirements

- 1.1 — Independent summary fetch on mount
- 1.2 — Tiles read `summary.items.byTier`, not the page array
- 1.3 — Tile click still sets the page-local expiry filter
- 2.1 — Loading placeholder, non-blocking
- 2.2 — Error alert with retry
- 2.3 — Summary failure isolated from the list fetch
- 3.1 — Component test coverage
- 3.2 — `pnpm --dir frontend test` passes

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/components/app/inventory/inventory-list.tsx` | Modify | Wire summary fetch, tile counts, loading/error/retry UI. |
| `frontend/components/app/inventory/inventory-list.test.tsx` | Modify | Cover tenant-wide counts, loading, error/retry. |
| `frontend/lib/tenant-inventory-api.ts` | Read | Existing `getTenantInventoryExpirySummary` client (no change). |

## Completion Criteria

- [x] Critical/expired tiles render `summary.items.byTier.*`, not a filter over
  the current page's `items` array.
- [x] Summary loading/error states render and do not block the page-local list
  fetch or its own states (two independent `useEffect`s, independent state).
- [x] Retry action re-issues the summary request and recovers the tiles on
  success.
- [x] New/changed tests pass; lint is clean for the two touched files; tiles
  remain reachable from the same `InventoryList` mount as before (no new
  route/entrypoint needed).

## Evidence

Stateful UI/component task: component tests cover loading/error/success and
tenant-wide-vs-page-local divergence.

- [x] Automated verification (component)
  - Command(s):
    ```bash
    pnpm --dir frontend exec vitest run inventory-list
    pnpm --dir frontend test
    pnpm --dir frontend exec biome lint components/app/inventory/inventory-list.tsx components/app/inventory/inventory-list.test.tsx
    ```
  - Expected proof: all three exit 0; the full suite's test count reflects the
    3 new/changed cases without loss of the 5 pre-existing ones.
  - Result (this session, 2026-07-27):
    ```text
    pnpm --dir frontend exec vitest run inventory-list
    Test Files  1 passed (1)
         Tests  7 passed (7)

    pnpm --dir frontend test
    Test Files  34 passed (34)
         Tests  214 passed (214)

    pnpm --dir frontend exec biome lint <2 files>
    Checked 2 files in 7ms. No fixes applied.
    ```
- [x] Artifact / runtime verification
  - Inspect: `frontend/components/app/inventory/inventory-list.tsx` tile grid
    (critical/expired slot) and the `summary`/`summaryLoading`/`summaryError`
    state wiring.
  - Expect: the slot renders exactly one of skeleton-pair / inline-error / two
    `AlertTile`s, and `criticalCount`/`expiredCount` read from
    `summary?.items.byTier`. Confirmed by reading the final file.
- [x] Runtime reachability verification
  - Entrypoint/caller: `InventoryList` is the existing mounted component for
    `/ton-kho` (unchanged entrypoint — this task only changes its internals).
  - Expect: no new route/component was added that needs separate mounting;
    the summary fetch fires on the same mount as the existing list fetch.
- [x] Contract / negative-path verification
  - Check: summary request rejects (network/API error).
  - Expect: both tiles replaced by a single Vietnamese inline alert with a
    working "Thử lại" button; the paginated list and its own error state are
    unaffected. Covered by the "shows a retry action ... when the summary
    request fails" test.

### Fresh verification update (2026-07-27)

- `pnpm --dir frontend build` passed fresh; Next route output completed successfully.
- Biome lint passed.
- Backend unit verification passed fresh: 60 suites, 607 passed, 1 skipped.
- Backend E2E was run fresh with correct secrets and isolated database `nomogreen_e2e`: 17 failed, 4 passed, 1 skipped. This is an environment limitation: the isolated database has 54 public tables and the supplier table, but no `_prisma_migrations` table and no `SupplierType` enum; shared `nomogreen` also has migration/schema drift. No migration or schema was changed. E2E is not a merge gate for this frontend-only task and remains an environment follow-up.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Backend E2E environment drift | Medium | Keep the isolated/shared database mismatch as a follow-up; it is outside this frontend-only task and no schema/migration changes were made. |
| Summary/list fetches racing on unmount | Low | Both effects use the existing `active` flag guard pattern already used in this file. |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
