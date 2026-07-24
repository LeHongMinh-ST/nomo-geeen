# Research — Handbook order snapshot

## Evidence Summary

- Sale already has `diseaseId`, `diseaseNameSnapshot`, `consultContext`, and `suggestedQtyMeta` columns.
- HandbookService already persists tenant-scoped Disease rows.
- Sales order creation already runs in a Serializable transaction.

## Decision

Wire the existing columns instead of introducing a new snapshot table.
