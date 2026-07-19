# Red Team Review — 2026-07-19

**Review mode:** Red Team → Validate
**Reviewers/lenses:** Security Adversary, Failure Mode Analyst, Assumption Destroyer, Scope & Complexity Critic
**Findings:** 6 (6 accepted, 0 rejected)
**Disposition policy:** Accepted findings were narrow contract/task clarifications and were applied before final validation.

## Finding 1: Same refresh endpoint could mix admin and user realms

- **Severity:** Critical
- **Location:** `design.md`, Canonical Contracts & Invariants, Transport/entrypoints; `task-R3-01-user-session-lifecycle.md`, Step 1
- **Flaw:** Both realms use `/auth/refresh`, but the initial contract did not define how the controller selects a realm.
- **Failure scenario:** A request carries the wrong cookie or both cookies; the server rotates the wrong family or leaks an admin/user distinction.
- **Evidence:** Original contract only stated `POST /auth/refresh` and separate user cookie, without an ambiguity rule.
- **Suggested fix:** Select realm only from distinct cookie names and reject missing/ambiguous cookies; add negative tests.
- **Disposition:** Accept
- **Rationale:** Prevents cross-realm session mutation without adding a new endpoint.
- **Applied To:** `design.md` transport contract; `task-R0-01` and `task-R3-01` steps/evidence.

## Finding 2: SameSite=None requires an explicit CSRF/origin control

- **Severity:** High
- **Location:** `design.md`, Transport/entrypoints; `requirements.md`, R8; `task-R0-01-session-contract-foundation.md`
- **Flaw:** The cross-origin cookie decision used `SameSite=None` but did not require Origin/Referer validation for cookie-authenticated operations.
- **Failure scenario:** A hostile site submits a cross-site refresh request and leverages the browser-attached user cookie.
- **Evidence:** Original contract specified `SameSite=None` for the dev FE/BE topology and had no Origin/Referer acceptance rule.
- **Suggested fix:** Require configured allowed Origin for browser refresh/logout mutation paths and test missing/mismatched origin.
- **Disposition:** Accept
- **Rationale:** Keeps the existing topology while adding a small explicit boundary.
- **Applied To:** `requirements.md` R8.6; `design.md` transport contract; `task-R0-01`, `task-R3-01`, `task-R7-01`.

## Finding 3: Tenant audit scope was not guaranteed by the shared logger contract

- **Severity:** High
- **Location:** `design.md`, Audit contract; `task-R2-01-tenant-login-identity.md`, audit step
- **Flaw:** Tenant auth required `tenantId` audit context while the existing `AuditInput` interface did not declare or persist it.
- **Failure scenario:** LOGIN/LOGOUT rows are written with actorType USER but null tenantId, so admin activity filtering cannot reliably scope the event.
- **Evidence:** Existing `backend/src/platform/audit/audit-logger.service.ts` `AuditInput` has no tenantId field; original design only described tenantId behavior.
- **Suggested fix:** Add optional tenantId to the shared input and both logger write paths, preserving admin callers.
- **Disposition:** Accept
- **Rationale:** Contract-level fix, backward-compatible and required for audit correctness.
- **Applied To:** `design.md` Audit contract; `task-R0-01` steps/related files; R2/R5 mappings.

## Finding 4: Public registration abuse was not throttled

- **Severity:** High
- **Location:** `requirements.md`, R5.1; `task-R1-01-public-registration-backend.md`, registration orchestration step
- **Flaw:** Rate limiting covered failed login but not public registration attempts.
- **Failure scenario:** An attacker floods unique slugs or duplicate identifiers, exhausting Argon2/DB resources before authentication exists.
- **Evidence:** Original R5.1 said “failed tenant login attempts”; registration is public and can invoke password hashing and transactional writes.
- **Suggested fix:** Include failed registration by IP and normalized slug/identifier in the same bounded Redis throttle contract.
- **Disposition:** Accept
- **Rationale:** Reuses existing throttle primitive; no new external provider or persistent table.
- **Applied To:** `requirements.md` R5.1; `design.md` performance notes; `task-R1-01` mapping.

## Finding 5: Forced-password policy could be bypassed by unannotated routes

- **Severity:** High
- **Location:** `requirements.md`, R4.4; `task-R4-01-authorization-password-change.md`, Step 1
- **Flaw:** The initial task said to update tenant controllers “where required” without defining a central enforcement point.
- **Failure scenario:** A newly added business route omits the check and a user with `mustChangePassword=true` performs business actions.
- **Evidence:** Original Step 1 used controller-by-controller wording and had no central policy requirement.
- **Suggested fix:** Require centralized must-change enforcement for tenant business routes, with explicit allowlist for session-maintenance endpoints.
- **Disposition:** Accept
- **Rationale:** Reduces future bypass risk without expanding password recovery scope.
- **Applied To:** `task-R4-01` Step 1 and Requirements/Completion Criteria.

## Finding 6: Final reachability task cited a non-existent route group

- **Severity:** Medium
- **Location:** `task-R7-01-integration-reachability.md`, Related Files
- **Flaw:** The task cited `frontend/app/(user)/layout.tsx`, but the codebase uses `frontend/app/(app)/` for the user application.
- **Failure scenario:** Implementer creates a second route group or fails grounding/runtime integration while the public pages appear complete.
- **Evidence:** `find frontend/app -maxdepth 2 -type d` shows `frontend/app/(app)` and no `(user)` group.
- **Suggested fix:** Point the task at the existing `(app)/layout.tsx` entrypoint.
- **Disposition:** Accept
- **Rationale:** Removes a phantom path and preserves the existing route architecture.
- **Applied To:** `task-R7-01-integration-reachability.md` Related Files.

## Reconciliation

- All accepted findings are present in implementation-facing requirements, canonical contracts, task steps, or task evidence.
- No implementation source files were created by this review.
- Final deterministic validator and grounding checks are required after the validation log is written.
