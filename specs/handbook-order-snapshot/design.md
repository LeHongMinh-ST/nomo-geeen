# Design — Handbook order snapshot

Extend `CreateSalesOrderDto` with optional `diseaseId`, `consultContext`, and `suggestedQtyMeta`.
Inside the existing Serializable sales transaction, resolve the disease by tenant and write its
current name plus the two JSON values onto Sale. No new table or AI behavior is introduced.
