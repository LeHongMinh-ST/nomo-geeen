# Tenant Business Audit Coverage — Requirements

## Introduction
This spec adds structured, tenant-scoped audit coverage to product, purchase, sales, stock-adjustment, Handbook, and tenant permission-denial paths. It reuses the existing AuditLogger and transaction boundaries. It does not add UI, reports, retention, returns, or external log shipping.

## Scope Lock
In scope: additive AuditAction vocabulary and migration; verified actor context; same-transaction mutation audit; six domain areas; permission denial; tenant isolation; bounded/redacted snapshots; rollback/replay tests; build and Prisma validation. Out of scope: frontend, reports, retention/export/tamper-evidence, global interceptor, async queue, returns, livestock, aquaculture, and SIEM.

Canonical action set: PRODUCT_CREATE, PRODUCT_UPDATE, PRODUCT_DELETE, PRODUCT_GROUP_UPDATE, PURCHASE_CREATE, PURCHASE_UPDATE, PURCHASE_COMPLETE, PURCHASE_CANCEL, SALE_CREATE, SALE_COMPLETE, SALE_CANCEL, SALE_QUICK, SALE_DENY, STOCK_ADJUSTMENT_CREATE, STOCK_ADJUSTMENT_COMPLETE, HANDBOOK_CREATE, HANDBOOK_UPDATE, and PERMISSION_DENIED.

## Requirements
### Requirement 1: Audit vocabulary and event contract
**Objective:** As a compliance owner, I want stable tenant audit events, so that changes are queryable and interpretable.
#### Acceptance Criteria
- **R1.1** When a scoped tenant mutation succeeds, the system shall emit one canonical AuditAction for its operation and resource.
- **R1.2** Each tenant row shall record tenantId, USER actorType, actorId, actorRoleCode when available, resource, resourceId when available, outcome context, and createdAt.
- **R1.3** Snapshots shall be bounded business fields and shall exclude passwords, tokens, secrets, authorization headers, and credential hashes.
- **R1.4** The additive Prisma migration shall preserve existing actions and rows.

### Requirement 2: Transactional boundary
**Objective:** As a system owner, I want audit writes coupled to mutations, so that committed changes cannot lose their audit trail.
#### Acceptance Criteria
- **R2.1** A mutation that changes PostgreSQL state shall write its success audit through AuditLogger.run or writeInTx in the same Prisma transaction.
- **R2.2** A rolled-back mutation shall not leave a committed success audit row.
- **R2.3** Audit insert failure shall fail closed and shall not commit a partial mutation.
- **R2.4** Existing Serializable retries and idempotent replays shall remain stable without duplicate success events.

### Requirement 3: Product coverage
**Objective:** As a tenant owner, I want catalog changes traceable, so that product policy can be investigated.
#### Acceptance Criteria
- **R3.1** Product create, update, soft-delete, and enabled-business-group update shall emit matching events after commit.
- **R3.2** Product audit shall be tenant-scoped and shall not expose foreign records.
- **R3.3** ProductKind, businessGroup, and attrs changes shall be preserved without credentials or tokens.

### Requirement 4: Purchase coverage
**Objective:** As a tenant owner, I want receiving lifecycle traceable, so that supplier and batch decisions can be reconstructed.
#### Acceptance Criteria
- **R4.1** Purchase create, draft update, complete, and cancel shall emit matching events when committed.
- **R4.2** Completion context shall identify purchase and bounded line/batch summary, not unrestricted payloads.
- **R4.3** Invalid batch, entitlement, tenant-mismatch, and failed receiving paths shall not emit success events.

### Requirement 5: Sales coverage
**Objective:** As a tenant owner, I want order and quick-sale changes traceable, so that stock/debt effects can be investigated.
#### Acceptance Criteria
- **R5.1** Order create, complete, cancel, and quick-sale success shall emit one matching event per commit.
- **R5.2** Sale context shall include resource identity, settlement summary, stock/debt effect summary, and no raw payment secrets.
- **R5.3** Eligibility, permission, entitlement, tenant, and validation denial shall never emit a success sale event and shall use bounded denial context where applicable.
- **R5.4** Equivalent idempotent/Serializable replays shall not duplicate success events.

### Requirement 6: Stock and Handbook coverage
**Objective:** As a tenant owner, I want corrections and Handbook mutations traceable, so that operational truth stays accountable.
#### Acceptance Criteria
- **R6.1** Stock-adjustment draft creation and completion shall emit events with reasonCode and bounded delta summary.
- **R6.2** Handbook create and update shall emit events with category/resource identity and bounded content metadata.
- **R6.3** Cross-tenant, invalid-reason, immutable-state, and validation failures shall not emit success events.

### Requirement 7: Permission denial coverage
**Objective:** As a security owner, I want denied tenant permissions recorded, so that authorization failures can be investigated.
#### Acceptance Criteria
- **R7.1** An authenticated request denied by TenantPermissionGuard shall emit one PERMISSION_DENIED event with verified tenant/user, permission summary, resource label, and outcome.
- **R7.2** Denial data shall exclude tokens, cookies, passwords, authorization headers, and full request bodies.
- **R7.3** Denial logging shall not recurse through the guard or turn denial into authorization success.

### Requirement 8: Verification and reachability
**Objective:** As a maintainer, I want proof of coverage, so that implementation is safe to hand off.
#### Acceptance Criteria
- **R8.1** Focused tests shall cover success, rollback, isolation, denial, sensitive-field exclusion, and replay for each domain.
- **R8.2** Backend build, Prisma validation, and additive migration checks shall pass with no weakened unrelated tests.
- **R8.3** Each audit-wired module shall be reachable from its existing controller/guard and AppModule path.

## Non-Functional Requirements
### Requirement 9: Performance and scalability
#### Acceptance Criteria
- **R9.1** A successful audited mutation shall use no more than one additional AuditLog insert except explicitly documented multi-event flows.
- **R9.2** Snapshots shall not persist full request bodies or unbounded line arrays.

### Requirement 10: Security and privacy
#### Acceptance Criteria
- **R10.1** TenantId and actor identity shall derive from verified request context, never client-provided audit fields.
- **R10.2** Existing audit query authorization and recursive sanitization shall remain intact.
- **R10.3** Tests shall prove sensitive keys and foreign identifiers are absent or rejected.

### Requirement 11: Reliability and recovery
#### Acceptance Criteria
- **R11.1** Audit insert failure inside a business transaction shall roll back the mutation and preserve its existing server-error behavior.
- **R11.2** A replay observing an already committed terminal mutation shall return the existing result without another success row.
- **R11.3** The verification receipt shall record out-of-scope behavior and fixture limitations.

## Unresolved Questions
Retention, export, tamper-evidence, external shipping, and the exact stable route-label source remain future decisions.
