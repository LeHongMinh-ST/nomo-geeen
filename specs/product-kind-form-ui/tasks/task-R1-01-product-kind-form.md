# Task R1-01: Dynamic ProductKind form

**Status:** done  
**Requirement:** R1, R2, R4
**Dependencies:** `tasks/task-R0-01-product-kind-contract.md`

## Context

ProductForm currently renders common/agro fields without requiring a ProductKind or enabled group.

## Constraints

- **MUST** use existing Field/Select patterns and mobile-first layout.
- **MUST NOT** expose a raw JSON editor or add unsupported aquaculture choices.
- **SCOPE** ProductForm selectors, dynamic attrs, validation, and accessibility tests.

## Steps

- [x] Load enabled business groups and constrain group/kind selectors.
- [x] Add ProductKind state before specialist attrs; render field metadata from the pure catalog.
- [x] Add required-field and kind-change behavior with accessible inline errors.
- [x] Preserve existing common fields, mobile layout, sticky save, and Vietnamese copy.

## Completion Criteria

- [x] Unsupported/aquaculture kinds cannot be selected.
- [x] Specialist fields remain hidden before kind selection.
- [x] Required attrs are validated before submit.
- [x] Mobile and keyboard behavior follows `DESIGN.md`.

## Requirements

- R1.1, R1.2, R1.3, R2.1, R2.2, R2.3, R2.4, R4.1, R4.2, R4.3

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/components/app/product/product-form.tsx` | Modify | Render selectors and specialist attrs. |
| `frontend/lib/product-kind-form.ts` | Read | Canonical field metadata. |
| `frontend/components/app/product/*.test.tsx` | Create/Modify | Form and accessibility tests. |

## Runtime reachability verification

- Create and edit routes render the same dynamic form and enabled-group data.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Kind change drops user input | Medium | Explicit confirmation and targeted tests |

## Evidence

- `pnpm test` — 21 files / 83 tests passed, including ProductForm UI coverage (2 tests).
- Changed-form/catalog Biome lint — passed.
- `pnpm exec next build --webpack` — passed; TypeScript and 43 routes compiled.
- Review receipt: dynamic selector/field scope reviewed; score 9.7/10, PASS, no Critical findings.
