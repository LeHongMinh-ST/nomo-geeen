# Design — Quick-sale Handbook flow

## API

### Handbook

- Extend `GET /tenant/handbook` only as needed for the existing search contract, or add `GET /tenant/handbook/quick-search?q=` when response shape differs from admin pagination.
- Add `GET /tenant/handbook/:id/quick-suggestions` returning:

```ts
{
  disease: { id, name, category, symptom, aliases },
  consultFields: [{ fieldKey, label, fieldType, unit, options, required, sortOrder }],
  suggestions: [{ productId, name, unitId, unit, unitPrice, availableQty, available, reason, warnings }]
}
```

- Reuse `handbook:view` permission and the existing tenant guard. Suggestion reads must use tenant IDs on Disease, pins, products, and stock.

### Quick sale payload

```ts
{
  diseaseId?: string,
  consultContext?: Record<string, unknown>,
  suggestedProductsMeta?: Array<{ productId: string; reason: string; available: boolean; warnings?: string[] }>,
  suggestedQtyMeta?: { requested?: number; unit?: string; source?: "HANDBOOK" | "SELLER"; formula?: string }
}
```

- Add `suggestedQtyMeta Json?` to Sale if absent. All JSON is copied into the Sale transaction; no later Handbook lookup is needed to render history.
- Disease resolution happens before prepared-line stock mutation. On failure, throw the existing structured validation error.

## Suggestion algorithm

1. Load disease with pins, ingredients, consult fields.
2. Load pinned product IDs and candidate tenant products; join current stock for the default warehouse.
3. Exclude deleted, inactive, locked, recalled, and non-sellable products from selectable results.
4. Rank pin first, then ingredient match, then tag match; stable tie-break by product ID.
5. Return warnings/advisory metadata. Never mutate cart or stock.

## Frontend

- Add a `HandbookQuickPanel` beside `ProductPicker` in `QuickSale`.
- Keep state local to the page: selected disease, consult answers, suggestion metadata, and panel step.
- Selecting a suggestion calls the existing `addProduct` callback only after an explicit button click.
- Pass snapshot metadata through `createQuickSale`; clear it with the cart after success and preserve it on error for retry.
- Follow `DESIGN.md`: mobile-first, large targets, no modal-heavy flow, visible skip action.

## Verification

- Unit tests for service ranking/isolation and quick-sale transaction ordering.
- Frontend API mapper/component tests for search, consult skip, explicit add, and payload snapshot.
- Browser reachability smoke through `/ban-nhanh` if dev servers are available.
