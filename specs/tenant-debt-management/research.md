# Research and Evidence

## Evidence Summary

### Codebase scout
- Prisma already contains DebtLedger, PaymentVoucher, PaymentVoucherLine, DebtDirection.DECREASE, VoucherType, Customer.balance, and Supplier.balance.
- SalesService and PurchasesService create debt INCREASE entries in Prisma transactions.
- Tenant authorization uses TenantAccessTokenGuard, TenantPermissionGuard, and RequireTenantPermission.
- The existing debt UI originally used frontend mock accounts and local payment mutation; userFetch is the authenticated transport.
- A first implementation pass added a debt module and API client, but it lacks replay protection and E2E proof.

### External research
Skipped: the design uses existing NestJS, Prisma, PostgreSQL, Next.js, and project-local auth contracts; no external provider or current policy is needed.

### Decision
Use PaymentVoucher and PaymentVoucherLine as receipt/payment documents and DebtLedger as immutable debt history. Add only the minimum tenant-scoped idempotency field/index needed for duplicate protection.

### Rejected alternatives
- A separate cash ledger is out of scope because this request is debt-linked receipt/payment, not general accounting.
- Client-only mutation cannot enforce tenant isolation, concurrency, or rollback.
- A second balance store would conflict with Customer/Supplier.balance already used by sales and purchases.

### Remaining gaps
- Add the schema migration and replay-safe service behavior.
- Add isolated PostgreSQL E2E for both directions, authorization, rollback, and tenant isolation.
- Preserve the existing unrelated billing migration/test failure as a separate repository blocker.