# Requirements — livestock-cas-recovery

## Goal

Close Luồng B: explicit livestock recovery + consistent ProductBatch CAS when qty mutates via adjustment/full returns, without inventing partial-return scope.

## EARS

### R1 — Recovery gate

WHEN tenant user with `inventory:edit` requests health transition from `QUARANTINED` or `SICK` to `HEALTHY` with `approveRecovery=true` and matching `expectedVersion`, THE system SHALL apply transition, increment `version`, and write `LIVESTOCK_STATE_CHANGE` audit in same serializable transaction.

### R2 — Recovery deny without flag

WHEN recovery target is `HEALTHY` from `QUARANTINED`/`SICK` without `approveRecovery=true`, THE system SHALL reject with `INVALID_TRANSITION` (or dedicated `RECOVERY_NOT_APPROVED`) and SHALL NOT mutate batch or audit.

### R3 — Terminal non-recovery

WHEN source state is `DEAD` or `REJECTED`, THE system SHALL reject any transition including to `HEALTHY`, regardless of `approveRecovery`.

### R4 — Existing outbound transitions

WHEN source is `HEALTHY` and target is `QUARANTINED|SICK|DEAD|REJECTED`, THE system SHALL keep first-slice behavior (CAS + audit); `approveRecovery` not required.

### R5 — Adjustment CAS

WHEN stock-adjustment complete decrements or increments an existing ProductBatch `qtyOnHand`, THE system SHALL condition update on current `version` (and sufficient qty for decrease), then increment `version`. Concurrent version change SHALL surface as conflict/stale (`STALE_VERSION` or serialization retry path).

### R6 — Full return CAS

WHEN full sales return increments allocated batch qty, or full purchase return decrements line batch qty, THE system SHALL CAS on `version` (+ qty for decrease) and increment `version`.

### R7 — Sell invariant

THE system SHALL keep FEFO eligibility restricted to `healthState=HEALTHY` (no sell of QUARANTINED/SICK/DEAD/REJECTED via batch path).

### R8 — Tenant scope

ALL mutations SHALL filter by auth `tenantId`; never trust body tenant.

## Non-goals

- Partial return line contracts (document as dependency for later)
- Frontend maps
- New permission string (reuse `inventory:edit`)
