# Requirements Document

## Introduction
This feature delivers platform-admin tenant management for NomoGreen SaaS operations. Platform operators can list, inspect, edit, lifecycle-manage, and export tenants while every action is gated by server-side `admin.tenant:*` permissions and audit-logged. The feature depends on the completed permission foundation from `admin-rbac-user-management` and reuses the existing `Tenant` Prisma model.

## Requirements

### Requirement 1: Tenant list and search
**Objective:** As a platform admin, I want a filtered tenant list, so that I can find stores quickly without loading all tenants.

#### Acceptance Criteria
- **R1.1** When an authenticated admin with `admin.tenant:view` requests the tenant list, the system shall return a paginated collection of tenants ordered by `createdAt` descending, then `id` descending (stable tie-break).
- **R1.2** When list filters for `status`, free-text `q` matching `name` or `slug` (max length 100, trimmed), or pagination parameters are provided, the system shall apply them server-side and preserve stable sort order.
- **R1.3** When page size is omitted, the system shall default to 20 rows and reject page size values outside 1..100.
- **R1.4** When an authenticated admin without `admin.tenant:view` requests the tenant list, the system shall respond with HTTP 403 and no tenant payload.

### Requirement 2: Tenant detail and profile edit
**Objective:** As a platform admin, I want tenant detail and limited profile edits, so that operations can correct store metadata without tenant self-service.

#### Acceptance Criteria
- **R2.1** When an authenticated admin with `admin.tenant:view` requests a tenant by ID, the system shall return that tenant plus aggregate counts: `users` = `_count.users`, `subscriptions` = `_count.subscriptions`, `openTickets` = count of `supportTickets` where status is `OPEN` or `IN_PROGRESS`.
- **R2.2** When the tenant ID does not exist or is soft-deleted, the system shall respond with HTTP 404.
- **R2.3** When an authenticated admin with `admin.tenant:edit` updates allowed fields (`name`, `tenantType`, `mode`, `logoUrl`), the system shall persist only those fields, reject unknown fields, and require a matching `expectedUpdatedAt` (or `If-Match`) equal to the current row `updatedAt`; stale values shall yield HTTP 409 with no mutation.
- **R2.4** When an edit request contains a blank `name`, invalid enum value, or invalid `logoUrl` (non-HTTPS, length > 2048, or disallowed scheme/host), the system shall respond with HTTP 400 and leave the tenant unchanged.
- **R2.5** When a tenant profile is successfully updated, the system shall write an audit row via `AuditLogger.run` (same Prisma transaction) with actor, action `TENANT_UPDATE`, target tenant ID, before/after snapshots, IP, and user agent (UA max 512 chars).

### Requirement 3: Tenant lifecycle status transitions
**Objective:** As a platform admin, I want controlled tenant status transitions, so that support and compliance can suspend or lock tenants without free-form status mutation.

#### Acceptance Criteria
- **R3.1** When an authenticated admin with `admin.tenant:approve` requests a status transition, the system shall accept only the allowed transitions: `ACTIVE->SUSPENDED`, `ACTIVE->LOCKED`, `SUSPENDED->ACTIVE`, `SUSPENDED->LOCKED`, `LOCKED->ACTIVE`, applied as an atomic conditional update on current DB status and `deletedAt IS NULL`.
- **R3.2** When a requested transition is unsupported, is a no-op, or loses a concurrent race (affected_rows = 0 on an existing non-deleted row), the system shall respond with HTTP 409 and leave status unchanged.
- **R3.3** When a status transition succeeds, the system shall update `status` and write an audit row via `AuditLogger.run` with action `TENANT_STATUS_CHANGE`, previous status, next status, actor, optional `reason` (max 500 chars, CRLF stripped), and request metadata.
- **R3.4** When an authenticated admin without `admin.tenant:approve` requests a status transition, the system shall respond with HTTP 403.
- **R3.5** The system shall not expose tenant hard-delete or soft-delete endpoints in this feature.
- **R3.6** Status changes in this feature are metadata-only: the system shall not invalidate tenant sessions, flush Redis, or deny tenant-scoped API access as a side effect of the status write.

### Requirement 4: Tenant export
**Objective:** As a platform admin, I want a permissioned CSV export of the filtered tenant list, so that operations can analyze tenants offline without unbounded data egress.

