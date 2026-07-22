# Research & Design Decisions: Tenant Sales Order Management

## Summary

- **Feature**: `tenant-sales-order-management`
- **Discovery Scope**: Complex integration across tenant sales, inventory, debt, and three existing frontend routes.
- **Execution Tier**: Deep.
- **5-Dimension Assessment**:
  - Semantic intent: replace the existing mock order workflow with real list, detail, create, complete, and cancel behavior.
  - Implementation hypothesis: extend the existing `SalesModule` and `Sale` aggregate; reuse purchase lifecycle and quick-sale transaction patterns; wire the current routes through one typed API client.
  - Gap size: Medium — existing schema and UI exist, but order endpoints and lifecycle logic do not.
  - Risk: Complicated — the solution is knowable, but transactional compensation and concurrency require expert care; no spike is needed because repository patterns and official transaction guidance are concrete.
  - Blast radius: Critical Path — sales, stock, debt, entitlements, shared customer picking, and tenant authorization are affected.
- **Complexity smells**: More than eight files are necessarily touched because the feature spans an existing backend module, schema migration, three UI surfaces, shared picker, tests, and runtime integration. Eight task files keep the scope below the task-count split threshold; no new service/module abstraction is planned.
- **User Scope Choice**: Hold — complete the selected existing UI without Sales Return or adjacent retail features.

## Evidence Summary

- **Codebase Scout**: Required and completed on 2026-07-22.
  - Result: The `Sale` aggregate already supports `ORDER` and `DRAFT|COMPLETED|CANCELLED`; current backend implements only completed quick sale. Existing order UI is fully mock-backed. Purchase management provides the closest proven lifecycle implementation.
  - Relevant files/modules: `backend/prisma/schema.prisma`, `backend/src/platform/sales/`, `backend/src/platform/purchases/`, `backend/src/platform/debts/`, `backend/test/tenant-sales.e2e-spec.ts`, `frontend/lib/orders.ts`, `frontend/lib/tenant-sales-api.ts`, `frontend/components/app/sales/`, and `frontend/app/(app)/don-ban-hang/`.
  - Existing patterns/contracts: Nest guarded controllers, Prisma interactive transactions, conditional stock updates, tenant-scoped queries, explicit frontend API clients, component tests, and mobile-first route components.
  - Tests or checks affected: sales controller/service unit tests, sales E2E, tenant sales API tests, order component tests, quick-sale customer regression, frontend/backend build and lint.
- **External / Current Research**: Required and completed on 2026-07-22 because the scope touches security and transaction integrity.
  - Result: Prisma recommends `Serializable` isolation plus bounded retry for P2034 write conflicts and designing retry-safe idempotent APIs. OWASP requires object-level authorization for every endpoint accepting resource IDs and recommends explicit response property selection.
  - Primary sources: Prisma Transactions; OWASP API1:2023 Broken Object Level Authorization; OWASP API3:2023 Broken Object Property Level Authorization.
  - Current constraints or best practices: keep transactions short, retry serialization conflicts, tenant-scope every object lookup, and return explicit DTOs.
- **Selected Decision**:
  - Decision: Extend `SalesService` and the existing `Sale` aggregate with a schema-minimal lifecycle contract; add only persisted `note`, a list index, and `SALE_CANCEL` movement reason. Use compensating writes for completed cancellation.
  - Why it fits the current codebase: It reuses quick-sale validation/effects, purchase lifecycle/retry, the existing order routes, and the existing typed fetch boundary.
  - Why it fits current external constraints: Serializable read-modify-write transactions, bounded retry, explicit DTOs, and tenant-scoped object checks directly address the cited guidance.
- **Rejected Alternatives**:
  - New `SalesOrder` aggregate/service — rejected because `Sale.channel=ORDER` and the current schema already represent the workflow.
  - Treat order completion as a call to the public quick-sale endpoint — rejected because draft state, persisted lines, channel-specific idempotency, and transitions require an internal shared transaction path.
  - Keep completed orders immutable — rejected because the user explicitly selected the full existing UI, which exposes completed cancellation; strict compensation and rejection gates replace silent local status changes.
  - Implement Sales Return as cancellation — rejected because returns are explicitly out of scope and represent partial/item-level behavior.
  - Add audit, monthly quota reservation, document-sequence adoption, tier pricing, or draft editing — rejected as existing gaps/adjacent features outside the locked scope.
