# Task R0-01: Quick handbook API and snapshot contract

**Status:** done  
**Spec:** `specs/quick-sale-handbook-flow/`

## Scope

Finalize DTO/API response types, JSON snapshot shape, error behavior, and Prisma additive field if needed. Keep the current order snapshot contract compatible.

## Context

Existing normal-order snapshots do not cover the quick-sale DTO or selected suggestion metadata.

## Constraints

- Additive changes only; preserve current quick-sale payloads.
- No arbitrary formula execution.

## Steps

1. Confirm current Prisma Sale fields and define shared DTO/types.
2. Update spec-facing contracts and fixtures.

## Requirements

- R3, R4

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/dto/create-quick-sale.dto.ts` | Modify | Optional handbook payload. |
| `backend/prisma/schema.prisma` | Inspect/modify | Additive metadata field only if absent. |
| `frontend/lib/tenant-sales-api.ts` | Modify | Matching client types. |

## Risk Assessment

Medium: changing the idempotency equivalence payload can affect retries; existing payloads must remain equivalent when handbook fields are absent.

## Runtime reachability verification

`SalesController.createQuickSale` → `SalesService.createQuickSale` remains the path.

## Completion Criteria

- DTOs and frontend types agree on optional fields and response shape.
- `suggestedQtyMeta` exists on Sale only if current schema has no equivalent.
- No migration or schema change is made without confirming it is required.

## Evidence

- Prisma validate and focused DTO/schema compilation.
- PASS — backend build and Prisma validate on 2026-07-25.
