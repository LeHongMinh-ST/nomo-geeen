# Validation Log — Session 1 — 2026-07-21

**Trigger:** Auto → Tasks after the user selected Expand and purchase-unit conversion.
**Questions asked:** 0 additional questions; the scope and creation-mode gate was answered by the user.

## Confirmed Decisions

- Scope: Expand, including bounded supplier CRUD/lookup.
- Units: Include purchase-unit conversion to base unit using existing purchase/BOTH conversions.
- Mode: Auto → Tasks.
- Lifecycle: Draft has no effects; completion atomically applies stock, movement, moving-average cost, and supplier payable.
- Retry: Purchase.idempotencyKey with tenant-scoped uniqueness and canonical payload comparison.
- Inventory: canonical GET /tenant/inventory and GET /tenant/inventory/:productId read boundary.

## Action Items

- [x] Propagate retry migration and moving-average allocation into design.md and requirements.md.
- [x] Keep permission discovery as a blocking R0 foundation step with no invented codes.
- [x] Keep supplier CRUD isolated in task-R1-02; do not add payment vouchers or returns.

## Impact on Tasks

- R0-01 owns DTOs, exact permission discovery, fixtures, and retry contract foundation.
- R1-01 owns the transactional migration and completion behavior.
- R2-02 consumes the canonical inventory endpoints, not an ad-hoc product response.
