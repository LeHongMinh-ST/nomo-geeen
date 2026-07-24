# Research

- `backend/src/platform/sales/sale-eligibility-policy.ts` already normalizes regulatory advisory attributes but explicitly treats them as non-blocking.
- `SalesService` uses the policy during order creation, order completion, and quick sale, making it the narrow integration point.
- `SaleLine` is the durable snapshot boundary for data needed when a draft is completed later.
- Product attributes support camelCase and snake_case aliases; this slice preserves that convention.

## Evidence Summary

- Source inspection: `SaleLine` is returned by the completion query and is therefore the durable boundary for draft re-validation.
- Source inspection: order create, order completion, and quick sale all call `assertProductSaleEligible` before stock mutation.
- Existing policy tests prove advisory aliases; this task adds hard date-gate coverage.

Unresolved questions: regulatory master-data ownership and prescription-driven date calculation remain outside this slice.