- **Remaining Gaps / Questions**:
  - None blocking. Cash refund documentation is outside scope; completed cancellation updates order reporting state, stock, and debt only.
- **Downstream Task & Test Implications**:
  - Task implication: Preserve quick sale while adding channel-aware idempotency; use service-level entitlement assertions because `RequireFeature` supports one feature metadata value.
  - Test implication: Include forced rollback and concurrent complete/cancel cases, cross-tenant object IDs, cross-channel key reuse, shared customer-picker regression, and responsive/accessibility runtime evidence.

## Codebase Scout

| Area | Finding | Evidence / Path | Implication |
|---|---|---|---|
| Project surface | pnpm workspace-style repository; NestJS 11/Prisma 7/PostgreSQL backend and Next.js 16/React 19 frontend | `backend/package.json`, `frontend/package.json`, `README.md` | Use existing scripts and TypeScript boundaries; add no dependency. |
| Sales aggregate | `Sale` already has channel, lifecycle status, totals, customer snapshots, payment/debt, tenant-wide idempotency, timestamps, lines, returns, and warehouse | `backend/prisma/schema.prisma` models `Sale`, `SaleLine` | Extend existing aggregate; add note/index/reason only. |
| Quick-sale effects | One transaction validates tenant products/customer, conditionally decrements stock, writes movements, and increases debt | `backend/src/platform/sales/sales.service.ts` | Extract/reuse internal preparation/effect logic without changing the public quick-sale contract. |
| Proven lifecycle | Purchases implement list/detail, draft creation, direct completion, Serializable retry, and exact-once completion | `backend/src/platform/purchases/purchases.service.ts`, `backend/test/tenant-purchases.e2e-spec.ts` | Mirror the known lifecycle shape and strengthen complete/cancel race handling. |
| Entitlements | `RequireFeature` stores one feature value; order drafts are documented as Advanced while runtime offers `advanced_mode` | `backend/src/platform/entitlements/`, `backend/prisma/seed.ts` | Gate routes with `advanced_mode`; assert `inventory` and conditional `debt` inside transactions. |
| Debt model | Customer balance is aggregate; vouchers are not allocated to a sale; ledger supports `ADJUST` and `DECREASE` | `backend/src/platform/debts/debts.service.ts`, `backend/prisma/schema.prisma` | Compensate only when current balance can absorb the original debt; otherwise reject atomically. |
| Mock order UI | Seeded order/customer data, local filters, fake delay, local state transitions, and synchronous detail lookup remain | `frontend/lib/orders.ts`, `frontend/components/app/sales/order-*.tsx`, `frontend/app/(app)/don-ban-hang/[id]/page.tsx` | Replace runtime mocks while retaining pure display/total helpers where useful. |
| Existing real pickers | Product picker is API-backed; customer picker is still seeded and shared with quick sale | `frontend/components/app/sales/product-picker.tsx`, `frontend/components/app/sales/customer-picker.tsx` | Migrate the shared customer picker and test quick-sale regression. |
| Payment UX | Existing `PaymentSheet` covers cash, transfer, and QR; debt is controlled by its parent | `frontend/components/app/sales/payment-sheet.tsx` | Reuse it and add parent-level partial/full debt completion with a customer gate. |
| Visual contract | Mobile cards, desktop pagination, inline destructive confirmation, touch targets, and non-cached business API are mandatory | `DESIGN.md` sections 12, 21, 22, 23, 24, 26 | Carry exact route, responsive, accessibility, and verification expectations into frontend tasks. |
| Blast radius | `tenant-debt-management` also plans a Prisma schema migration, but the two specs do not require each other's output | `specs/tenant-debt-management/spec.json`, its R0 task | No semantic block; avoid overlapping migration names and reconcile schema if developed concurrently. |
| Staleness / conflicts | Product docs call draft orders Advanced/later and completed records immutable; user explicitly selected the current full UI including completed cancellation | `docs/sales.md`, `docs/database-design-retail.md`, user scope choice | Record an intentional new product decision and enforce compensating cancellation rather than hiding the conflict. |

## Collateral Damage

