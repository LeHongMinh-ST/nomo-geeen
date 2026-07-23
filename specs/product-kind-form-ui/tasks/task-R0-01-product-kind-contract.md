# Task R0-01: Frontend ProductKind contract

**Status:** done  
**Requirement:** R1, R2, R6

## Context

The backend already exposes the canonical group/kind and attrs contract, while frontend types currently omit it.

## Constraints

- **MUST** mirror backend required attrs without changing backend contract.
- **MUST NOT** add React or network imports to the pure catalog module.
- **SCOPE** frontend types, catalog, mapper, and unit tests.

## Steps

- [x] Add a pure frontend catalog module for BusinessGroup/ProductKind order, labels, compatibility, required attrs, optional field metadata, and legacy fallback.
- [x] Extend `TenantProduct`, `ProductInput`, and mapping functions with `businessGroup`, `productKind`, and `attrs`.
- [x] Add unit tests for order, enabled-group filtering, compatibility, required attrs, and fallback.

## Completion Criteria

- [x] No duplicated kind/group literals in the form component.
- [x] Contract matches backend `product-contract.ts` required attrs.
- [x] Existing common product mapping remains passing.

## Requirements

- R1.1, R1.2, R1.3, R1.4, R2.2, R6.1, R6.3

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/product-kind-form.ts` | Create | Pure group/kind/field catalog. |
| `frontend/lib/tenant-products-api.ts` | Modify | Add API fields and business-group lookup. |
| `frontend/lib/products.ts` | Modify | Preserve canonical fields in Product mapping. |

## Runtime reachability verification

- `/san-pham/them` and `/san-pham/[id]` reach the shared ProductForm and API mapper.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Contract literals drift | High | Single catalog + contract-focused tests |

## Evidence

- `pnpm test` — 20 files / 81 tests passed.
- Changed-file Biome lint — passed.
- `pnpm exec next build --webpack` — passed; TypeScript and 43 routes compiled.
- Spec validator — passed.
- Full frontend lint remains baseline-failing in unrelated sales tests/components (4 errors, 21 warnings); no changed-file diagnostics.
- Review receipt: R0 contract/catalog scope reviewed; score 9.7/10, PASS, no Critical findings.
