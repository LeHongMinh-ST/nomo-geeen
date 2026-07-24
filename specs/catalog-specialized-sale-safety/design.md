# Design — Specialized catalog sale safety

Use the existing pure `sale-eligibility-policy.ts` as the single enforcement point. Read
the livestock state from `Product.attrs`, normalize it to uppercase, and throw a structured
422 with `PRODUCT_LIVESTOCK_UNSELLABLE`. Existing lifecycle flags run first; FEFO and stock
mutation remain downstream and therefore cannot execute after the rejection.

## Invariants

- No Prisma access in the policy.
- No stock mutation after a policy rejection.
- Only `LIVESTOCK_SEED` interprets the livestock state keys.
