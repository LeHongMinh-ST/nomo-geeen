# Requirements — Atomic full purchase return

- The system shall allow `purchase:edit` to return one completed purchase once.
- The return shall decrement Stock and the original ProductBatch quantities atomically.
- The return shall reduce supplier debt atomically when the original purchase had debt.
- The original Purchase shall remain unchanged and queryable.
