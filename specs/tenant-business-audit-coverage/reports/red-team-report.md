# Red Team Review — tenant-business-audit-coverage

## Red Team Review — 2026-07-24
**Findings:** 8 (8 accepted, 0 rejected)
**Severity breakdown:** 1 Critical, 6 High, 1 Medium

### Findings and dispositions

1. **Action vocabulary underspecified** — High — requirements Requirement 1 and task-R0-01 did not enumerate exact enum values. **Accept**: canonical action set added to requirements, design, and foundation task.
2. **Denial logging failure semantics ambiguous** — Critical — design denial flow and task-R2-01 lacked exact logger-failure behavior. **Accept**: preserve original 401/403, never grant access, and never recurse.
3. **Auth/Audit module cycle invariant missing** — High — task-R0-02 touched guard/module wiring without preserving the existing forwardRef boundary. **Accept**: design/task now require forwardRef preservation and AppModule compilation.
4. **Snapshot bound not measurable** — High — R9.2 said bounded without a threshold. **Accept**: maximum 100 identifiers/summaries with count and deterministic truncation marker.
5. **SALE_DENY not explicit** — High — R5.3 used bounded denial context without requiring the action. **Accept**: SALE_DENY is in the canonical action set and sales task.
6. **Replay could duplicate audit rows** — High — purchase/sales tasks touched retry paths without explicit first-commit assertions. **Accept**: tasks retain same-transaction and replay call-count/result proof; final verification covers replay.
7. **Denial payload could inherit request data** — High — denial task needed explicit body/header/cookie exclusion proof. **Accept**: task requires redaction and logger-failure negative tests.
8. **Audit read boundary could broaden** — Medium — cross-domain work could tempt a new read route. **Accept**: design and final verification preserve the existing admin read boundary and forbid new audit reads.

## Reconciliation
All accepted findings were propagated into implementation-facing requirements, design, or tasks. No scope expansion was introduced.


## Detailed Findings (Required Format)

## Finding 1: Red-team finding
- **Severity:** High
- **Location:** requirements.md §Requirement 1; task-R0-01 §Steps
- **Flaw:** Exact persisted action values were initially not enumerated.
- **Failure scenario:** Different enum names make migrations, queries, and tests disagree.
- **Evidence:** Current requirements enumerate the canonical action set.
- **Suggested fix:** Keep one explicit action set and additive migration.
- **Disposition:** Accept
- **Rationale:** The ambiguity is resolved in requirements, design, and foundation task.

## Finding 2: Red-team finding
- **Severity:** Critical
- **Location:** design.md §Permission denial contract; task-R2-01 §Steps
- **Flaw:** Audit failure could alter authorization behavior or recurse.
- **Failure scenario:** A missing grant changes the original 403 or grants access.
- **Evidence:** Design preserves 401/403, denies access, and forbids recursive retry.
- **Suggested fix:** Use a recursion-safe denial writer.
- **Disposition:** Accept
- **Rationale:** The security-critical contract is explicit.

## Finding 3: Red-team finding
- **Severity:** High
- **Location:** task-R0-02 §Steps
- **Flaw:** Module wiring could break provider resolution.
- **Failure scenario:** AppModule fails while logger unit tests pass.
- **Evidence:** Task preserves the AuthModule/AuditModule forwardRef cycle and requires compilation.
- **Suggested fix:** Preserve the cycle and use AppModule build as a gate.
- **Disposition:** Accept
- **Rationale:** The runtime invariant is implementation-facing.

## Finding 4: Red-team finding
- **Severity:** High
- **Location:** requirements.md §Requirement 9; design.md §Canonical Action Set
- **Flaw:** Bounded snapshots without a numeric limit permit oversized rows.
- **Failure scenario:** A bulk operation serializes an unbounded line array.
- **Evidence:** Design caps identifiers or line summaries at 100 with a truncation marker.
- **Suggested fix:** Apply the cap to every domain mapper.
- **Disposition:** Accept
- **Rationale:** The cap makes performance and privacy testable.

## Finding 5: Red-team finding
- **Severity:** High
- **Location:** requirements.md §Requirement 5; task-R1-03 §Steps
- **Flaw:** Sales denial context could use inconsistent actions.
- **Failure scenario:** A rejected sale is logged generically or not logged.
- **Evidence:** Requirements and design explicitly include SALE_DENY.
- **Suggested fix:** Keep SALE_DENY explicit for bounded denial paths.
- **Disposition:** Accept
- **Rationale:** The stable action is present in implementation-facing layers.

## Finding 6: Red-team finding
- **Severity:** High
- **Location:** task-R1-02 §Steps; task-R1-03 §Steps; task-R2-02 §Evidence
- **Flaw:** Retry/replay could write a second success event.
- **Failure scenario:** The first transaction commits, response is lost, and retry inserts another row.
- **Evidence:** Requirement 11.2 and tasks require replay without another success row.
- **Suggested fix:** Assert result identity and insert call count on replay.
- **Disposition:** Accept
- **Rationale:** Replay is a named invariant.

## Finding 7: Red-team finding
- **Severity:** High
- **Location:** requirements.md §Requirement 7; design.md §Permission denial contract; task-R2-01 §Evidence
- **Flaw:** Request metadata could persist credentials or full body.
- **Failure scenario:** A denied request password is copied into an audit row.
- **Evidence:** Requirements exclude tokens, cookies, passwords, headers, and full bodies.
- **Suggested fix:** Use verified identity and allow-listed labels only.
- **Disposition:** Accept
- **Rationale:** Exclusion and redaction tests constrain implementation.

## Finding 8: Red-team finding
- **Severity:** Medium
- **Location:** design.md §Non-Goals and §Security Considerations; task-R2-02 §Steps
- **Flaw:** Cross-domain work could broaden audit reads.
- **Failure scenario:** A convenience endpoint exposes rows without least-privilege guard.
- **Evidence:** Design forbids read/list events and preserves existing authorization.
- **Suggested fix:** Add no read route and verify the boundary.
- **Disposition:** Accept
- **Rationale:** Scope and security boundaries are explicit.

