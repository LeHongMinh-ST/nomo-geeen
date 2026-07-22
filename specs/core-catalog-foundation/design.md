# Design: Core Catalog Foundation

## Canonical taxonomy

```text
BusinessGroup:
  CROP_INPUTS = Thuốc bảo vệ thực vật + Phân bón
  CROP_SEEDLINGS = Cây giống
  ANIMAL_FEED = Thức ăn chăn nuôi
  VETERINARY_DRUGS = Thuốc thú y
  LIVESTOCK = Con giống
```

Product-kind compatibility is explicit: `PESTICIDE|FERTILIZER -> CROP_INPUTS`, `SEED|SEEDLING -> CROP_SEEDLINGS`, `FEED -> ANIMAL_FEED`, `VET_DRUG -> VETERINARY_DRUGS`, and `LIVESTOCK_SEED -> LIVESTOCK`. `CROP_SEED` is a legacy alias readable as `SEED` only when its existing domain is crop; otherwise it remains legacy/uncategorized.

## Data shape

Common product fields remain unchanged. New fields are additive:

```json
{"businessGroup":"CROP_INPUTS","productKind":"PESTICIDE","attrs":{"activeIngredient":"...","concentration":"...","targetPests":["..."],"preHarvestIntervalDays":7}}
```

Attribute validation is server-side and rejects unknown required-shape violations. The server returns the stable IDs and labels; clients do not infer group from mutable category names.

## Migration and compatibility

Existing rows are preserved. A backfill may set deterministic values from current `productKind`; rows that cannot be mapped remain readable with a compatibility fallback. No destructive migration or aquaculture enablement is included.
