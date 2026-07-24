# Research — Atomic full purchase return

## Evidence Summary

- PurchaseLine already stores `batchId`, `qtyBase`, and `lineTotal`.
- StockReason.PURCHASE_RETURN and DocumentType.PURCHASE_RETURN already exist.
- PurchasesService already updates supplier debt and Stock/ProductBatch on completion.

## Decision

Implement a full purchase return with one immutable reverse document first; defer partial
line selection and cash settlement semantics.
