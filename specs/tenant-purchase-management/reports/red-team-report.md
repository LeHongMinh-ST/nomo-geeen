# Red Team Review — 2026-07-21

**Findings:** 5 (4 accepted, 1 rejected)
**Severity breakdown:** 1 Critical, 3 High, 1 Medium

## Finding 1: Retry identity was not a contract
- **Severity:** Critical
- **Location:** design.md, Canonical Contracts & Invariants and Migration Strategy
- **Flaw:** The design said implementation should choose a retry identity later.
- **Failure scenario:** Two concurrent completion requests have different generated document numbers and both apply inbound stock.
- **Evidence:** “Define a concrete retry identity before coding” and “migration-free only if the retry contract remains race-safe.”
- **Suggested fix:** Approve Purchase.idempotencyKey with a tenant-scoped unique constraint and require canonical payload comparison.
- **Disposition:** Accept
- **Rationale:** This is required for the critical-path no-duplicate invariant.

## Finding 2: Moving-average cost allocation was ambiguous
- **Severity:** High
- **Location:** design.md, Data Models
- **Flaw:** Discount and shipping allocation was described as a default rather than a deterministic rule.
- **Failure scenario:** Two implementers produce different avgCost for the same multi-line receipt.
- **Evidence:** “equal proportional allocation by line subtotal is the default.”
- **Suggested fix:** Define proportional allocation order, integer rounding, and remainder handling.
- **Disposition:** Accept
- **Rationale:** Cost is persisted financial/inventory state and needs one formula.

## Finding 3: Inventory read boundary was initially permissive
- **Severity:** High
- **Location:** task-R2-02, Steps 1
- **Flaw:** The task allowed either product/stock or inventory endpoint.
- **Failure scenario:** Backend and frontend choose incompatible response shapes and the route remains partially seed-backed.
- **Evidence:** “tenant product/stock or inventory endpoint.”
- **Suggested fix:** Use the canonical GET /tenant/inventory and GET /tenant/inventory/:productId endpoints from design.md.
- **Disposition:** Accept
- **Rationale:** A contract-sensitive vertical slice cannot leave the entrypoint ambiguous.

## Finding 4: Permission code discovery was deferred too late
- **Severity:** High
- **Location:** design.md, Canonical Contracts & Invariants; task-R0-01, Step 2
- **Flaw:** Exact permission strings were not named in the canonical table.
- **Failure scenario:** The UI is wired to routes that always return 403 because seed/catalog codes differ.
- **Evidence:** “Exact codes must be confirmed from the catalog before implementation.”
- **Suggested fix:** Keep catalog discovery as a blocking foundation step and prohibit invented codes; record exact resolved strings in the task receipt.
- **Disposition:** Accept
- **Rationale:** The repository is the source of truth, so discovery is valid only when blocking and evidenced.

## Finding 5: Supplier CRUD is broader than the purchase critical path
- **Severity:** Medium
- **Location:** spec.json scope_lock and task-R1-02
- **Flaw:** Expand scope includes supplier CRUD, increasing blast radius.
- **Failure scenario:** Supplier maintenance delays purchase delivery and introduces unrelated behavior.
- **Evidence:** User explicitly selected “Expand”; scope includes supplier CRUD and task-R1-02 isolates it.
- **Suggested fix:** Keep supplier CRUD as a separate bounded task and do not add payment/history features.
- **Disposition:** Reject
- **Rationale:** The user explicitly approved Expand; task isolation is sufficient YAGNI control.

## Applied Fixes

- design.md: fixed Purchase.idempotencyKey migration/unique contract and canonical payload replay rule.
- design.md: fixed moving-average cost allocation and integer rounding rule.
- requirements.md: recorded the approved idempotency migration decision.
- task-R0-01: remains the blocking permission/retry foundation task.
- task-R2-02: implementation must use the canonical inventory endpoints from design.md.
