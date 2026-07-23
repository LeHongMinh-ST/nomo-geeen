# Red Team Report — sale-checkout-kind-gates

**Date:** 2026-07-23  
**Mode:** Red Team → Validate  
**Auto-decision:** 3 tasks + sale sellability risk surface → 3 lenses (Security Adversary, Failure Mode Analyst, Assumption Destroyer). Scope critic folded into findings 6–7.

**Findings:** 7 (5 Accept, 2 Reject)  
**Severity:** 0 Critical, 2 High, 5 Medium

---

## Finding 1: Complete path thin product select
- **Severity:** High
- **Location:** `design.md` Invariant 2; `tasks/task-R1-01-wire-sales-service-gates.md` Step 2 / Risk
- **Flaw:** Design requires re-assert flags on complete, but codebase `completeInTransaction` includes only `product: { select: { productKind: true } }` (~sales.service.ts:545). Spec must force expanded select.
- **Failure scenario:** Product recalled after DRAFT; implementer only swaps assert without expanding select → stock still decrements.
- **Evidence:** design.md complete-path flag reload; current productKind-only select in sales.service.ts.
- **Suggested fix:** Completion Criteria: complete load includes `status`, `isLocked`, `isRecalled`, `productKind`.
- **Disposition:** Accept
- **Rationale:** Blocks R2.2 if missed.
- **Applied To:** `tasks/task-R1-01-wire-sales-service-gates.md`

## Finding 2: DRAFT→COMPLETE TOCTOU on eligibility
- **Severity:** High
- **Location:** `requirements.md` R2.2; `design.md` sequence + invariants
- **Flaw:** Create-time check alone insufficient if complete omits re-check.
- **Failure scenario:** Staff locks product between create and complete; complete sells locked stock.
- **Evidence:** R2.2 text; design invariant about not trusting DRAFT-time only.
- **Suggested fix:** Evidence checklist greps assert on complete path + full flags.
- **Disposition:** Accept
- **Rationale:** Strengthen task Evidence (requirement already present).
- **Applied To:** `tasks/task-R1-01-wire-sales-service-gates.md` Evidence

## Finding 3: R1.1 overclaims kind-keyed hard gates
- **Severity:** Medium
- **Location:** `requirements.md` R1.1; `research.md` hard-reject table
- **Flaw:** "keyed by productKind" may invent kind hard blocks beyond flags.
- **Failure scenario:** Implementer blocks sale for missing PHI attrs despite R4.2.
- **Evidence:** R4.2; research hard rejects = product flags only.
- **Suggested fix:** Clarify hard path = flags; kind for advisory/batch alignment.
- **Disposition:** Accept
- **Rationale:** Prevents scope creep.
- **Applied To:** `requirements.md` R1.1; `design.md` invariants

## Finding 4: Advisories may never leave the server
- **Severity:** Medium
- **Location:** `requirements.md` R4.1; `tasks/task-R0-01-sale-eligibility-policy.md` Step 2
- **Flaw:** extractSaleAdvisories optional; no API DTO change required → dead code risk.
- **Failure scenario:** Half-implemented R4.1 with unused extract.
- **Evidence:** design non-goals FE; R4.1 "may".
- **Suggested fix:** Explicit non-requirement for HTTP advisory payload this slice.
- **Disposition:** Accept
- **Rationale:** YAGNI clarity.
- **Applied To:** `requirements.md` R4.1; `design.md` Non-Goals; task R0-01 Constraints

## Finding 5: Soft-deleted / missing product on complete
- **Severity:** Medium
- **Location:** `design.md` SaleEligibilityInput; task R1-01 Step 2
- **Flaw:** Missing product on complete must reject, not skip assert.
- **Failure scenario:** Soft-delete after DRAFT; complete proceeds without gate.
- **Evidence:** create filters `deletedAt: null`; complete include may yield null product.
- **Suggested fix:** Missing product → PRODUCT_UNSELLABLE; task step.
- **Disposition:** Accept
- **Rationale:** Failure mode coverage.
- **Applied To:** `tasks/task-R1-01-wire-sales-service-gates.md` Step 2 + Completion Criteria

## Finding 6: New reason codes break FE mapping
- **Severity:** Medium
- **Location:** `design.md` contract `SaleEligibilityError`
- **Flaw:** PRODUCT_LOCKED/RECALLED/INACTIVE vs legacy PRODUCT_UNSELLABLE only.
- **Failure scenario:** FE only handles PRODUCT_UNSELLABLE.
- **Evidence:** sales.service currently uses PRODUCT_UNSELLABLE.
- **Suggested fix:** N/A this slice (FE out of scope).
- **Disposition:** Reject
- **Rationale:** Intentional API contract upgrade; FE out of scope_lock.

## Finding 7: Livestock / harvest PHI creep
- **Severity:** Medium
- **Location:** `spec.json` out_of_scope; research rejected alternatives
- **Flaw:** Temptation to expand gates.
- **Failure scenario:** Task bloat.
- **Evidence:** out_of_scope already lists both.
- **Suggested fix:** None.
- **Disposition:** Reject
- **Rationale:** Already locked out.

---

## Summary table

| # | Finding | Severity | Disposition | Applied To |
|---|---|---|---|---|
| 1 | Complete thin product select | High | Accept | task-R1-01 |
| 2 | DRAFT→COMPLETE re-check evidence | High | Accept | task-R1-01 Evidence |
| 3 | R1.1 kind overclaim | Medium | Accept | requirements + design |
| 4 | Advisories not on API | Medium | Accept | requirements + design + R0-01 |
| 5 | Missing product on complete | Medium | Accept | task-R1-01 |
| 6 | Reason code FE break | Medium | Reject | — |
| 7 | Livestock/PHI harvest creep | Medium | Reject | — |

**Adjudication:** Accepted findings applied to physical artifacts (this validate run).
