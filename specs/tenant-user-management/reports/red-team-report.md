# Red Team Review — 2026-07-20

**Scope:** `specs/tenant-user-management/`
**Review mode:** Red Team + deterministic validation
**Findings:** 4 (4 accepted, 0 rejected)
**Severity breakdown:** 1 Critical, 3 High

## Finding 1: Missing audit vocabulary for required lifecycle actions

- **Severity:** Critical
- **Location:** Requirements R5.1; Design “Data and audit”; Task R1-01 “Completion Criteria”
- **Flaw:** The current schema has `USER_CREATE` but no dedicated actions for profile update, role change, deactivate/reactivate, or reset password, while the requirement demands audit rows for all of them.
- **Failure scenario:** The feature ships with generic or missing audit rows, so operators cannot prove who changed a staff role, disabled an account, or reset a password.
- **Evidence:** `backend/prisma/schema.prisma` currently lists `USER_CREATE` but no other `USER_*` lifecycle actions.
- **Suggested fix:** Add only the minimal additive enum/migration actions and require their runtime receipt.
- **Disposition:** Accept
- **Rationale:** Directly required by base spec §3.8.4 and existing audit contract.
- **Applied To:** `requirements.md` R5.1; `design.md` Data and audit; `task-R1-01`; `task-R3-01`.

## Finding 2: Existing admin endpoint could be accidentally reused with the wrong realm

- **Severity:** High
- **Location:** Task R0-01 “Constraints” and “Completion Criteria”; Design API contract
- **Flaw:** The existing `/admin/tenants/:tenantId/users` service is similar enough to tempt frontend reuse, but it requires platform-admin identity and `admin.*` permissions.
- **Failure scenario:** A tenant user page calls the admin endpoint and receives 401/403, or a future relaxation leaks a platform-admin boundary.
- **Evidence:** Research states the current controller is guarded by admin auth; Design mandates `/tenant/users` and separate admin behavior.
- **Suggested fix:** Keep separate tenant routes/controllers and add cross-realm negative tests.
- **Disposition:** Accept
- **Rationale:** Prevents auth realm confusion and preserves the admin contract.
- **Applied To:** `research.md` decisions; `design.md` API contract; `task-R0-01` evidence.

## Finding 3: UI-only role gating would permit privilege escalation

- **Severity:** High
- **Location:** Requirements R3.1/R3.5; Design Authorization matrix; Task R1-01 “Steps”
- **Flaw:** Permission-based UI gating alone cannot express “Manager cannot target Owner” or last-owner rules.
- **Failure scenario:** A crafted request changes or disables an OWNER despite hidden buttons.
- **Evidence:** Design requires current database actor/target role comparison and Task R1-01 requires server-side role tests.
- **Suggested fix:** Enforce actor/target role checks in the service and cover crafted requests.
- **Disposition:** Accept
- **Rationale:** Tenant authorization is security-critical and must fail closed server-side.
- **Applied To:** `requirements.md` R3; `design.md` Authorization matrix; `task-R1-01` completion/evidence.

## Finding 4: Quota state can race between UI and server

- **Severity:** High
- **Location:** Requirements R2.3/R4.3; Design Seat invariant; Task R1-01 “Constraints”
- **Flaw:** Seat availability shown in the UI is only advisory and can become stale before create/reactivate.
- **Failure scenario:** Two sessions both see one remaining seat and both create users, exceeding the plan limit.
- **Evidence:** Requirements require a serializable server-side re-check; UI task requires surfacing server race errors.
- **Suggested fix:** Keep checks inside serializable transactions and add concurrent integration coverage.
- **Disposition:** Accept
- **Rationale:** Directly protects the quota invariant.
- **Applied To:** `requirements.md` R2.3/R4.3; `design.md` Seat invariant; `task-R1-01` criteria/evidence.

## Reconciliation

- `node .claude/scripts/validate-spec-output.cjs specs/tenant-user-management` — PASS.
- `node .opencode/scripts/validate-spec-output.cjs specs/tenant-user-management` — PASS.
- All accepted findings are propagated into implementation-facing requirements/design/tasks.
