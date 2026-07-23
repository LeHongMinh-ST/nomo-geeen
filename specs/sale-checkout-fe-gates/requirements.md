# Requirements: sale-checkout-fe-gates

Source: follow-up to `specs/sale-checkout-kind-gates/`; catalog §11.3 display PHI/REI; audit gap #4 FE lag.

## R1 — Structured eligibility reason messaging

- **R1.1** When a sales API returns HTTP 422 with `reason` equal to `PRODUCT_UNSELLABLE`, `PRODUCT_LOCKED`, `PRODUCT_RECALLED`, or `PRODUCT_INACTIVE`, the POS UI shall show a stable Vietnamese message distinct per reason (not the generic “Không thể hoàn tất đơn” only).
- **R1.2** When `reason` is `INSUFFICIENT_STOCK` or `INVALID_CUSTOMER`, existing copy shall remain or improve without regression.
- **R1.3** When `reason` is unknown, the UI shall show a safe generic fallback message.

## R2 — Wire map on sale surfaces

- **R2.1** When `createQuickSale` fails with a known reason, `quick-sale.tsx` shall use the shared map.
- **R2.2** When `createOrder` fails with a known reason, `order-form.tsx` shall use the shared map.
- **R2.3** When `completeOrder` fails with a known reason, `order-detail.tsx` shall use the shared map.

## R3 — PHI/REI/withdrawal advisory display (non-blocking)

- **R3.1** When a cart/order line product exposes advisory metadata (`phiDays`/`phi`, `reiDays`/`rei`, or withdrawal* fields from attrs/agro), the POS shall show a non-blocking advisory strip or chips for those values.
- **R3.2** The system shall not hard-block checkout solely because advisory values are present or positive without a harvest/event date (out of scope).
- **R3.3** When advisory metadata is missing, the UI shall omit the strip without error.

## R4 — Verification

- **R4.1** Unit tests shall cover the reason map for all eligibility codes + fallback.
- **R4.2** Component or unit tests shall cover at least quick-sale deny path text for one eligibility reason.
- **R4.3** Frontend targeted tests named in tasks shall pass or record a blocker.

## Non-functional

- **R5.1** Map pure function — no network I/O.
- **R5.2** No new backend endpoints required for reason map; advisory prefers data already on client product selection.

## Unresolved (defer)

- Harvest-date PHI hard gate (backend + FE).
- Livestock individual eligibility UI.
- Backend embedding advisories on sale response DTO.
