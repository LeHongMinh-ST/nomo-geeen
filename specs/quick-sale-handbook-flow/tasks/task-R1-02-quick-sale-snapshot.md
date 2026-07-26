# Task R1-02: Snapshot handbook context on quick sale

**Status:** done  
**Spec:** `specs/quick-sale-handbook-flow/`

## Scope

Extend quick-sale DTO/service so disease/context/suggestion/quantity metadata is tenant-resolved and persisted atomically with the completed sale.

## Context

Quick sale already creates a completed Sale and handles idempotency, but it leaves Handbook fields null.

## Constraints

- Resolve disease within the transaction and tenant boundary.
- Reject before stock mutation.

## Steps

1. Validate optional payload and resolve disease/consult context.
2. Persist immutable snapshot alongside Sale creation.
3. Extend idempotency comparison and focused tests.

## Requirements

- R4

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/sales.service.ts` | Modify | Transaction snapshot. |
| `backend/src/platform/sales/sales.service.spec.ts` | Modify | Success/error/replay tests. |

## Risk Assessment

High: snapshot lookup must not happen after stock mutation or outside the serializable transaction.

## Runtime reachability verification

`POST /tenant/sales/quick` already maps to the service transaction.

## Completion Criteria

- Snapshot is persisted before the transaction returns and survives Handbook edits.
- Invalid/foreign disease fails before stock mutation.
- Idempotency replay accepts only an equivalent handbook payload.

## Evidence

- Sales service tests for success, invalid disease, replay, and no partial mutation.
- PASS — sales service suite passes with existing quick-sale regression and handbook snapshot coverage.
