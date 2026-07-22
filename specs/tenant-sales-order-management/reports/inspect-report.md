# Targeted Inspect Report — Tenant Sales Order Management

**Date:** 2026-07-22  
**Mode:** Read-only backend/data and frontend/runtime scouts

## Backend and Data Findings

- `Sale`/`SaleLine` already represent order drafts and completed sales; no new aggregate is needed.
- Quick sale owns the proven stock/debt write path; purchases own the proven draft/completion/retry pattern.
- New order endpoints belong under `SalesController` and `SalesService`.
- `Sale` lacks the existing UI's note field, the list lacks a status-ordered composite index, and `StockReason` lacks a cancellation reason.
- Cross-channel reuse of tenant-wide `Sale.idempotencyKey` must return conflict; quick-sale replay needs an explicit `QUICK_SALE` guard.
- `advanced_mode` is the existing entitlement closest to documented order drafts. `RequireFeature` supports only one feature value, so stock/debt feature checks must occur inside the transaction.
- Completed cancellation is safe only as an atomic compensation and must reject a debt reversal that would make aggregate customer balance negative.

## Frontend and Runtime Findings

- `/don-ban-hang`, `/don-ban-hang/tao`, and `/don-ban-hang/:id` are reachable but consume seeded orders and local transitions.
- `ProductPicker` is real; `CustomerPicker` is still mock-backed and shared with quick sale.
- `OrderForm` omits `unitId` and settlement input; `PaymentSheet` is reusable for paid completion and parent-level debt handling.
- The list already has the required responsive structure, but search/filter/pagination/mobile accumulation are local-only.
- The detail route performs a synchronous mock lookup and must become an authenticated async state boundary.
- Existing Vitest, backend Jest, E2E, lint, and build commands are sufficient; no new test dependency is required.

## Exact Verification Commands

```bash
pnpm --dir backend test -- --runInBand sales.service.spec.ts sales.controller.spec.ts
pnpm --dir backend test:e2e -- --runInBand tenant-sales.e2e-spec.ts
pnpm --dir backend build
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend build
```

## Dependency Scan

- Found one incomplete spec: `tenant-debt-management`.
- Relationship: related financial model and shared Prisma schema file, but neither spec requires the other's feature output.
- State update: no `blockedBy`/`blocks` link added; concurrent development must reconcile migrations.
