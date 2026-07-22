# Red Team Review - 2026-07-22

**Scope:** tenant-sales-order-management (8 tasks; security, migration, inventory, debt, concurrency).
**Findings:** 4 (4 accepted, 0 rejected)

## Finding 1: Compensation must preserve original references
- **Severity:** High
- **Location:** design.md, Canonical Contracts & Invariants, Cancellation
- **Flaw:** A compensating movement/ledger can be duplicated if implementation keys only on status.
- **Failure scenario:** A retry after an ambiguous commit appends compensation twice before observing terminal state.
- **Evidence:** The contract requires terminal replay but does not name effect-reference uniqueness.
- **Suggested fix:** Require replay lookup by order plus refType/refId and line reference before effects; test duplicate prevention.
- **Disposition:** Accept
- **Rationale:** Makes exact-once compensation implementation-checkable.
- **Applied To:** design.md and task-R3-01 evidence/steps.

## Finding 2: Direct completion must not create a draft first
- **Severity:** High
- **Location:** task-R2-01, Steps 2-3
- **Flaw:** Direct completion can accidentally expose a partially persisted draft if split across transactions.
- **Failure scenario:** The first transaction commits the order, then stock fails in a second transaction.
- **Evidence:** Requirement 2.4 requires completion invariants within the creation transaction.
- **Suggested fix:** Keep direct create and all effects in one Serializable transaction.
- **Disposition:** Accept
- **Rationale:** Already expressed as the target invariant; retained as an implementation gate.
- **Applied To:** task-R2-01 Completion Criteria/Evidence.

## Finding 3: Shared customer picker can regress quick sale
- **Severity:** Medium
- **Location:** task-R4-01, Risk Assessment
- **Flaw:** Replacing seed selection affects /ban-nhanh.
- **Failure scenario:** Anonymous-customer or selected-customer quick sale loses behavior.
- **Evidence:** CustomerPicker is shared by quick-sale and order form.
- **Suggested fix:** Add quick-sale consumer regression to the acceptance task.
- **Disposition:** Accept
- **Rationale:** Existing task risk is propagated to final acceptance.
- **Applied To:** task-R7-01 frontend acceptance scope.

## Finding 4: Browser/database blockers can hide missing proof
- **Severity:** High
- **Location:** task-R7-01, Evidence and Risk Assessment
- **Flaw:** Build success alone cannot prove runtime reachability.
- **Failure scenario:** E2E infrastructure is unavailable and release is incorrectly marked ready.
- **Evidence:** R8.3 requires E2E and R7-01 explicitly requires blocker recording.
- **Suggested fix:** Keep readiness false unless runtime proof exists.
- **Disposition:** Accept
- **Rationale:** Explicitly prevents false completion.
- **Applied To:** task-R7-01 Completion Criteria and Runtime reachability verification.

## Reconciliation

All accepted findings are represented in implementation-facing task/design sections. Deterministic validator is required before any implementation handoff.
