# Research — Core operational reports

## Evidence Summary

- `Stock`, `Product`, and `ProductBatch` already contain current quantity and expiry data.
- `Sale` and `SaleLine` already contain completed totals and product snapshots.
- Tenant permission/entitlement guards are reusable from existing controllers.

## Decision

Ship backend operational read endpoints first. Charts, exports, and financial accounting remain
separate follow-up specs.
