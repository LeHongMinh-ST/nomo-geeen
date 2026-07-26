# Research — Quick-sale Handbook flow

## Repository evidence

- `docs/core-business-catalog.md` requires tenant-scoped Handbook entries, domain-safe suggestions, no automatic cart insertion, and immutable sale snapshots.
- `docs/handbook.md` defines the counter flow: disease lookup → optional one-question-at-a-time consultation → transparent quantity suggestion → seller confirmation.
- `backend/src/platform/handbook/handbook.service.ts` already provides tenant-scoped list/detail CRUD and stores pins/ingredients, but does not expose stock-aware suggestions or consult fields.
- `backend/src/platform/sales/sales.service.ts` already snapshots disease context for normal orders. `createQuickSale` currently creates a completed `QUICK_SALE` without disease/context fields.
- `frontend/components/app/sales/quick-sale.tsx` currently supports product picker and checkout only. `frontend/lib/handbook.ts` contains FE-only suggestion ranking and mock diseases.
- Prisma already has `Disease`, `DiseaseProductPin`, `DiseaseIngredient`, `DiseaseConsultField`, `Sale.diseaseId`, `Sale.diseaseNameSnapshot`, and `Sale.consultContext`.

## Decisions

- Reuse the existing Disease/pin/ingredient/consult schema; no migration is required for the first slice.
- Add a small read API for the counter rather than duplicating mock data in the UI.
- Send selected suggestion and warning metadata as JSON in the quick-sale request so the completed sale is self-contained.
- Keep quantity calculation advisory: the server validates JSON shape and preserves the seller-submitted value; it does not execute arbitrary formulas.

## Evidence Summary

The current repository contains the required persistence primitives and tenant guards, while the missing behavior is isolated to the quick-sale DTO/service, a stock-aware Handbook read path, and the `/ban-nhanh` composition. The design therefore avoids a new domain model and keeps the implementation additive.

## Unresolved questions

- Existing `suggestedQtyMeta` is not present on the current Sale model; the implementation should add it additively if Prisma confirms no equivalent field.
