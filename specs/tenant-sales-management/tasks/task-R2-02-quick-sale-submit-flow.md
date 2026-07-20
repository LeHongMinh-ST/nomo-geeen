# Task R2-02: Quick sale submit flow

**Requirement:** R2 — authenticated checkout from `/ban-nhanh`
**Status:** done
**Priority:** P1
**Estimated Effort:** 3–4 hours
**Dependencies:** tasks/task-R0-01-sales-contract-foundation.md, tasks/task-R1-01-quick-sale-api.md, tasks/task-R2-01-real-product-picker.md
**Spec:** specs/tenant-sales-management/
**Contracts:** QuickSaleApi

## Context

- **Why**: The existing screen shows a success toast and clears the cart without creating a sale.
- **Current state**: `frontend/components/app/sales/quick-sale.tsx` has cart/payment UI; `frontend/lib/user-fetch.ts` provides authenticated requests; no sales client exists.
- **Target outcome**: Payment confirmation calls the quick-sale API once, displays the server result, and preserves the cart on failure.

## Constraints

- **MUST**: Copy the `QuickSaleApi` contract verbatim, use `userFetch`, generate one UUID idempotency key per attempt, and disable duplicate confirmation while pending.
- **SHOULD**: Keep existing `PaymentSheet`, customer picker, toast, mobile sticky action bar, and design tokens.
- **MUST NOT**: Treat a local toast as success, clear cart before 201 response, or implement customer CRUD/offline/printing.
- **SCOPE**: Wire the existing quick-sale UI only; order-list/form remains out of scope.

## Steps

- [x] 1. Create `frontend/lib/tenant-sales-api.ts` with typed `createQuickSale` using `userFetch`.
  - Business intent: make the checkout call durable and tenant-authenticated.
  - Code detail: serialize payment method, amount paid, optional customer, line product/unit/qty/price, discount, and idempotency key according to `QuickSaleApi`.
  - _Requirements: 3.3, 4.3, 4.4_
- [x] 2. Modify `frontend/components/app/sales/quick-sale.tsx` to submit and handle result/error states.
  - Business intent: show success only after the server commits and never lose a cart on a failed checkout.
  - Code detail: map existing payment sheet methods, preserve cart on errors, clear customer/cart only on success, show returned document/total/payment, and refresh product availability.
  - _Requirements: 3.3, 3.4, 3.5, 7.2_
- [x] 3. Add tests for pending, success, error preservation, and retry key reuse.
  - _Requirements: 3.3, 3.4, 3.5, 7.2_

## Requirements

- 3.3, 3.4, 3.5 — submit, success, and recoverable error behavior
- 4.3, 4.4 — retry/idempotency client contract
- 7.2 — preserve cart after failure

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/tenant-sales-api.ts` | Create | Typed quick-sale API client |
| `frontend/components/app/sales/quick-sale.tsx` | Modify | Connect payment confirmation to API |
| `frontend/components/app/sales/payment-sheet.tsx` | Modify | Return confirmed method and received amount |
| `frontend/components/app/sales/customer-picker.tsx` | Read | Optional selected customer ID |
| `frontend/lib/user-fetch.ts` | Read | Auth/refresh/retry transport |
| `frontend/package.json` | Read | Vitest/build commands |

## Completion Criteria

- [x] Confirming payment calls `POST /tenant/sales/quick` with the canonical payload and one idempotency key.
- [x] Buttons show a pending state and cannot submit the same attempt twice.
- [x] Successful response clears cart/customer only after response and displays the server document/total/payment result.
- [x] 4xx/5xx response preserves cart and retry reuses the same key; API client is reachable from `/ban-nhanh`.

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir frontend test` and `pnpm --dir frontend build`
  - Expected proof: API client/UI tests and production build pass.
- [x] Artifact / runtime verification
  - Inspect: `frontend/components/app/sales/quick-sale.tsx`, `frontend/lib/tenant-sales-api.ts`
  - Expect: no local-only `finish()` success path remains for confirmed payments.
- [x] Runtime reachability verification
  - Entrypoint/caller: `frontend/app/(app)/ban-nhanh/page.tsx` → `QuickSale` → `PaymentSheet` → `createQuickSale`
  - Expect: the visible `/ban-nhanh` flow invokes the new client.
- [x] Contract / negative-path verification
  - Check: API rejects stock/customer/payment and network failure after submit.
  - Expect: actionable error, cart retained, same key on retry, no duplicate client submit.

### Verification receipt — 2026-07-20

- `pnpm --dir frontend test` — PASS (5 files, 8 tests).
- `pnpm --dir frontend build` — PASS outside sandbox (Next compiled, TypeScript passed, `/ban-nhanh` generated).
- Artifact proof: `frontend/lib/tenant-sales-api.ts` uses `userFetch`; `QuickSale` submits canonical lines/payment and clears only after response.
- Runtime proof: `/ban-nhanh` reaches `QuickSale` → `PaymentSheet` → `createQuickSale`; `PaymentSheet` reports received amount for cash and full amount for transfer/QR.
- Negative-path proof: API client contract test passes; `QuickSale` preserves cart and idempotency key on errors, disables duplicate confirmation while pending, and maps stock/customer/auth errors.
- Final proof: frontend lint passed; production build generated `/ban-nhanh` and TypeScript passed.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Clearing cart before server response loses an order | High | Clear only on successful response and test failure preservation |
| Customer picker still has mock data | Medium | Pass optional ID only; backend validates it; keep anonymous paid checkout |
| Refresh retry changes request behavior | Medium | Reuse `userFetch` and retain idempotency key across retry |
