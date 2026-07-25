# Requirements

## R1. ProductKind decides specialized attrs

The system SHALL validate `Product.attrs` against the selected `ProductKind` on create and update, using the catalog as the authority:

- `PESTICIDE` SHALL require `activeIngredient`, `concentration`, a non-negative `phiDays`, and a non-negative `reiDays`.
- `VET_DRUG` SHALL require `activeIngredient`, `dosageForm`, and the three separate withdrawal periods `withdrawalMeatDays`, `withdrawalMilkDays`, `withdrawalEggDays`.
- `FERTILIZER` SHALL require `composition` plus the nutrient percentages `nitrogenPercent`, `phosphorusPercent`, `potassiumPercent`.
- Existing required attrs for the remaining kinds SHALL be preserved unchanged.

## R2. Wrong-kind attrs are rejected

The system SHALL reject attrs that belong to a different `ProductKind`, with a `BadRequestException` naming the offending key:

- crop PHI/REI keys SHALL NOT be accepted on any kind other than `PESTICIDE` (explicitly forbidden on `FERTILIZER` and `VET_DRUG`);
- veterinary withdrawal keys SHALL NOT be accepted on any kind other than `VET_DRUG`;
- fertilizer nutrient percentage keys SHALL NOT be accepted on any kind other than `FERTILIZER`.

## R2b. Enforcement boundary for legacy rows

The specialized attr rules in R1 and R2 SHALL be enforced whenever the caller supplies attrs — that is, on every create and on every update that explicitly sends `attrs`. When an update does not send `attrs` and the service merges the stored value, the newly added specialized rules SHALL NOT be enforced, so products created before this slice remain editable. Pre-existing base rules SHALL keep applying in both cases.

## R3. Numeric regulatory attrs are typed

Regulatory day counts and nutrient percentages SHALL be accepted as finite non-negative numbers, or numeric strings, and SHALL be rejected when absent, non-numeric, or negative. Both camelCase and snake_case spellings SHALL be accepted, matching the existing sale advisory alias convention.

## R4. PHI and REI gates are pesticide-only

When the product kind is `PESTICIDE` and the sale line supplies a harvest date, the system SHALL reject the sale if the harvest date is earlier than the sale date plus `phiDays`, and SHALL reject it if the harvest date is earlier than the sale date plus `reiDays`. Products of any other kind SHALL NOT be gated on PHI or REI even if those keys are present in legacy attrs.

## R5. Withdrawal gate is veterinary-only and per product type

When the product kind is `VET_DRUG` and the sale line supplies a withdrawal end date that is on or after the sale date, the system SHALL reject the sale if any of the three withdrawal periods is positive, evaluating meat, milk, and egg independently rather than collapsing them into one value. Products of any other kind SHALL NOT be gated on withdrawal.

## R6. Backward compatibility and structured denial

Missing event dates SHALL remain non-blocking, and no regulatory value SHALL be invented or defaulted. Denials SHALL keep the existing structured shape with `reason`, `message`, `field`, and `productKind`, reusing `PRODUCT_PHI_ACTIVE` and `PRODUCT_WITHDRAWAL_ACTIVE` so the frontend reason mapper stays compatible. Denials SHALL continue to occur before any stock mutation on order create, draft completion, and quick sale, and SHALL continue to emit a `SALE_DENY` audit entry.

## Non-goals

- No Handbook, payment, or report changes.
- No regulatory master data, prescription calculation, or new Prisma columns.
- No new reason codes and no frontend changes.
- No retroactive validation or backfill of products created before this slice.
