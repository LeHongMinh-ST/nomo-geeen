# Requirements: Product form by ProductKind

Source: `backend/src/platform/products/product-contract.ts`, `docs/core-business-catalog.md`, and the existing tenant product API/UI.

## R1 — Canonical kind and group selection

- **R1.1** The form shall load enabled BusinessGroups from `/tenant/products/business-groups` and show only selectable groups.
- **R1.2** The form shall require a `productKind` and derive/submit its compatible `businessGroup`.
- **R1.3** The form shall not offer `AQUACULTURE` or an unsupported kind.
- **R1.4** Existing products with legacy/null kind data shall remain editable through a deterministic fallback without silently changing stored data.

## R2 — Dynamic kind-specific fields

- **R2.1** Kind-specific fields shall remain hidden until a kind is selected.
- **R2.2** Required fields shall match the existing backend contract: pesticide `activeIngredient` + `concentration`; fertilizer/biological/growth-regulator/soil-amendment `composition`; seed/seedling `species` + `variety`; feed `animalSpecies` + `feedForm`; veterinary drug `activeIngredient` + `dosageForm`; livestock seed `species` + `breed`.
- **R2.3** PHI/REI and withdrawal fields are advisory inputs only and shall not add a frontend hard gate.
- **R2.4** Changing kind shall clear incompatible unsaved attrs after explicit user confirmation or preserve only shared attrs; stale attrs must not be submitted as active kind fields.

## R3 — API payload and edit round-trip

- **R3.1** Create and update shall submit `businessGroup`, `productKind`, and `attrs` through the existing tenant product API.
- **R3.2** Edit shall hydrate the selected group, kind, and attrs from API response and preserve them after save/reload.
- **R3.3** API validation errors shall appear inline/in Vietnamese without exposing raw backend payloads.

## R4 — UX and accessibility

- **R4.1** ProductKind selection shall precede the specialist fields and use existing form components/visual language.
- **R4.2** Mobile layout follows `DESIGN.md`: labels ≥16px, controls ≥48px, one primary action, sticky full-width save action.
- **R4.3** Required fields expose accessible labels and invalid state; changing kind is keyboard accessible.

## R5 — Verification

- **R5.1** Tests cover group/kind catalog filtering, required attrs, kind changes, legacy fallback, create payload, edit hydration, and API error rendering.
- **R5.2** Existing product list/detail/form tests remain passing.
- **R5.3** Frontend test, lint, build, and route reachability pass or record an environment blocker.

## Non-functional

- **R6.1** No backend schema/DTO/contract changes.
- **R6.2** No inventory/sales/purchase side effects.
- **R6.3** Reuse existing `ProductForm`, `tenant-products-api`, and product types; no new form framework.

## Unresolved

- Whether future domain specs need additional optional fields beyond the current backend required-attrs map.
