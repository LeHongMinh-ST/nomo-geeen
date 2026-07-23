# Requirements: Sale Checkout Kind Gates

Source: `docs/core-business-catalog.md` (checkout by ProductKind), audit gap #4 after core-stock-lifecycle and stock-adjustment.

## R1 — Unified sale eligibility policy

- **R1.1** When a sale line is validated, the system shall evaluate product sale eligibility through a pure policy function. Hard rejects use product flags (`status` / `isLocked` / `isRecalled` / missing product). `productKind` is available to the policy for advisory metadata and alignment with batch-controlled sale paths, not for inventing additional hard blocks in this slice.
- **R1.2** When the product is missing, inactive, locked, or recalled, the system shall reject with a structured 422 reason (`PRODUCT_UNSELLABLE` or more specific code) and shall not create sale lines or mutate stock.
- **R1.3** When eligibility fails, the error body shall include at least `reason` and `message`, and may include `field` and `productKind` for client mapping.

## R2 — Wire into sale write paths

- **R2.1** When creating a sales order (`createOrder`), each line’s product shall pass the eligibility policy before persistence.
- **R2.2** When completing a draft sales order, each line’s product shall be re-evaluated for eligibility before stock/batch decrement (prevents selling after mid-DRAFT recall/lock).
- **R2.3** When creating a quick sale (`createQuickSale`), the same eligibility policy shall run before stock mutation.

## R3 — Kind-aware batch alignment

- **R3.1** When completing a sale for a batch-controlled kind, the system shall continue to require successful FEFO/batch allocation (existing `resolveSaleAllocations`); eligibility policy shall not bypass that path.
- **R3.2** When a product is product-level recalled/locked, the system shall reject even if batch stock remains (product gate before/alongside batch).

## R4 — Advisory metadata (non-blocking)

- **R4.1** When product `attrs` contain known advisory keys (e.g. PHI/REI or withdrawal day fields), the policy may extract them for unit tests and optional service-side logging. This slice does **not** require changing HTTP response DTOs to surface advisories; missing keys shall not fail the sale.
- **R4.2** The system shall not hard-block a sale solely because PHI/REI/withdrawal attributes are present or positive without a harvest/event date on the line (out of scope).

## R5 — Verification

- **R5.1** Focused unit tests shall cover allow/deny matrix for product flags and at least one kind branch.
- **R5.2** Sales service tests shall cover reject on locked/recalled product on create and/or complete without stock movement.
- **R5.3** Backend build or targeted tests named in tasks shall pass or record an environment blocker.

## Non-functional

- **R6.1** Eligibility check for up to 50 lines shall remain in the same transaction boundaries already used by sales (no new cross-service RPC).
- **R6.2** Tenant isolation unchanged: all product loads remain tenant-scoped.

## Unresolved (defer)

- Standardize PHI/REI attrs keys in `product-contract` REQUIRED_ATTRS.
- FE display of advisory PHI/REI at POS.
- Harvest-date PHI hard gate.
