# Task R1-02: ProductKind payload and edit round-trip

**Status:** done  
**Requirement:** R3, R6
**Dependencies:** `tasks/task-R0-01-product-kind-contract.md`, `tasks/task-R1-01-product-kind-form.md`

## Context

The current ProductForm submits only common fields, so backend kind validation cannot receive the selected contract.

## Constraints

- **MUST** keep existing API routes and error boundary.
- **MUST** normalize attrs before submit and preserve edit round-trip.
- **SCOPE** request payload, hydration, and API error mapping only.

## Steps

- [x] Submit `businessGroup`, `productKind`, and normalized `attrs` on create/update.
- [x] Hydrate group/kind/attrs from detail response in edit mode.
- [x] Map backend field errors to Vietnamese inline form errors and preserve generic fallback.
- [x] Ensure no stale incompatible attrs are submitted after kind changes.

## Completion Criteria

- [x] Create and update payloads match existing DTOs.
- [x] Save/reload preserves group, kind, and attrs.
- [x] API rejection leaves the form editable and exposes no raw payload.

## Requirements

- R3.1, R3.2, R3.3, R6.1, R6.3

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/components/app/product/product-form.tsx` | Modify | Build create/update payload and hydrate edit state. |
| `frontend/lib/tenant-products-api.ts` | Modify | Preserve canonical fields and group lookup call. |
| `frontend/lib/product-kind-form.test.ts` | Create/Modify | Payload and normalization tests. |

## Runtime reachability verification

- Submit flows call existing authenticated `createTenantProduct`/`updateTenantProduct` routes.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Legacy response lacks kind | Medium | Deterministic fallback and no silent mutation |

## Evidence

- `pnpm test` — 21 files / 85 tests passed, including canonical submit payload coverage.
- Changed-form/catalog Biome lint — passed.
- `pnpm exec next build --webpack` — passed; TypeScript and 43 routes compiled.
- Review receipt: payload normalization, edit hydration, and error boundary reviewed; score 9.7/10, PASS, no Critical findings.
