# Research — Atomic full sales return

## Evidence Summary

- `SalesReturn` and `SalesReturnLine` already exist in Prisma.
- `SaleLineBatch` records the exact FEFO allocation needed for restoration.
- `SalesService.cancelOrder` already demonstrates stock/debt compensation patterns.
- `StockReason.SALE_RETURN` and `DocumentType.SALE_RETURN` already exist.

## Decision

Implement full-sale return first. Partial returns and cash refund accounting remain separate
contracts because they need line-level refund policy and payment settlement semantics.
