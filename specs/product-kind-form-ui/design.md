# Design: Product form by ProductKind

## Architecture

```text
ProductForm
  → frontend/lib/product-kind-form.ts
  → tenant-products-api.ts
  → /tenant/products/business-groups + /tenant/products
```

## Canonical frontend contract

The shared module shall expose:

- ordered enabled-group filtering;
- supported kinds per group;
- required attr keys per kind;
- display labels and field metadata;
- legacy fallback mapping without mutating API data.

The module is pure and has no React or network imports.

## Form sequence

1. Common identity fields.
2. BusinessGroup selector.
3. ProductKind selector constrained by selected group.
4. Specialist attrs section rendered from the selected kind.
5. Units/prices/common operational fields.
6. Sticky mobile save action.

Selecting a new kind resets only incompatible specialist draft attrs after inline confirmation. Existing saved attrs remain intact until save.

## Attr field map

| ProductKind | Required | Optional advisory/common |
|---|---|---|
| `PESTICIDE` | `activeIngredient`, `concentration` | `phiDays`, `reiDays`, crop/pest, formulation |
| `FERTILIZER`, `BIOLOGICAL_PRODUCT`, `GROWTH_REGULATOR`, `SOIL_AMENDMENT` | `composition` | application, crop, growth stage |
| `SEED`, `SEEDLING`, `CROP_SEED` | `species`, `variety` | season, germination/survival, age |
| `ANIMAL_FEED` | `animalSpecies`, `feedForm` | growthStage, protein, energy |
| `VET_DRUG` | `activeIngredient`, `dosageForm` | withdrawalMeatDays, withdrawalMilkDays, withdrawalEggDays |
| `LIVESTOCK_SEED` | `species`, `breed` | sex, age, health |

## Error and accessibility behavior

- Required errors are shown beside the field and summarized near the save action.
- Backend 400/422 maps to Vietnamese field messages; unknown failures use the existing generic message.
- No raw `attrs` JSON editor is exposed to operators.
- Specialist fields use existing `Field`/`Select` patterns and controls ≥48px.

## Scope boundaries

- No backend changes.
- No stock/batch/sales validation.
- No catalog manager persistence.
- No image upload or price-tier redesign.
