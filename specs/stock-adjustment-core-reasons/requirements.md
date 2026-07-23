# Requirements: Stock Adjustment Core Reasons

Source of truth for business meaning: `docs/core-business-catalog.md` §5–9 (per-group loss/quality reasons) and §11 (immutable completed documents; adjustments create movements). Closes audit gap #6 after `core-stock-lifecycle`.

## R1 — Adjustment document lifecycle

- **R1.1** When a tenant creates a stock adjustment with at least one line, the system shall persist a tenant-scoped document with `docNo`, warehouse, optional note, and status `DRAFT` or complete immediately when requested, without changing purchase/sale money fields.
- **R1.2** When a draft adjustment is completed, the system shall run inside a serializable transaction and mark the document immutable (`COMPLETED`); further edits shall be rejected.
- **R1.3** When completion would drive any product warehouse stock below zero, the system shall reject with a structured 422 reason and leave stock, batches, and movements unchanged.

## R2 — Per-kind reason vocabulary (core-value)

- **R2.1** When a line is validated, the system shall require a `reasonCode` drawn from a closed vocabulary keyed by `Product.productKind` (Phase 1 kinds), derived from catalog reasons (moisture/caking, death, quarantine, recall scrap, open bag, etc.).
- **R2.2** When a reason is not allowed for the product kind, the system shall reject with field-level 400/422 and shall not create movements.
- **R2.3** When the product kind is uncontrolled (`OTHER` or policy-exempt), the system shall still require a generic reason from a small fallback set (e.g. `COUNT_CORRECTION`, `OTHER_LOSS`) and never allow free-text-only reason codes.

## R3 — Stock, batch, and movement integrity

- **R3.1** When an adjustment line completes with delta ≠ 0, the system shall update `Stock.qty` for the same tenant/warehouse/product by that base-unit delta and create an append-only `StockMovement` with `reason = ADJUSTMENT` and ref to the adjustment.
- **R3.2** When the line references a `batchId` (or requires batch per inbound policy for that kind when decreasing controlled stock), the system shall update `ProductBatch.qtyOnHand` consistently with the stock delta and attach `batchId` on the movement; multi-batch FEFO auto-split is out of scope for decrease without explicit batch.
- **R3.3** When batch-controlled stock decreases without a valid batch that has sufficient `qtyOnHand`, the system shall reject completion atomically.
- **R3.4** Every query and mutation shall be tenant-scoped; warehouse shall match the document warehouse.

## R4 — Verification

- **R4.1** Focused tests shall cover: valid complete (stock+movement), kind/reason reject, negative stock reject, batch decrease success/fail, tenant isolation.
- **R4.2** Build and Prisma validate (or recorded env blocker) shall pass for the touched backend package.

## Non-functional

- **R5.1** Adjustment complete for up to 50 lines shall complete in the same transaction pattern as purchase/sale (serializable + optional P2034 retry if already used elsewhere).
- **R5.2** No client-supplied tenantId shall override auth tenant context.

## Unresolved (defer, not blocking)

- Whether Phase 1 FE ships list UI in this tranche (API-first by scope_lock).
- Expanding reason set for aquaculture (out of scope).
