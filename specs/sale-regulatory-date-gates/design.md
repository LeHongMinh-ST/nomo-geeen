# Design

1. Add nullable `DateTime @db.Date` fields to `SaleLine` for `harvestDate` and `withdrawalEndDate`.
2. Extend both line DTOs with optional ISO-8601 date strings.
3. Add a pure policy function that normalizes positive advisory day values and compares dates at UTC day precision.
4. Call the policy before stock mutation in all three paths; completion uses the persisted line snapshots.
5. Return structured `PRODUCT_PHI_ACTIVE` or `PRODUCT_WITHDRAWAL_ACTIVE` errors.

Invariant: missing dates preserve current behavior. A gate never mutates stock or debt before it passes.
