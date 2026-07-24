# Tenant Business Audit Coverage — Design

## Overview
This feature extends the tenant backend so committed business mutations produce structured, tenant-scoped audit rows. It reuses AuditLogger and service-owned transactions. No global interceptor, queue, UI, reports, retention, or external integration is added.

### Goals
- Stable actions for six tenant business areas and denied permissions.
- Preserve atomicity, isolation, idempotency, retries, and existing errors.
- Bounded snapshots without authentication/payment material.
- Focused negative-path and reachability proof.

### Non-Goals
Frontend, reports, retention/export/tamper-evidence, SIEM, returns, livestock, aquaculture, and read/list audit events.

## Architecture
### Existing Architecture Analysis
NestJS modules own domain services/controllers. Controllers receive verified TenantIdentity. Product, purchase, sales, stock-adjustment, and Handbook services use Prisma transactions; sales/purchases use Serializable retry/replay. AuditModule exports AuditLogger only to importing modules.

### Architecture Pattern and Boundary Map
Selected pattern: service-owned transactional audit plus a narrow guard-denial adapter. Services select actions and allow-listed snapshots; AuditLogger persists them. TenantPermissionGuard records denied authorization without calling a permission-guarded path. The existing AuthModule/AuditModule forwardRef relationship is preserved; AppModule compilation is a required proof.

~~~mermaid
flowchart LR
    Request[Tenant request] --> Access[Access guard]
    Access --> Permission[Permission guard]
    Permission --> Domain[Domain service]
    Domain --> Tx[Prisma transaction]
    Tx --> Mutation[Business mutation]
    Tx --> Audit[AuditLogger]
    Permission --> Deny[Denial writer]
    Mutation --> DB[(PostgreSQL)]
    Audit --> DB
    Deny --> DB
~~~

### Technology Stack
| Layer | Choice | Role |
|---|---|---|
| Backend | NestJS 11 TypeScript | Controllers, guards, services |
| Data | Prisma 7 PostgreSQL | Enum migration and AuditLog writes |
| Tests | Jest | Focused regressions |
| Runtime | pnpm | Test, build, Prisma validation |

## Canonical Action Set
The additive Prisma enum migration shall add exactly these tenant actions: PRODUCT_CREATE, PRODUCT_UPDATE, PRODUCT_DELETE, PRODUCT_GROUP_UPDATE, PURCHASE_CREATE, PURCHASE_UPDATE, PURCHASE_COMPLETE, PURCHASE_CANCEL, SALE_CREATE, SALE_COMPLETE, SALE_CANCEL, SALE_QUICK, SALE_DENY, STOCK_ADJUSTMENT_CREATE, STOCK_ADJUSTMENT_COMPLETE, HANDBOOK_CREATE, HANDBOOK_UPDATE, and PERMISSION_DENIED. Existing action values remain unchanged.

Snapshot bounds: a domain snapshot may contain at most 100 identifiers or line summaries; when exceeded it stores count plus a deterministic truncated marker, never the full array.

## Canonical Contracts and Invariants
| Contract Area | Canonical Decision | Applies To | Consistent In |
|---|---|---|---|
| Auth/session | tenantId, actorId, role derive from verified request.user; client cannot provide audit identity | All tenant writes/denials | controllers, guards, services, tests |
| Transport | Existing tenant routes remain unchanged; audit is internal side effect | All domains | controllers/modules/tasks |
| Data/persistence | Success events use AuditLogger.run/writeInTx in same Prisma transaction; actions are additive enum members | Mutations | schema/migration/services/receipts |
| Retention | No deletion/retention policy; existing rows preserved | AuditLog | requirements/tasks/review |
| Runtime output | Existing pretest/prebuild regenerate Prisma client; final proof includes build and Prisma validate | Schema tasks | receipts |

## System Flows
### Successful mutation
~~~mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant Service
    participant Tx as Prisma transaction
    participant Logger as AuditLogger
    participant DB
    Client->>Controller: authenticated mutation
    Controller->>Service: verified context
    Service->>Tx: begin or reuse
    Tx->>DB: business mutation
    Service->>Logger: writeInTx or run
    Logger->>DB: bounded AuditLog insert
    Tx-->>Controller: commit result
