# Task R2-01: Purchase UI integration

**Requirement:** R2 — real purchase workflow UI
**Status:** done
**Priority:** P1
**Estimated Effort:** 8–12 hours
**Dependencies:** tasks/task-R0-01-purchase-contract-foundation.md, tasks/task-R1-01-purchase-domain-api.md, tasks/task-R1-02-supplier-management.md
**Spec:** specs/tenant-purchase-management/

## Context

- **Why**: /nhap-hang uses seed purchases and local TODO handlers.
- **Current state**: Purchase components and lib/purchases.ts are seed/local-only; routes exist.
- **Target outcome**: List/create/detail/draft/complete/cancel/conversion/supplier flows use authenticated APIs.

## Constraints

- **MUST**: Tenant identity and authoritative quantities, money, stock, and balances are server-derived; preserve approved scope.
- **SHOULD**: Reuse existing NestJS/Prisma, Next.js, userFetch, sales/products, and DESIGN.md patterns.
- **MUST NOT**: Add unapproved returns, advanced workflow, multi-warehouse, or unrelated refactors.
- **SCOPE**: Implement only this task and its mapped requirements.

## Steps
- [x] 1. Add typed purchase/supplier clients and replace seed list/picker/detail loaders with bounded pages and honest 401/403/404/5xx states.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 1.1, 2.3, 7.1, 7.4, 9.1, 11.1_
- [x] 2. Wire draft/completion submit with conversion/payment preview; exclude authoritative qtyBase/stock/balance; disable pending, preserve input, and use one retry identity.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 2.1, 3.5, 5.1, 5.4, 7.2, 7.3_
- [x] 3. Wire detail lifecycle actions with terminal-state disabling, accessible feedback, cancel confirmation, and refetch after success.
  - Human intent: The user/business outcome is explicit and observable.
  - Code detail: Implement exact paths/contracts, tenant filters, validation, and tests described in design.md.
  - _Requirements: 2.4, 4.2, 7.3, 7.4_


## Requirements

- 1.1, 2.1, 2.3, 2.4, 3.5, 5.1, 5.4, 7.1, 7.2, 7.3, 7.4, 9.1, 11.1

## Related Files

| Path | Action | Description |
|---|---|---|
frontend/lib/tenant-purchases-api.ts | Create | Authenticated client,frontend/lib/tenant-suppliers-api.ts | Create/Read | Supplier client,frontend/components/app/purchase/purchase-list.tsx | Modify | API list states,frontend/components/app/purchase/purchase-form.tsx | Modify | Submit flow,frontend/components/app/purchase/purchase-detail.tsx | Modify | Actions,frontend/components/app/purchase/supplier-picker.tsx | Modify | API suppliers,frontend/app/(app)/nhap-hang/** | Read/Modify if needed | Reachability

## Completion Criteria

- [x] All /nhap-hang screens read server data with no seed runtime initialization.
- [x] Draft/complete/cancel/detail/conversion/loading/error/retry are wired.
- [x] Input persists on failure and duplicate submit is blocked.

## Evidence

- [x] Automated verification
  - Command(s): targeted frontend Vitest; pnpm --dir frontend lint; pnpm --dir frontend build
  - Expected proof: API/form tests and build pass.
- [x] Artifact / runtime verification
  - Inspect: /nhap-hang, /nhap-hang/tao, /nhap-hang/[id]
  - Expect: Empty API gives empty state, not seed rows.
- [x] Runtime reachability verification
  - Entrypoint/caller: The three nhap-hang route files
  - Expect: API-backed components/client are mounted and called.
- [x] Contract / negative-path verification
  - Check: 403, invalid conversion, network error, repeated click
  - Expect: Visible error, preserved input, no false success.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
Seed fallback | High | Remove imports/test empty/error
Wrong qty payload | High | Exclude qtyBase/inspect request
Duplicate click | Medium | Pending guard/API replay

## Verification receipt — 2026-07-21

- Frontend Vitest: PASS — 6 files, 11 tests via pnpm --dir frontend test -- tenant-purchases-api.test.ts.
- Frontend lint: PASS — 218 files.
- Frontend build: PASS — /nhap-hang, /nhap-hang/tao and /nhap-hang/[id] compiled with TypeScript.
- Backend regression: PASS — 5 suites, 15 tests for products/purchases/suppliers.
- Diff check: PASS — git diff --check.
- Runtime proof: purchase list/detail/form and supplier picker no longer initialize seed data; API clients handle loading/error/retry and userFetch auth refresh.
- Submit proof: draft/complete sends only server-authoritative inputs, stable idempotency key, pending guard, and preserves form state on failure.
- Docs impact: none; implementation notes and approved spec document the API-backed route behavior.
