# Task R0-01: Schema, seed, and audit foundation

**Requirement:** R0 — persistence and authorization foundation
**Status:** pending
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** none
**Spec:** specs/admin-plan-subscription-management/

## Context

Existing Prisma models cover plans/features/subscriptions, but manual reference/reason metadata, billing audit actions, plan permissions, and effective-subscription indexes are not defined. Prepare the additive migration and idempotent seeds used by every later task.

## Constraints

- **MUST** preserve all existing plan, subscription, feature-flag, and tenant data.
- **MUST** add migration artifacts, not only edit `schema.prisma`; use `AuditLogger.run` for later mutations.
- **SHOULD** keep plan code immutable and use existing enum/seed conventions.
- **MUST NOT** add Stripe/payment automation or delete duplicate historical subscriptions.
- **SCOPE** foundation only; no admin endpoints.

## Steps

- [ ] 1. Extend `backend/prisma/schema.prisma` and create a timestamped migration for manual subscription reference/reason metadata, effective lookup indexes, and `PLAN_*`/`SUBSCRIPTION_*` audit actions.
  - Validate nullability/length at DTO/service boundary and keep rollback/forward-compatible deployment ordering.
  - _Requirements: 9.3_
- [ ] 2. Update `backend/prisma/seed-admin-rbac.ts` with the canonical six permission codes and exact matrix: SUPER_ADMIN bypass; SUPPORT `admin.subscription:view`; BILLING all plan/subscription permissions; custom roles none.
  - Add an idempotent catalog seed/fixture in `backend/prisma/seed.ts` only where needed; do not overwrite operator-edited plan data. Generate a pre-migration duplicate active/trial subscription report and record the operator resolution path before any uniqueness constraint.
  - _Requirements: 1.1, 9.1_
- [ ] 3. Verification implementation: update schema/audit/seed tests or add `backend/src/platform/billing/billing-foundation.spec.ts` to prove migration compatibility, permission catalog, bounded manual fields (reference 200/reason 500), duplicate report, and valid audit enum values.
  - _Requirements: 4.1, 4.2, 9.3_

## Requirements

- 1.1 — plan input and feature/permission foundation
- 4.1, 4.2 — audit vocabulary and transactional foundation
- 9.1, 9.3 — least privilege and compatible migration

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Add manual lifecycle metadata, indexes, and billing audit enum members |
| `backend/prisma/migrations/20260719000200_admin_billing_foundation/migration.sql` | Create | Additive SQL migration |
| `backend/prisma/seed-admin-rbac.ts` | Modify | Seed billing permission catalog/grants |
| `backend/prisma/seed.ts` | Modify | Preserve/extend idempotent plan-feature fixtures |
| `backend/src/platform/audit/audit-logger.service.ts` | Read | Reuse `run(input, stateChange)` contract |
| `backend/src/platform/billing/billing-foundation.spec.ts` | Create | Migration/seed/audit contract tests |

## Completion Criteria

- [ ] Migration is additive, reversible/forward-compatible, and Prisma client exposes all new fields/actions.
- [ ] All six permission codes are seeded idempotently with no privilege granted to BILLING unless explicitly mapped by the chosen matrix.
- [ ] Existing data remains readable and foundation tests prove audit enum/transaction API compatibility.
- [ ] No endpoint or UI is added in this foundation task; later tasks reference the new contracts.

## Evidence

- [ ] Automated verification
  - Command(s): `cd backend && pnpm prisma:generate && pnpm build && pnpm test -- --runInBand`
  - Expected proof: Prisma generation, build, and tests pass; migration/seed contract tests pass.
- [ ] Artifact / runtime verification
  - Inspect: `backend/prisma/schema.prisma`, migration SQL, and `seed-admin-rbac.ts`.
  - Expect: additive columns/indexes, `PLAN_*`/`SUBSCRIPTION_*`, and exact permission codes.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `backend/src/app.module.ts` and later `BillingModule` registration in R1-01/R1-02.
  - Expect: generated Prisma client and seed scripts are usable by the billing module.
- [ ] Contract / negative-path verification
  - Check: duplicate code, invalid enum, and migration against existing rows.
  - Expect: no partial write; invalid input fails before mutation/audit.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Migration conflicts with existing schema | High | Additive SQL, inspect existing rows, deploy before app code |
| Permission seed drift | High | Idempotent upsert and explicit grant-matrix test |

---

> **Requirement mapping:** Every sub-task ends with `_Requirements: X.X_`.
