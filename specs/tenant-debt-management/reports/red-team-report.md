# Red Team Review — 2026-07-22
**Findings:** 6 (4 accepted, 2 rejected)
**Severity breakdown:** 0 Critical, 4 High, 2 Medium

## Finding 1: Migration rollback is not executable
- **Severity:** High
- **Location:** Task task-R0-01-debt-contract-foundation.md, section Evidence
- **Flaw:** The task requires migration deploy but does not require rollback SQL or rollback execution.
- **Failure scenario:** A failed deploy leaves a partial unique index or an operational database that cannot be safely restored.
- **Evidence:** The Evidence section only says isolated prisma migrate deploy; the Risk Assessment mentions rollback SQL but Completion Criteria does not prove it.
- **Suggested fix:** Require forward and rollback validation on an isolated database and record the rollback artifact.
- **Disposition:** Accept
- **Rationale:** Schema changes are explicitly in scope and financial replay protection must be recoverable.

## Finding 2: Replay contract can drift between schema, request, and tests
- **Severity:** High
- **Location:** Design Canonical Contracts & Invariants and Task task-R1-01-debt-domain-api.md, section Steps
- **Flaw:** The contract names idempotencyKey but the task does not require a canonical payload hash or exact fields compared on replay.
- **Failure scenario:** A retry with changed method or note could incorrectly reuse the original voucher or create a duplicate.
- **Evidence:** The contract says equivalent/conflicting replay, while the task only says replay comparison.
- **Suggested fix:** Define equality over partyType, partyId, voucherType, amount, method, occurredAt, and note; conflicting payload returns 409.
- **Disposition:** Accept
- **Rationale:** Replay correctness is a financial safety invariant.

## Finding 3: Detail route party type can be ambiguous
- **Severity:** High
- **Location:** Task task-R2-01-debt-ui-api-integration.md, section Steps
- **Flaw:** The detail route uses an id while the API contract requires partyType and partyId; the task does not define how the route preserves party type.
- **Failure scenario:** A UUID collision or fallback lookup can display the wrong party direction or request the wrong endpoint.
- **Evidence:** API contract is GET /tenant/debts/:partyType/:partyId, but the UI step only says wire the detail route/loader.
- **Suggested fix:** Make the route carry party type explicitly or use a server-resolved canonical route parameter and test both directions.
- **Disposition:** Accept
- **Rationale:** Party direction controls receipt versus payment and must never be inferred ambiguously.

## Finding 4: Performance acceptance lacks a percentile and measurement protocol
- **Severity:** High
- **Location:** Requirements R5.2 and Task task-R1-02-debt-transaction-acceptance-tests.md, section Steps
- **Flaw:** The 500ms target does not state whether it is average, p95, cold, or warm and does not define the database fixture.
- **Failure scenario:** A single fast sample passes while tail latency remains unusable for large tenants.
- **Evidence:** Requirement R5.2 says complete within 500ms and the task says add a 1,000-party fixture without a percentile.
- **Suggested fix:** Measure p95 over at least 30 warm requests against 1,000 parties with pageSize 20 and record database/runtime.
- **Disposition:** Accept
- **Rationale:** The threshold is meaningful only with a repeatable measurement protocol.

## Finding 5: General cash accounting is outside the approved scope
- **Severity:** Medium
- **Location:** Requirements Requirement 2 and Design section Authorization, performance, and rollback
- **Flaw:** A reviewer might expect a cash balance ledger because the feature says money operations.
- **Failure scenario:** The task expands into reconciliation, accounting, and tax work.
- **Evidence:** Research explicitly rejects a separate cash ledger and scope_lock excludes general accounting.
- **Suggested fix:** No change; keep PaymentVoucher method as the money-operation record.
- **Disposition:** Reject
- **Rationale:** This is an explicit scope boundary, not a defect.

## Finding 6: Existing sales/purchase INCREASE semantics are not to be redesigned
- **Severity:** Medium
- **Location:** Task task-R1-01-debt-domain-api.md, section Constraints
- **Flaw:** A reviewer might require recalculation or migration of historical sales/purchase ledger rows.
- **Failure scenario:** Debt feature changes unrelated sales/purchase behavior and introduces regression scope.
- **Evidence:** Research identifies existing SALE/PURCHASE INCREASE producers and scope excludes changing their semantics.
- **Suggested fix:** No change; consume their rows and test the DECREASE side only.
- **Disposition:** Reject
- **Rationale:** Existing producer contracts are an explicit dependency and out of this slice.