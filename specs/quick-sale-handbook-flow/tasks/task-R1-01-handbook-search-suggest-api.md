# Task R1-01: Disease search, consult fields, and stock-aware suggestions

**Status:** done  
**Spec:** `specs/quick-sale-handbook-flow/`

## Scope

Implement tenant-scoped quick-counter disease lookup and suggestion service/controller using existing pins, ingredients, consult fields, product eligibility, and default-warehouse stock.

## Context

Handbook list/detail is tenant-scoped, but suggestion ranking remains FE mock-only and consult fields are not returned.

## Constraints

- Reuse existing permissions, product eligibility, and default warehouse rules.
- Never mutate stock or cart from a read endpoint.

## Steps

1. Add response DTOs and service query.
2. Load pins/ingredients/consult fields and stock; rank stable suggestions.
3. Add controller route and service tests.

## Requirements

- R1, R2, R3

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/handbook/handbook.controller.ts` | Modify | Counter read route. |
| `backend/src/platform/handbook/handbook.service.ts` | Modify | Search/suggestion logic. |
| `backend/src/platform/handbook/handbook.service.spec.ts` | Modify | Isolation/ranking tests. |

## Risk Assessment

Medium: stock joins can expose cross-tenant data if any relation filter is omitted.

## Runtime reachability verification

Tenant auth/permission guards protect the new route under `HandbookController`.

## Completion Criteria

- Search matches name/alias/target/symptom and never crosses tenant boundaries.
- Suggestions are ranked and labeled, with unavailable products non-selectable.
- Consult fields are returned in order and validated when submitted.

## Evidence

- Handbook service tests for ranking, isolation, and consult field output.
- Backend build.
- PASS — HandbookService focused tests cover tenant filter, ranking, availability, and consult fields.
