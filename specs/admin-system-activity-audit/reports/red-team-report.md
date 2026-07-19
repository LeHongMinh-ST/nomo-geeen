## Red Team Review — 2026-07-19

**Reviewers:** Security Adversary, Failure Mode Analyst, Assumption Destroyer, Scope & Complexity Critic.
**Findings:** 7 (7 accepted, 0 rejected)
**Severity breakdown:** 2 High, 5 Medium.

## Finding 1: Detail response contract was ambiguous
- **Severity:** High
- **Location:** `design.md`, “Backend query contract”; Task R1-02, Step 2
- **Flaw:** The named `AuditLogQueryResponse` is a paginated list envelope, while detail was described as the “canonical shape”.
- **Failure scenario:** Backend returns an object but frontend expects `items`, or frontend renders a detail response as a list and fails at runtime.
- **Evidence:** `design.md` originally said “Detail returns the same event fields as the list” while tasks copied only the list contract.
- **Suggested fix:** State that detail returns one event object and update requirement/task wording.
- **Disposition:** Accept
- **Rationale:** Prevents cross-layer contract drift.
- **Applied To:** `requirements.md` R1.4; `design.md` Transport/API contract; Task R1-02.

## Finding 2: Permission grant scope was not explicit
- **Severity:** High
- **Location:** Task R0-01, Step 1 and Requirements
- **Flaw:** “Intended platform admin roles” left the grant set to implementer choice.
- **Failure scenario:** A seed grants audit access to billing/support roles or nobody, causing privilege escalation or unusable UI.
- **Evidence:** Task R0-01 said “grant it only to intended platform admin roles” without naming them.
- **Suggested fix:** Name `SUPER_ADMIN` and `SALER` as the scoped grants.
- **Disposition:** Accept
- **Rationale:** Aligns with `docs/base_spec.md` portal roles and makes seed tests deterministic.
- **Applied To:** `requirements.md` R2.1.

## Finding 3: Performance acceptance lacked runtime identity
- **Severity:** Medium
- **Location:** Requirements R6.1; Task R2-01, Step 2
- **Flaw:** The 500ms target did not require recording the benchmark environment.
- **Failure scenario:** A timing result from an unknown local environment is treated as portable proof.
- **Evidence:** R6.1 only named row count and service boundary.
- **Suggested fix:** Record Node/PostgreSQL versions and make unavailable infrastructure an explicit blocker.
- **Disposition:** Accept
- **Rationale:** Makes performance evidence reproducible and honest.
- **Applied To:** `requirements.md` R6.1; Task R2-01.

## Finding 4: Dashboard client/server boundary was unstated
- **Severity:** Medium
- **Location:** Task R3-02, Step 1
- **Flaw:** The existing dashboard page is a server component, but the admin bearer token is held in a client store.
- **Failure scenario:** Implementer either cannot authenticate the fetch or converts the entire dashboard to a client component, increasing scope and bundle cost.
- **Evidence:** Existing `frontend/app/admin/(quan-tri)/page.tsx` has no `use client`; `frontend/lib/admin-api/fetch.ts` reads the client auth store.
- **Suggested fix:** Require a client child activity component.
- **Disposition:** Accept
- **Rationale:** Preserves the current App Router boundary.
- **Applied To:** `design.md` frontend notes; Task R3-02.

## Finding 5: Recursive masking could be interpreted as shallow
- **Severity:** Medium
- **Location:** Requirements R2.3; Task R1-02, Step 1
- **Flaw:** Without explicit nested-array proof, an implementation may mask only top-level keys.
- **Failure scenario:** A secret nested under an array/object reaches the detail UI.
- **Evidence:** The requirement says “including nested JSON” but task evidence did not name nested arrays.
- **Suggested fix:** Require recursion at any depth and nested array tests.
- **Disposition:** Accept
- **Rationale:** The task already names recursion; the review confirms it as a completion condition.
- **Applied To:** Task R1-02 constraints/evidence.

## Finding 6: Parallel schema coordination could create migration conflicts
- **Severity:** Medium
- **Location:** `research.md`, “Coordination with tenant provisioning”; Task R0-01 Related Files
- **Flaw:** Both specs can edit shared Prisma/seed files while running in parallel.
- **Failure scenario:** One branch overwrites the other’s additive enum/permission/migration changes.
- **Evidence:** Both specs touch `backend/prisma/schema.prisma` and seed/migration surfaces.
- **Suggested fix:** Keep coordination-only relation and require additive changes/merge checks.
- **Disposition:** Accept
- **Rationale:** Preserves user-approved parallel execution without inventing a hard blocker.
- **Applied To:** `research.md`; Task R0-01 constraints/risk.

## Finding 7: Static dashboard activity could survive beside live data
- **Severity:** Medium
- **Location:** Requirement R5.1; Task R3-02 Completion Criteria
- **Flaw:** The task did not explicitly require removing the local `activities` source.
- **Failure scenario:** UI shows duplicated or stale mock events alongside real audit rows.
- **Evidence:** `frontend/app/admin/(quan-tri)/page.tsx` currently declares `const activities` and maps it directly.
- **Suggested fix:** Require that no static activity source remains on the displayed path.
- **Disposition:** Accept
- **Rationale:** Prevents false operational information.
- **Applied To:** Task R3-02 Completion Criteria/Evidence.

## Red Team Decision

All accepted findings were propagated into implementation-facing requirements, design, or task sections. No implementation code was created during review.
