# Red Team Report — stock-adjustment-core-reasons

**Date:** 2026-07-23T13:19:24+07:00  
**Mode:** Red Team → Validate (4 task files + keywords: migration, schema, database)  
**Personas:** Security Adversary, Failure Mode Analyst, Assumption Destroyer, Scope & Complexity Critic

## Red Team Review — 2026-07-23
**Findings:** 8 (6 accepted, 2 rejected)  
**Severity breakdown:** 0 Critical, 5 High, 3 Medium

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | Schema default COMPLETED traps draft create | High | Accept | design Invariants #7; task-R1-01 Constraints |
| 2 | Concurrent oversell / negative stock | High | Accept | design already Serializable; task-R1-01 |
| 3 | Free-text reason bypass | High | Accept | R0-01 policy + R2 |
| 4 | Batch decrease without batchId | High | Accept | design Invariant #8; R1-01 isBatchControlled |
| 5 | Movement refType/refId unspecified | High | Accept | design Invariant #4; R1-01 Steps |
| 6 | Client-trusted qtyBefore/After | Medium | Accept | design Invariant #6; R1-01 |
| 7 | Full FE cycle-count in tranche | Medium | Reject | scope_lock out_of_scope |
| 8 | New inventory:adjust permission seed | Medium | Reject | reuse inventory:view/edit (design) |

---

## Finding 1: Schema default COMPLETED traps draft create
- **Severity:** High
- **Location:** `backend/prisma/schema.prisma` StockAdjustment `@default("COMPLETED")`; design Schema delta; task-R1-01 create path
- **Flaw:** Service create that omits status lands COMPLETED without stock dual-write.
- **Failure scenario:** Operator creates draft via API; row is already COMPLETED; complete becomes no-op or double-complete race.
- **Evidence:** schema `status String @default("COMPLETED")`; design previously only said “enforce DRAFT|COMPLETED in service” without explicit create override.
- **Suggested fix:** Create MUST set `status: 'DRAFT'`; complete only DRAFT→COMPLETED.
- **Disposition:** Accept
- **Rationale:** Real schema trap; implementers will miss it.
- **Applied To:** design.md Invariants #7; task-R1-01 Constraints

## Finding 2: Concurrent oversell / negative stock
- **Severity:** High
- **Location:** design sequence; R1.3; task-R1-01
- **Flaw:** Two completes on same SKU can race past zero without isolation + conditional update.
- **Failure scenario:** Parallel ADJUSTMENT OUT for last units → negative Stock.qty.
- **Evidence:** design Risk “Negative stock race”; sales/purchases use Serializable.
- **Suggested fix:** Serializable + qty gte / nextQty check; tests INSUFFICIENT_STOCK.
- **Disposition:** Accept (already encoded; reaffirmed)
- **Rationale:** Matches core-stock-lifecycle pattern.
- **Applied To:** design Risk + task-R1-01 (existing)

## Finding 3: Free-text reason bypass
- **Severity:** High
- **Location:** requirements R2.x; task-R0-01
- **Flaw:** Free-text reason breaks catalog audit taxonomy.
- **Failure scenario:** Client posts `reasonCode: "whatever"` → accepted → compliance report useless.
- **Evidence:** R2.3 “never allow free-text-only”; research rejects free-text.
- **Suggested fix:** Closed map `assertReasonAllowed` only.
- **Disposition:** Accept
- **Rationale:** Core-value of this spec.
- **Applied To:** task-R0-01 (existing)

## Finding 4: Batch decrease without batchId
- **Severity:** High
- **Location:** R3.2–R3.3; design opt batch branch
- **Flaw:** Stock OUT without batch drifts ProductBatch.qtyOnHand vs Stock.
- **Failure scenario:** Controlled pesticide scrap without batchId decreases stock only → FEFO pool wrong.
- **Evidence:** R3.3 reject; core-stock-lifecycle anti-drift.
- **Suggested fix:** Require batchId when `isBatchControlled` and delta < 0.
- **Disposition:** Accept
- **Rationale:** Depends on batch-policy.
- **Applied To:** design Invariant #8; task-R1-01 Constraints/Steps

## Finding 5: Movement refType/refId unspecified
- **Severity:** High
- **Location:** design Invariants (pre-fix); R3.1
- **Flaw:** Movement without stable ref breaks ledger join / audit.
- **Failure scenario:** Reports cannot group ADJUSTMENT lines by document.
- **Evidence:** StockMovement requires `refType`, `refId`; design only said reason ADJUSTMENT.
- **Suggested fix:** `refType='StockAdjustment'`, refId=header, refLineId=line.
- **Disposition:** Accept
- **Rationale:** Required by schema, missing in contract.
- **Applied To:** design Invariant #4; task-R1-01 Steps

## Finding 6: Client-trusted qtyBefore/After
- **Severity:** Medium
- **Location:** schema StockAdjustmentLine qtyBefore/After; contract AdjustmentLineInput
- **Flaw:** Client-supplied before/after can lie; ledger snapshot wrong.
- **Failure scenario:** Fraudulent before qty on completed adjustment.
- **Evidence:** Input contract has only productId/delta/reasonCode/batchId; line model still has qtyBefore/After.
- **Suggested fix:** Server snapshot only.
- **Disposition:** Accept
- **Rationale:** Defense in depth.
- **Applied To:** design Invariant #6; task-R1-01

## Finding 7: Full FE cycle-count in tranche
- **Severity:** Medium
- **Location:** scope_lock out_of_scope
- **Flaw:** N/A — critic checked for gold-plating FE wizard.
- **Failure scenario:** Spec expands to FE cycle-count UI.
- **Evidence:** out_of_scope lists FE screens and cycle-count wizard.
- **Suggested fix:** Keep API-first.
- **Disposition:** Reject (no change)
- **Rationale:** Already excluded.

## Finding 8: New inventory:adjust permission seed
- **Severity:** Medium
- **Location:** design Module layout permissions
- **Flaw:** New permission forces seed/migration churn.
- **Failure scenario:** Routes 403 for all tenants until re-seed.
- **Evidence:** design prefers inventory:view/edit.
- **Suggested fix:** Reuse existing codes.
- **Disposition:** Reject (no change)
- **Rationale:** YAGNI; design already chose reuse.

## Verdict
No Critical. Accepted High items propagated into design.md + task-R1-01. Spec remains ready after structural+ground re-check.
