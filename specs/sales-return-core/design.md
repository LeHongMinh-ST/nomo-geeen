# Design — Atomic full sales return

Add `SalesReturnsService` beside `SalesService` and expose it through the existing sales
controller/module. Load the completed sale tenant-scoped with lines and SaleLineBatch rows.
Inside a Serializable transaction, create one completed SalesReturn, increment Stock, increment
allocated ProductBatch rows, append SALE_RETURN movements, compensate customer debt, and write
SALE_RETURN audit. Never mutate the original Sale status or lines.

## Invariants

- No stock/debt write occurs if validation or any compensation step fails.
- A completed SalesReturn for a sale is unique by application check inside the transaction.
- Batch restoration follows the original SaleLineBatch quantities.
