# Requirements — Atomic full sales return

- The system shall allow a tenant user with `sales:edit` to return one completed sale once.
- The return shall restore aggregate stock and every allocated ProductBatch in one transaction.
- The return shall reject missing, foreign-tenant, draft, cancelled, or already-returned sales.
- The return shall compensate the customer's outstanding debt atomically when applicable.
- The original sale shall remain immutable and queryable.
