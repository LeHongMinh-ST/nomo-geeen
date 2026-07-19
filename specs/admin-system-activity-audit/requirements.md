# Admin System Activity Audit Requirements

## Introduction

The Platform Admin portal shall expose the existing `audit_log` history as a searchable, permission-gated activity view. The feature covers platform-admin observability; it does not replace infrastructure logs or introduce a log shipping/SIEM provider.

## Requirements

### Requirement 1: Audit query and detail

**Objective:** As a Platform Admin, I want to browse and inspect audited activity, so that I can investigate changes made in the system.

- **R1.1** When an authorized admin requests `GET /admin/audit-logs`, the Audit Query Service shall return newest-first records with stable ordering `(createdAt DESC, id DESC)` and `page`, `pageSize`, `total`, and `items` fields.
- **R1.2** When query filters are supplied, the Audit Query Service shall apply validated filters for date range, actor type/id, tenant id, action, resource, and resource id before pagination.
- **R1.3** If `pageSize` is below 1 or above 100, the API shall clamp it to the inclusive range 1..100; invalid date or enum filters shall return HTTP 400.
- **R1.4** When an authorized admin requests `GET /admin/audit-logs/:id`, the API shall return one event object (not a paginated list envelope) including actor, tenant, resource, timestamp, and sanitized before/after data.
- **R1.5** If the audit id does not exist, the API shall return HTTP 404 without exposing database details.

### Requirement 2: Access control and privacy

**Objective:** As a security owner, I want audit data protected and sanitized, so that operational history does not become a secret-leak channel.

- **R2.1** While serving either audit endpoint, the backend shall require `AccessTokenGuard`, `PermissionGuard`, and permission `admin.audit:view`; the seed shall grant this permission to `SUPER_ADMIN` and `SALER` only unless an approved RBAC change says otherwise.
- **R2.2** If an unauthenticated or unauthorized caller requests either endpoint, the backend shall return HTTP 401 or 403 and shall not return audit rows.
- **R2.3** The API shall omit password hashes, raw access/refresh tokens, refresh cookies, secrets, and equivalent credential material from list and detail responses, including nested JSON before/after values.
- **R2.4** The API shall preserve tenant and actor identifiers needed for investigation while avoiding raw credential or session material; audit query access is platform-admin scoped, not tenant-user scoped.

### Requirement 3: Audit coverage and consistency

**Objective:** As an operator, I want the activity view to reflect supported admin mutations, so that the screen is not misleading.

- **R3.1** The audit action catalog shown by the feature shall cover every current `AuditAction` enum value, including authentication, RBAC, tenant, user, plan, subscription, and provisioning actions.
- **R3.2** Existing admin mutation services that already emit audit rows shall remain transactionally consistent; this feature shall not weaken same-transaction audit guarantees.
- **R3.3** The implementation shall document coordination with `admin-tenant-provisioning` so that `TENANT_CREATE` and `USER_CREATE` rows become visible without duplicating their mutation logic.

### Requirement 4: Admin frontend experience

**Objective:** As a Platform Admin, I want a clear responsive activity screen, so that I can investigate from desktop or phone.

- **R4.1** When an authorized admin opens `/admin/audit-log`, the page shall load real API data, display loading/empty/error states, and provide pagination without static placeholder activity rows.
- **R4.2** The page shall provide filters for time range, action, actor type, tenant, resource, and free-text resource/actor lookup, with a reset action.
- **R4.3** On desktop the page shall use a readable table/list; on mobile it shall use stacked event cards without requiring horizontal scrolling for core event information.
- **R4.4** When an admin opens an event detail action, the UI shall present before/after data in an accessible drawer or route, with sensitive fields already masked by the API.
- **R4.5** The page shall follow `DESIGN.md`: Be Vietnam Pro/Inter fallback, existing admin module accent palette, white/near-white surfaces, minimum 48px controls, visible keyboard focus, semantic labels, and no color-only status meaning.

### Requirement 5: Dashboard activity integration

**Objective:** As a Platform Admin, I want the dashboard activity panel to be trustworthy, so that it reflects the same source as the full log.

- **R5.1** When the admin dashboard loads, “Hoạt động gần đây” shall read the newest activity records from the audit query contract rather than a hard-coded array.
- **R5.2** If the dashboard activity request fails or has no records, the dashboard shall show an explicit empty/error state without inventing activity.
- **R5.3** Selecting the dashboard activity section shall provide a reachable path to `/admin/audit-log`.

### Requirement 6: Performance and scalability

**Objective:** As a system owner, I want predictable audit browsing performance, so that the feature remains usable as history grows.

- **R6.1** In the project PostgreSQL acceptance fixture containing at least 100,000 audit rows, a filtered first-page query of 20 rows shall complete within 500ms at the service boundary; the verification receipt shall record runtime and database versions.
- **R6.2** The API shall cap one response at 100 items and shall never load all matching audit rows into application memory.
- **R6.3** The query shall use stable indexed ordering/filtering and shall return `total` consistently with the applied filters.

### Requirement 7: Reliability, accessibility, and verification

**Objective:** As a maintainer, I want the feature verified at API and UI boundaries, so that regressions are detectable.

- **R7.1** If PostgreSQL is unavailable during an audit query, the API shall return the project’s standard 5xx error envelope and shall not return partial fabricated data.
- **R7.2** The UI shall support keyboard navigation for filters, pagination, and detail disclosure, with accessible names and visible focus states.
- **R7.3** The implementation shall include backend unit/integration coverage for filters, pagination, permission denial, not-found, and masking, plus an end-to-end/admin UI reachability check.