- Existing quick-sale idempotency can collide with new order keys because the lookup is tenant-wide and currently does not verify channel/status. The backend foundation task must make replay channel-aware and retain HTTP 409 for cross-channel reuse.
- Migrating `CustomerPicker` from mock data affects `/ban-nhanh`; the frontend task must preserve anonymous selection and selected-customer submission.
- `frontend/lib/orders.ts` contains both mock data and useful pure types/helpers. Remove mock runtime ownership without deleting helpers still consumed by quick sale/order UI.
- The new schema migration and the incomplete debt spec may both edit `backend/prisma/schema.prisma`; development must rebase/reconcile rather than declare a semantic dependency.

## External / Current Research

| Question | Source | Finding | Decision Impact |
|---|---|---|---|
| How should concurrent lifecycle writes be handled? | [Prisma Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) | Serializable isolation may return P2034 on write conflict; bounded retry is the documented recovery pattern. | Complete, cancel, and direct-complete creation use short Serializable transactions with bounded P2034 retry. |
| How should tenant object IDs be authorized? | [OWASP API1:2023 BOLA](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) | Every endpoint receiving an object ID needs object-level authorization, even when the route itself is permission-protected. | Every sale/product/customer/stock lookup includes tenant scope; cross-tenant order IDs return a non-enumerating 404. |
| How should response data be exposed? | [OWASP API3:2023 BOPLA](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/) | Explicit property selection prevents excessive exposure and mass-assignment-style drift. | Define one response DTO contract and map Prisma data explicitly. |

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Decision |
|---|---|---|---|---|
| Extend existing SalesModule | Add order methods and DTOs to current controller/service | Smallest boundary, reuses transaction rules, no duplicate aggregate | Service file may need internal extraction to remain maintainable | Selected |
| Separate SalesOrderModule | New controller/service over `Sale` | Apparent isolation | Duplicates validation/effects and creates split ownership of one aggregate | Rejected |
| Frontend-only mock completion | Keep server quick sale and local order state | Low initial work | Data loss, no isolation, no stock/debt authority | Rejected |

## Design Decisions

### Decision: Draft Is Side-Effect Free

- **Context**: Delivery-later orders must not reserve stock or create debt before completion.
- **Selected Approach**: Persist validated lines/totals/snapshots only; all stock/debt side effects occur during completion.
- **Status**: Accepted.
- **Trade-offs**: Stock can become insufficient between draft and completion; completion must revalidate and may fail without changing the draft.

### Decision: Completed Cancellation Uses Strict Compensation

- **Context**: The selected existing UI allows cancellation after completion, unlike older immutable guidance.
- **Selected Approach**: Restore stock and reverse original debt within one Serializable transaction, then mark the order cancelled. Reject when a return exists or aggregate customer balance cannot absorb the reversal.
- **Status**: Accepted by explicit user scope.
- **Trade-offs**: A previously collected debt can block cancellation; Sales Return/refund allocation remains a future workflow.

### Decision: No Global Entitlement Guard Refactor

- **Context**: One order operation can require `advanced_mode`, `inventory`, and conditionally `debt`, while route metadata supports one feature.
- **Selected Approach**: Use `advanced_mode` at the route boundary and service assertions inside the transaction for stock/debt features.
- **Status**: Accepted.
- **Trade-offs**: Entitlement logic is split between boundary and transaction, but avoids an unrelated cross-platform guard change.

## Risks & Mitigations

- Concurrent completion/cancellation — Serializable isolation, conditional legal-state transition, bounded P2034 retry, E2E race proof.
- Duplicate stock/debt compensation — state-aware idempotent replay plus exact movement/ledger count assertions.
- Cross-tenant access — tenant predicate on every lookup and manipulated-ID E2E tests.
- Debt already settled — conditional balance decrement and whole-transaction HTTP 409 rollback.
- Shared customer picker regression — dedicated component/API tests plus quick-sale integration regression.
- Large query pages — page-size cap, composite list index, explicit p95 fixture test.

## Unresolved Questions

- None.

## References

- `README.md`
- `DESIGN.md`
- `docs/base_spec.md`
- `docs/sales.md`
- `docs/database-design-retail.md`
- `specs/tenant-sales-management/`
- `specs/tenant-debt-management/`
- [Prisma Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [OWASP API1:2023 Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP API3:2023 Broken Object Property Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/)
