# Requirements — Core operational reports

## Backend

- The system shall return tenant-scoped stock rows with product group/kind and batch expiry data.
- The system shall return completed sales count, totals, paid amount, debt amount, and top products for a bounded date range.
- The system shall reject invalid date ranges and enforce existing tenant permissions/entitlements.
- **R7.** The system shall accept optional `businessGroup` query (Prisma `BusinessGroup` enum: `CROP_INPUTS`, `CROP_SEEDLINGS`, `ANIMAL_FEED`, `VETERINARY_DRUGS`, `LIVESTOCK` only) on stock-summary and sales-summary, filter rows tenant-scoped by product.businessGroup, and include `filter` + `byBusinessGroup` breakdown in responses. No invented groups; no aquaculture.

## Frontend UI shell (Luồng D)

- **R4.** While authenticated in the tenant app, the system shall expose a `/bao-cao` page reachable from existing navigation that loads stock summary and sales summary only from the live tenant report endpoints (no mocked business figures).
- **R5.** The system shall present loading, error (with retry), and empty states for each summary section, and shall validate the sales date range on the client (`from < to`, maximum 366 days) before calling the sales endpoint.
- **R6.** The system shall state clearly that charts, export, and full accounting reports are out of scope, while still displaying the available stock rows, sales KPIs, top products, and business-group breakdown returned by the API.
- **R8.** The system shall offer a business-group filter (Tất cả + 5 Phase-1 groups) that reloads both summaries with `businessGroup` query param.
