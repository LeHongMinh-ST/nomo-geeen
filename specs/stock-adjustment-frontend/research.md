# Research: Stock Adjustment Frontend

## Evidence Summary

### Codebase scout result

- Backend controller exposes authenticated list/detail/create/complete routes at /tenant/stock-adjustments. DTO requires UUID warehouse/product, signed decimal-string delta, reasonCode, and optional batchId.
- Service returns decimal quantities as strings and enforces DRAFT/COMPLETED immutability.
- Existing FE extension points: frontend/lib/user-fetch.ts, frontend/lib/tenant-inventory-api.ts, inventory list/detail/adjust-sheet, ListFilterBar, and DataPagination.
- Runtime entrypoints: frontend/app/(app)/ton-kho/page.tsx and frontend/app/(app)/ton-kho/[id]/page.tsx. AdjustSheet is FE-only and free-text today.
- Vitest, Testing Library, Biome, and Next build exist; no dependency is needed.

### External research result / skip rationale

External research skipped: internal extension of existing code and contracts; no new library, provider, or platform policy.

### Selected decision

Add a typed client and focused inventory UI. Backend remains authoritative for reason codes; known codes receive Vietnamese labels and unknown codes render safely. Reuse userFetch and existing list/detail/sheet primitives.

### Rejected alternatives

- No backend contract or reason-catalog change.
- No free-text-only reasons.
- No new shell or UI dependency.

### Remaining gaps

- FE inventory contract does not document a warehouse selector; reuse an existing default/authenticated source or show an explicit blocked state, never fabricate an ID.

### Downstream task/test implications

- R0 tests exact API paths, payload, decimal strings, errors. R1 tests list/detail/read-only. R2 tests validation/confirmation/refresh/errors. R3 tests route reachability/responsive/accessibility/build.
