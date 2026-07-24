# Design — Atomic full purchase return

Add `PurchaseReturnsService` beside `PurchasesService` and expose it through the existing
purchase controller/module. Load a completed purchase with lines and original batch IDs.
Inside a Serializable transaction, create a completed PurchaseReturn, decrement Stock and
ProductBatch, append PURCHASE_RETURN movements, compensate supplier debt, and write audit.

Partial returns and payment settlement are separate scope.