#### Acceptance Criteria
- **R4.1** When an authenticated admin with `admin.tenant:export` requests export, the system shall return CSV content using the same filter semantics as the list endpoint.
- **R4.2** The system shall include only the columns `id,slug,name,tenantType,mode,status,createdAt,updatedAt`, refuse any client-provided column list, and neutralize formula injection by prefixing cell values that start with `=`, `+`, `-`, or `@` with a single quote.
- **R4.3** When a bounded fetch of 10,001 rows returns 10,001 matches, the system shall respond with HTTP 413 and write no export file payload.
- **R4.4** When an export succeeds, the system shall write an audit row with action `TENANT_EXPORT` recording filter summary, row count, actor, and request metadata **before** sending the CSV body.
- **R4.5** When an authenticated admin without `admin.tenant:export` requests export, the system shall respond with HTTP 403.

### Requirement 5: Permission creation and enforcement
**Objective:** As a security owner, I want tenant-management permissions created and enforced on every operation, so that least-privilege roles cannot access unauthorized tenant actions.

#### Acceptance Criteria
- **R5.1** The system shall ensure the permission codes `admin.tenant:view`, `admin.tenant:edit`, `admin.tenant:approve`, and `admin.tenant:export` exist in the permission catalog used by admin RBAC, with seed grants: SUPER_ADMIN via guard bypass, SUPPORT receives all four tenant codes, BILLING receives none, custom roles receive none by default.
- **R5.2** The system shall map tenant operations as follows: list/detail -> `admin.tenant:view`; profile edit -> `admin.tenant:edit`; status transition -> `admin.tenant:approve`; export -> `admin.tenant:export`.
- **R5.3** When a route is missing required permission metadata or the caller lacks the required permission, the system shall deny by default with HTTP 403.
- **R5.4** When the caller holds SUPER_ADMIN role, the system shall allow the operation through the existing RBAC super-admin bypass rule while still writing audit rows for mutating and export operations.
- **R5.5** The system shall not invent alternate permission code formats such as `tenant:view` or `platform.tenant.view`.
- **R5.6** Before implementing tenant endpoints, the system shall pass an RBAC foundation acceptance test: valid claim allows, missing permission 403, missing decorator metadata fail-closed 403, SUPER_ADMIN bypass with audit, and documented behavior for a token issued before role removal on export/status.

### Requirement 6: Admin frontend tenant management
**Objective:** As a platform operator, I want a gated admin UI at `/admin/cua-hang`, so that I can manage tenants through the existing admin shell.

#### Acceptance Criteria
- **R6.1** When an authenticated admin with `admin.tenant:view` opens `/admin/cua-hang`, the system shall render a tenant list with filters, pagination, and row navigation to detail.
- **R6.2** When an authenticated admin without `admin.tenant:view` opens `/admin/cua-hang`, the system shall deny access using the existing admin unauthorized path.
- **R6.3** When an admin has `admin.tenant:edit` or `admin.tenant:approve`, the UI shall expose only the corresponding edit/status actions; missing permissions shall hide those controls.
- **R6.4** When an admin has `admin.tenant:export`, the UI shall expose an export action that downloads the CSV from the backend; missing permission shall hide export.
- **R6.5** When a backend call returns 403/404/409/413, the UI shall show a non-sensitive error message and leave prior tenant data intact.

### Requirement 7: Performance and reliability
**Objective:** As a system owner, I want predictable list/detail/export behavior, so that the admin console remains usable under expected platform load.

#### Acceptance Criteria
- **R7.1** The system shall complete list and detail responses within 500ms p95 for datasets up to 10,000 tenants under local verification conditions.
- **R7.2** The system shall use indexed filters (`status`, `deletedAt`) and avoid loading full relation graphs on list endpoints.
- **R7.3** If a database write fails during profile edit or status transition, the system shall roll back the tenant mutation and the paired audit write as one transaction.

### Requirement 8: Security and privacy
**Objective:** As a security stakeholder, I want server-side authorization, stable denial responses, and auditable mutations, so that tenant data is protected.

#### Acceptance Criteria
- **R8.1** The system shall enforce authorization only on the server for every tenant endpoint using `AccessTokenGuard` and `PermissionGuard`.
- **R8.2** If authorization fails, the system shall not include tenant payload fields in the error body.
- **R8.3** The system shall never log passwords, tokens, or full request bodies containing secrets while handling tenant management requests.
- **R8.4** The system shall require object-level existence checks for detail/edit/status endpoints so guessed IDs do not leak data beyond 404/403 outcomes.
