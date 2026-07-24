# Research — Specialized catalog sale safety

## Evidence Summary

- `backend/src/platform/sales/sale-eligibility-policy.ts` is already called by all three
  sale paths and is pure.
- `Product.attrs` already stores kind-specific JSON attributes.
- `ProductKind.LIVESTOCK_SEED` exists in Prisma and the product contract.
- The audit report explicitly leaves livestock state-machine enforcement open while hard flag
  gates are already complete.

## Decision

Close only the safe, additive sale gate now; defer persistence and lifecycle modeling to a
separate approved spec.
