# Requirements Document

## Introduction

NomoGreen already stores plan, feature, plan-feature, subscription, and tenant-feature-flag records, but no admin workflow owns their lifecycle and no shared backend entitlement check protects tenant operations. This spec adds a manual billing control plane. Admins manage the catalog and subscription state; payment collection remains an offline sales process. Entitlements are evaluated from the one effective subscription and plan configuration at request time.

## Requirements

### Requirement 1: Plan catalog management

**Objective:** As an authorized platform admin, I want to manage plans and their capabilities, so that available offerings are explicit and editable without code changes.

#### Acceptance Criteria

- **R1.1** When an admin with the plan-write permission submits a valid plan, the system shall create a plan with a unique code, non-negative VND price, one billing cycle, positive integer quotas or explicit unlimited values, and the selected existing feature codes.
- **R1.2** When an admin edits a plan, the system shall update its name, description, price, billing cycle, quotas, active state, and feature membership atomically and shall preserve the plan identifier.
- **R1.3** When an admin deactivates a plan, the system shall prevent new subscription assignment to that plan while preserving existing subscriptions and historical audit data.
- **R1.4** When an admin lists plans, the system shall return active and inactive plans with feature codes and quota values, ordered by `createdAt DESC, id DESC`.
- **R1.5** If a plan code is duplicated or a quota/price is invalid, the system shall reject the mutation with HTTP 400/409 and shall not write a partial plan or audit row.

### Requirement 2: Tenant subscription visibility

**Objective:** As an authorized platform admin, I want to see a tenant's current subscription and history, so that manual billing decisions use an auditable source of truth.

#### Acceptance Criteria

- **R2.1** When an admin requests a tenant detail, the system shall return the effective subscription, plan snapshot fields, lifecycle status, billing cycle, start/end dates, and the tenant's subscription history.
- **R2.2** The system shall define the effective subscription as the single non-cancelled subscription with the greatest `updatedAt`, with `endDate`/`trialEndsAt` evaluated against the request time; if none is effective it shall return an explicit `EXPIRED`/no-entitlement state rather than silently granting access.
- **R2.3** If the tenant is missing or soft-deleted, the system shall return HTTP 404 and no subscription payload.

### Requirement 3: Manual subscription lifecycle

**Objective:** As an authorized billing admin, I want to assign, change, renew, and cancel a tenant subscription manually, so that sales can record offline payment decisions before payment automation exists.

#### Acceptance Criteria

- **R3.1** When an admin assigns a subscription to a tenant, the system shall require an active plan, explicit start and end dates or a trial end date, and a trimmed manual reference of at most 200 characters, then create an `ACTIVE` or `TRIALING` subscription without invoking an external payment provider.
- **R3.2** When an admin changes a tenant's plan, the system shall end the previous effective subscription at the change instant, create the new subscription with the requested dates, and expose both records in history.
- **R3.3** When an admin renews a subscription, the system shall extend its end date from the later of the current end date and request time, without changing the plan or deleting tenant data.
- **R3.4** When an admin cancels a subscription, the system shall set `CANCELLED`, `cancelledAt`, and an operator reason, and shall deny entitlements after the cancellation becomes effective.
- **R3.5** A lifecycle mutation shall use optimistic concurrency (`expectedUpdatedAt` or equivalent) and shall return HTTP 409 on a stale request without changing subscription state.
- **R3.6** The system shall not create Stripe/payment-provider calls, automatic invoice collection, or destructive data cleanup for any manual lifecycle operation.

### Requirement 4: Audit history

**Objective:** As an operator, I want every plan and subscription change recorded, so that manual billing decisions are traceable.

#### Acceptance Criteria

- **R4.1** When a plan or subscription mutation commits, the system shall write one audit event containing actor, role, resource, resource ID, before state, after state, and a trimmed reason of at most 500 characters/reference of at most 200 characters where supplied; control CR/LF characters shall be rejected or stripped.
- **R4.2** The system shall commit each mutation and its audit event in the same database transaction, so a failed mutation cannot leave a success-looking audit row.
- **R4.3** When an unauthorized admin attempts a plan or subscription mutation, the system shall return HTTP 403 and shall not write an audit event or expose the target's sensitive state.

### Requirement 5: Feature entitlement enforcement

**Objective:** As a tenant user, I want backend requests to respect the tenant's plan features, so that unavailable capabilities cannot be used by bypassing the UI.

