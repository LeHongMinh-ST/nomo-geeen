# Requirements: Core Stock Lifecycle

## R1 — Batch receiving

- **R1.1** Completing a purchase with a batch code shall create or reuse the tenant/product/warehouse batch and increase `qtyOnHand` by base quantity.
- **R1.2** Purchase line `batchId` and stock movement `batchId` shall reference the received batch.
- **R1.3** Recalled or expired inbound batches shall be rejected for products that require batch control; legacy products without a batch code remain compatible only when explicitly allowed by policy.

## R2 — FEFO sale allocation

- **R2.1** A completed sale shall allocate quantity from non-recalled, non-expired batches ordered by earliest expiry; no-expiry batches are last.
- **R2.2** A sale spanning batches shall persist one `SaleLineBatch` row per allocation and movements shall carry the corresponding batch.
- **R2.3** Sale completion shall fail atomically when eligible batch quantity is insufficient; stock and batch quantities must not partially change.
- **R2.4** Tenant and warehouse boundaries shall be enforced for every batch query and update.

## R3 — Verification

- **R3.1** Focused tests shall cover receive, reuse, FEFO order, expiry/recall exclusion, insufficient stock rollback, and tenant isolation.
