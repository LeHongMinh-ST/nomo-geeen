# Task R1-02: Phi rei advisory display

**Requirement:** R3
**Status:** pending
**Priority:** P2
**Estimated Effort:** 0.5 day
**Dependencies:** none
**Spec:** specs/sale-checkout-fe-gates/

## Context

- **Why**: Catalog §11.3 wants PHI/REI/withdrawal **display** at sell time; backend extract exists, FE cart silent.
- **Current state**: product-detail shows PHI; POS cart/picker may not show advisories.
- **Target outcome**: Non-blocking advisory chips when line product has phi/rei/withdrawal meta.

## Constraints

- **MUST**: Display-only; missing meta = hide strip.
- **MUST NOT**: Hard-block checkout on advisory values; no harvest calendar.
- **SCOPE**: small strip component + mount on quick-sale and/or order-form line list; read fields from cart product shape already loaded.
- **(P)** Can parallel R1-01 if no file conflict on same lines; prefer after map if same files.

## Steps

- [ ] 1. Scout product-picker / cart line type for attrs or agro.phi/rei; document fields used.
  - _Requirements: 3.1, 5.2_
- [ ] 2. Create `frontend/components/app/sales/sale-advisories-strip.tsx` rendering chips for present values only.
  - _Requirements: 3.1, 3.3_
- [ ] 3. Mount strip under cart lines on quick-sale (and order-form if same line model) without blocking submit.
  - _Requirements: 3.1, 3.2_

## Requirements

- 3.1, 3.2, 3.3, 5.2

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/components/app/sales/sale-advisories-strip.tsx` | Create | Display chips. |
| `frontend/components/app/sales/quick-sale.tsx` | Modify | Mount strip. |
| `frontend/components/app/sales/order-form.tsx` | Modify | Mount if lines have meta. |
| `frontend/components/app/sales/product-picker.tsx` | Read | Product shape. |
| `frontend/lib/products.ts` | Read | agro.phi/rei seed shape. |

## Completion Criteria

- [ ] Lines with phi/rei show non-blocking advisory UI.
- [ ] Lines without meta show no strip / no error.
- [ ] Checkout still succeeds with advisories present (no hard block).

## Evidence

### Automated verification

```bash
pnpm --dir frontend test sales
```

(Or targeted component test if added.)

### Artifact verification

- Strip component exists; grep mount sites.

### Runtime reachability verification

- Mounted under quick-sale (and order-form if in scope) from existing POS pages.

### Contract / negative-path verification

- Empty advisories → render null.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Cart lines lack attrs | Medium | Hide strip; optional follow-up enrich picker |
| Visual clutter | Low | Compact chips |