#### Acceptance Criteria

- **R5.1** When a tenant request declares a required feature code, the backend shall allow it only when the authenticated tenant context has an effective `ACTIVE` or `TRIALING`, non-expired subscription whose plan includes that feature, unless an explicit tenant override grants it; `PAST_DUE` shall not grant access.
- **R5.2** If no effective subscription exists, the subscription is expired/cancelled, or the feature is absent, the backend shall reject the request with a stable machine-readable denial reason and HTTP 403.
- **R5.3** When evaluating a tenant override, the backend shall apply the existing `TenantFeatureFlag` only according to its explicit enabled/disabled value and shall never let a disabled flag grant access.
- **R5.4** Feature checks shall fail closed when the entitlement lookup cannot produce a trustworthy result; they shall not treat an unavailable database result as unlimited access.

### Requirement 6: Quota enforcement and downgrade safety

**Objective:** As a tenant user, I want quotas enforced consistently without losing existing records after downgrade, so that plan changes remain safe and predictable.

#### Acceptance Criteria

- **R6.1** Before a quota-governed create operation, the backend shall compare the current tenant usage plus the requested delta against the effective plan quota and shall reject the write when the result exceeds a finite quota.
- **R6.2** The backend shall support the existing plan quota dimensions (`maxUsers`, `maxWarehouses`, `maxProducts`, `maxCustomers`, `maxOrdersPerMonth`, and `maxStorageBytes`) with explicit unlimited handling only where the stored plan value is null or the contract declares unlimited.
- **R6.3** If a downgrade leaves current usage above a new finite quota, the system shall preserve all existing data, allow reads of existing data, and reject only new writes that would increase the over-quota dimension until usage is within limit.
- **R6.4** The quota check and the protected create mutation shall share a transaction with a locked/conditionally updated tenant or period-scoped quota counter, or an equivalent atomic conditional write, so concurrent requests cannot oversubscribe a finite quota.

### Requirement 7: Admin experience

**Objective:** As a platform admin, I want a clear admin UI for plans and tenant subscriptions, so that manual operations are difficult to misapply.

#### Acceptance Criteria

- **R7.1** The admin UI shall expose plan list/create/edit/activate/deactivate actions only when the current admin has the corresponding permissions and shall show validation errors before submission.
- **R7.2** The tenant detail UI shall show the effective subscription, expiry state, plan quotas/features, history, and manual assign/change/renew/cancel actions with explicit confirmation for destructive lifecycle actions.
- **R7.3** After a successful mutation, the UI shall refresh the affected plan/tenant data and show the resulting status, dates, and audit-relevant reason/reference; failed mutations shall not optimistically change the displayed source of truth.

## Non-Functional Requirements

### Requirement 8: Performance & Scalability

**Objective:** As a platform owner, I want entitlement checks to be predictable, so that every tenant request does not add unbounded database work.

#### Acceptance Criteria

- **R8.1** The effective-entitlement lookup shall use indexed tenant/subscription/plan relations and shall execute no more than two database round trips in the uncached path.
- **R8.2** Plan and subscription admin list endpoints shall cap page size at 100 records and shall return within 500 ms at p95 in a deterministic 1,000-subscription fixture for the current phase, measured after 30 warm-up and 100 recorded requests in the repository's integration-test environment. The fixture may scale to 100,000 rows before production-scale rollout.

### Requirement 9: Security, reliability, and compatibility

**Objective:** As a security and operations stakeholder, I want billing controls and enforcement to be least-privilege, recoverable, and compatible with existing tenants, so that the feature is safe to operate.

#### Acceptance Criteria

- **R9.1** Every admin plan/subscription endpoint shall use `AccessTokenGuard` and `PermissionGuard` with distinct least-privilege permission codes for viewing versus mutation; SUPER_ADMIN behavior shall follow the existing RBAC contract.
- **R9.2** The system shall validate UUIDs, enum values, date ordering, positive/finite numeric limits, reason lengths, and manual reference lengths at the API boundary and shall not log secrets or payment credentials.
- **R9.3** A migration from the current schema shall be additive or provide a rollback path and shall leave existing plans, subscriptions, tenant feature flags, and tenant business data readable.
- **R9.4** Automated tests shall cover expired subscription denial, finite quota overflow denial, downgrade data preservation, plan change history, stale lifecycle mutation, unauthorized mutation, and audit atomicity.
