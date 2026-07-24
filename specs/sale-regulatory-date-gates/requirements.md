# Requirements

## R1. Regulatory dates are captured

The system SHALL accept optional ISO dates for `harvestDate` and `withdrawalEndDate` on order and quick-sale lines, and persist them as immutable sale-line snapshots.

## R2. PHI gate

When a product has a positive `phiDays`/`phi_days` attribute and a harvest date is supplied, the system SHALL reject the sale if the harvest date is before the sale date plus PHI days.

## R3. Veterinary withdrawal gate

When a product has a positive withdrawal period attribute and a withdrawal end date is supplied, the system SHALL reject the sale if that date is on or after the current sale date (the withdrawal period is still active). The rejection SHALL include a structured reason.

## R4. Draft completion consistency

Completing a draft order SHALL re-evaluate the product hard gates and persisted regulatory dates using the completion timestamp.

## R5. Tenant and path consistency

The gates SHALL apply to both tenant sales-order creation/completion and quick sale without changing existing stock, payment, or idempotency behavior.

## Non-goals

- No automatic prescription or regulatory master-data calculation.
- No frontend implementation in this slice.
- No hard REI gate when no harvest date is supplied.
