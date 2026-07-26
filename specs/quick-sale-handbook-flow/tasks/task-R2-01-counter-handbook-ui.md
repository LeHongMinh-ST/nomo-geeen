# Task R2-01: Wire Handbook into the counter

**Status:** done  
**Spec:** `specs/quick-sale-handbook-flow/`

## Scope

Add the mobile-first quick-sale panel and API client. Preserve the existing known-product picker and require explicit seller action before adding a suggestion to the cart.

## Context

The existing `/ban-nhanh` page has product search and payment but no Handbook panel.

## Constraints

- Follow `DESIGN.md` mobile-first counter patterns.
- Keep known-product checkout path unchanged.

## Steps

1. Add Handbook API client and panel state.
2. Render search/consult/suggestions with explicit add actions.
3. Include snapshot metadata in checkout and add component/API tests.

## Requirements

- R5, R2, R3, R4

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/components/app/sales/quick-sale.tsx` | Modify | Compose panel and payload. |
| `frontend/components/app/sales/handbook-quick-panel.tsx` | Add | Counter flow UI. |
| `frontend/lib/tenant-handbook-api.ts` | Modify | Search/suggestions client. |
| `frontend/lib/tenant-sales-api.ts` | Modify | Snapshot payload types. |

## Risk Assessment

Medium: preserve user-entered cart and metadata across API errors and idempotent retries.

## Runtime reachability verification

`frontend/app/(app)/ban-nhanh/page.tsx` renders `QuickSale`.

## Completion Criteria

- `/ban-nhanh` supports disease search, optional consult skip, suggestion review, and explicit add.
- Checkout sends the full snapshot payload and retry preserves it.
- UI labels advice as reference and surfaces availability/warnings.

## Evidence

- Frontend tests and lint/typecheck.
- PASS — frontend Vitest 169 tests, TypeScript, scoped Biome check, and production build.
