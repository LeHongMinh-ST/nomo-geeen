# Red Team Review — 2026-07-19

**Review mode:** Red Team → Validate (9 task files; schema, permission, billing, and security keywords)
**Reviewers:** Security Adversary, Failure Mode Analyst, Assumption Destroyer, Scope & Complexity Critic
**Findings:** 8 (8 accepted, 0 rejected)

## Finding 1: PAST_DUE can accidentally grant entitlement
- **Severity:** Critical
- **Location:** `design.md`, Canonical Contracts & Invariants, invariant 3
- **Flaw:** The effective-subscription rule excludes cancelled rows but does not explicitly exclude the existing `PAST_DUE` status.
- **Failure scenario:** A legacy or future row marked `PAST_DUE` has a future `endDate`; the evaluator treats it as active and a tenant uses features without a valid paid/trial state.
- **Evidence:** “latest non-cancelled effective row whose start/end/trial dates include now” and the existing schema enum includes `PAST_DUE`.
- **Suggested fix:** Define effective statuses as `ACTIVE` and `TRIALING` only; return `PAST_DUE` as a denial state unless a later approved policy changes it.
- **Disposition:** Accept
- **Rationale:** Prevents an implicit billing-status bypass.

## Finding 2: Plan edit semantics for existing subscribers are implicit
- **Severity:** High
- **Location:** `requirements.md` R1.2 and `design.md`, Persistence and migration
- **Flaw:** Editing a plan's features/quotas can change current subscriber entitlements, but the spec does not state whether this is immediate or versioned.
- **Failure scenario:** An operator removes a feature from a plan and an active tenant loses access without a visible lifecycle event or a defined snapshot rule.
- **Evidence:** “update ... feature membership atomically” plus evaluator reads current plan relation.
- **Suggested fix:** Choose immediate effect, include before/after plan snapshots in the plan audit, and state that no separate plan versioning is introduced in this scope.
- **Disposition:** Accept
- **Rationale:** Makes the manual operator consequence explicit while keeping YAGNI.

## Finding 3: Quota atomicity is underspecified for monthly orders and aggregate counts
- **Severity:** Critical
- **Location:** `design.md`, Effective entitlement flow and `task-R1-03-entitlement-enforcement-integration.md` Step 2
- **Flaw:** “Transaction or conditional write” does not identify the lock/conditional predicate for count-based resources.
- **Failure scenario:** Two concurrent creates both read usage 9/10 and both commit, producing 11/10 despite tests passing in serial execution.
- **Evidence:** “usage + requested delta + mutation are atomic” but no row lock, counter, serializable isolation, or conditional update is named.
- **Suggested fix:** Require a transaction with the tenant row (or quota counter) locked/conditionally updated and define the isolation/serialization strategy per resource; monthly orders use a period-scoped counter/conditional insert.
- **Disposition:** Accept
- **Rationale:** This is a core completion criterion, not an implementation detail that can remain ambiguous.

## Finding 4: No explicit tenant identity contract for the guard
- **Severity:** High
- **Location:** `design.md`, Effective entitlement flow; `task-R0-02-entitlement-quota-foundation.md` Step 2
- **Flaw:** The guard reads “tenant identity from the request contract” but neither the request property nor trusted source is defined.
- **Failure scenario:** A caller supplies a route/body tenant ID instead of the authenticated tenant context and accesses another tenant's plan or quota.
- **Evidence:** No named `request.tenantId`/token claim contract and no prohibition on client-controlled tenant IDs.
- **Suggested fix:** Define `request.tenantId` as server-derived from the authenticated tenant identity; reject missing/mismatched route/body IDs and never trust a client-only tenant ID.
- **Disposition:** Accept
- **Rationale:** Cross-tenant isolation is security-critical.

## Finding 5: Manual reference and reason storage/logging limits are not canonical
- **Severity:** Medium
- **Location:** `requirements.md` R3.1/R4.1 and `design.md`, SubscriptionMutation contract
- **Flaw:** The contract includes manual reference/reason but does not state max lengths, CRLF handling, or whether values are safe to persist/audit.
- **Failure scenario:** Very large or newline-containing operator input bloats audit rows or corrupts log exports/forensic displays.
- **Evidence:** “manual billing note/reference” and “reason/reference where supplied” without limits.
- **Suggested fix:** Set concrete limits (reference 200 chars, reason 500 chars), trim, reject/control-strip CRLF, and explicitly exclude payment credentials/secrets.
- **Disposition:** Accept
- **Rationale:** Existing tenant audit patterns already bound reason/user-agent; billing needs the same discipline.

## Finding 6: Performance requirement has no executable dataset setup
- **Severity:** High
- **Location:** `requirements.md` R8.2 and `task-R3-01-backend-acceptance-tests.md` Step 3
- **Flaw:** The 100,000-row p95 requirement references an integration environment without specifying fixture generation, measurement method, or acceptable warm-up.
- **Failure scenario:** Teams omit the performance proof or report a meaningless single local request as passing.
- **Evidence:** “100,000 subscriptions under the repository's integration-test environment” and “where feasible”.
- **Suggested fix:** Require a deterministic seed script/fixture, 30 warm-up + 100 measured requests, p95 from the same process, and record environment; if CI cannot support it, record an explicit blocked evidence item.
- **Disposition:** Accept
- **Rationale:** Keeps the measurable NFR verifiable.

## Finding 7: Existing duplicate active subscriptions need a concrete operational result
- **Severity:** High
- **Location:** `research.md`, Remaining Gaps; `design.md`, Persistence and migration
- **Flaw:** The spec says to inspect duplicates and select deterministically but does not require a report or define whether migration may change their status.
- **Failure scenario:** Deployment produces a different effective subscription per environment or a uniqueness migration fails on existing rows.
- **Evidence:** “may allow multiple active records” and “inspect ... handle duplicates” without a migration acceptance artifact.
- **Suggested fix:** Require pre-migration duplicate report, deterministic latest-row selection, no destructive deletion, and a documented operator resolution path before any uniqueness constraint.
- **Disposition:** Accept
- **Rationale:** Protects existing tenants and makes migration reviewable.

## Finding 8: Billing permission grant matrix is ambiguous
- **Severity:** High
- **Location:** `task-R0-01-schema-seed-audit-foundation.md` Step 2 and `task-R1-01-plan-catalog-api.md` Constraints
- **Flaw:** The task says “BILLING unless explicitly mapped” while the canonical permission block names permissions but not the exact default role grants.
- **Failure scenario:** A seed implementation grants subscription mutation to SUPPORT or BILLING inconsistently, violating least privilege.
- **Evidence:** “no privilege granted to BILLING unless explicitly mapped” is not a selected matrix.
- **Suggested fix:** Set default matrix: SUPER_ADMIN guard bypass; SUPPORT view-only tenant subscription; BILLING all plan/subscription view+mutation; custom roles no defaults; plan activation/edit remain distinct codes.
- **Disposition:** Accept
- **Rationale:** Removes a user-visible authorization ambiguity before implementation.

## Reconciliation

All accepted findings were propagated to `requirements.md`, `design.md`, and the affected task files. No implementation source files were created by this review.