~~~

### Denied permission
~~~mermaid
sequenceDiagram
    participant Client
    participant Guard
    participant Denial
    participant DB
    Client->>Guard: authenticated request
    Guard->>DB: load current grants
    Guard->>Denial: bounded denial event
    Denial->>DB: audit row
    Guard-->>Client: existing 403
~~~

## Requirements Traceability
| Requirement | Components | Flow |
|---|---|---|
| 1.1-1.4 | schema, AuditLogger | mutation |
| 2.1-2.4 | services, AuditLogger | mutation |
| 3.1-3.3 | ProductsService | product routes |
| 4.1-4.3 | PurchasesService | purchase routes |
| 5.1-5.4 | SalesService | sales routes |
| 6.1-6.3 | StockAdjustmentsService, HandbookService | adjustment/Handbook |
| 7.1-7.3 | TenantPermissionGuard, denial writer | denied permission |
| 8.1-8.3 | tests/AppModule | all paths |
| 9.1-9.2 | snapshot mappers | mutation |
| 10.1-10.3 | context/logger/query boundary | all events |
| 11.1-11.3 | transaction/retry/receipt | failure/replay |

## Components and Interfaces
| Component | Intent | Requirements | Dependencies |
|---|---|---|---|
| AuditAction vocabulary | Stable operation codes | 1,10 | Prisma migration P0 |
| TenantAuditContext | Verified actor/request context | 1,7,10 | TenantIdentity P0 |
| Domain audit wiring | Committed events | 2-6,9,11 | AuditLogger P0 |
| Permission denial writer | Safe denied event | 7,10,11 | Prisma/logger P0 |
| Verification suite | Cross-domain proof | 8,11 | Jest/build/Prisma P0 |

### Audit context and snapshots
TenantAuditContext contains verified tenantId/userId, optional role code, stable resource label, and IP/User-Agent only from server request context. It contains no raw authorization/cookie values. Snapshots are allow-listed summaries of identity, lifecycle, kind/category/reason, bounded quantity/effects, and necessary references. Full DTOs and unbounded line arrays are forbidden.

### Permission denial contract
Action is PERMISSION_DENIED; actorType is USER; tenantId/actorId come from verified identity; resource is a stable server label; after contains bounded required/missing permissions and outcome=denied. The writer bypasses TenantPermissionGuard dependency and preserves 401/403 semantics.

## Data Models
AuditLog remains the storage contract. AuditAction is extended additively. No new aggregate/table is introduced. Existing tenant/createdAt and actor indexes remain.

## Error Handling
Existing 4xx/422 errors remain unchanged. Success audit failure rolls back the mutation. Denial audit failure shall preserve the original 401/403 response and cannot grant access; the guard must not retry through itself or create a success event. Snapshot mapping fails closed rather than persisting unrestricted payloads.

## Testing Strategy
Unit tests cover action validation, context, bounded/redacted snapshots, and denial recursion. Domain tests cover success, rollback, isolation, no-success-event, and replay. Regression covers existing audit logger/query/sanitizer, build, Prisma validate, migration inspection, and AppModule reachability.

## Security Considerations
Keep existing least-privilege audit reads. Exclude tokens, cookies, passwords, authorization headers, full bodies, and foreign tenant data. Use structured enum/resource values to avoid log injection. Retention, tamper-evidence, and external shipping are deferred.

## Performance and Scalability
Default cost is one bounded AuditLog insert per committed mutation. Full bodies and unbounded arrays are not stored. Existing retry limits remain.

## Migration Strategy
~~~mermaid
flowchart LR
    Backup[Database backup] --> Migrate[Additive action migration]
    Migrate --> Validate[Prisma and focused tests]
    Validate --> Deploy[Deploy writers]
    Validate --> Rollback[Stop before app deploy]
~~~
Migration removes no existing action/row. Stop before application deploy if migration/client validation fails.

## Open Questions and Risks
Choose one stable server-side route-label source for denial events; do not add client input. Retention/tamper-evidence remains future scope.
