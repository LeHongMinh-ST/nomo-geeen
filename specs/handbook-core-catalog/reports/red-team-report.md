# Red Team Report — handbook-core-catalog

**Date:** 2026-07-23  
**Mode:** Red Team → Validate (10 tasks, deep tier, domain keywords)  
**Reviewers:** Security Adversary, Failure Mode Analyst, Assumption Destroyer, Scope & Complexity Critic

## Executive summary

Spec **as originally expanded** tried to own product taxonomy + stock + multi-domain purchase/sale + Handbook. That **overreaches** core-value catalog: product groups already live in `core-catalog-foundation`; batch/FEFO in `core-stock-lifecycle`.  

**Accepted outcome:** tighten to **Handbook five-category advice axis only**, fill incomplete task stubs, align `scope_lock` with requirements.md (which was already Handbook-focused).

## Findings

### RT-01 — Mega-scope vs core-value Handbook

| Field | Value |
|---|---|
| Severity | Critical |
| Location | `spec.json` scope_lock in_scope (pre-fix); task titles R1-01..R1-05 claiming product domains |
| Flaw | in_scope demanded category-specific purchase/sale/return/adjustment/stock reporting while requirements.md only specifies Handbook category UX/API |
| Failure scenario | `/hapo:develop` implements product/inventory again, conflicts with completed catalog-foundation and stock-lifecycle |
| Evidence | requirements.md R1–R7 Handbook-only; scope_lock listed product domains; 6/10 tasks were unfilled `{{REQUIREMENT_TITLE}}` stubs |
| Suggested fix | Narrow scope_lock; rewrite stub tasks to Handbook fixtures/mapping; out_of_scope product/stock |
| Disposition | **Accepted** — applied 2026-07-23 |
| Rationale | YAGNI; core value = advice taxonomy for `/so-tay`, not second product ERP |

### RT-02 — Incomplete scaffold tasks (DoCT fail)

| Field | Value |
|---|---|
| Severity | Critical |
| Location | `tasks/task-R0-02`, `R1-03..R1-05`, `R2-01-handbook-by-domain`, `R3-01` |
| Flaw | Unfilled placeholders; not implementable |
| Failure scenario | Agent invents scope or skips; validator hard-fails |
| Evidence | `validate-spec-output.cjs` FAIL on `{{REQUIREMENT_TITLE}}` |
| Suggested fix | Fill full template per task |
| Disposition | **Accepted** — stubs rewritten |
| Rationale | Layer 1 validator blocks ready gate |

### RT-03 — Duplicate R2-01 sequence ids

| Field | Value |
|---|---|
| Severity | Medium |
| Location | `task-R2-01-handbook-by-domain.md` vs `task-R2-01-handbook-reachability-and-regression.md` |
| Flaw | Two files share `R2-01` in filename |
| Failure scenario | Registry/id confusion for agents |
| Evidence | Both under `tasks/task-R2-01-*.md` |
| Suggested fix | Rename reachability to `task-R2-02-...` |
| Disposition | **Accepted with defer** — registry already uses id `R2-02` for reachability; rename file optional later (path churn) |
| Rationale | Functional ids in registry differ; rename is polish |

### RT-04 — ID collision: BusinessGroup vs HandbookCategory

| Field | Value |
|---|---|
| Severity | High |
| Location | design contract `CROP_PROTECTION_AND_FERTILIZER` vs product `CROP_INPUTS` |
| Flaw | Two taxonomies for same Vietnamese label without explicit non-equivalence |
| Failure scenario | FE maps product group to Handbook filter incorrectly |
| Evidence | `core-catalog-foundation` uses `CROP_INPUTS`; Handbook contract uses different ID |
| Suggested fix | Document non-equivalence in design Non-Goals / Core-value alignment |
| Disposition | **Accepted** — design.md patched |
| Rationale | Correct: advice ≠ product taxonomy |

### RT-05 — Tenant isolation depends on missing API module

| Field | Value |
|---|---|
| Severity | High |
| Location | R1-01 / R3-01 |
| Flaw | No `backend/src/platform/handbook/` yet |
| Failure scenario | R3 isolation tests cannot run until R1-01 |
| Evidence | research.md: no Handbook controller found |
| Suggested fix | Dependency order R1-01 → R3-01 |
| Disposition | **Accepted** — already dependency-ordered |
| Rationale | Normal foundation order |

### RT-06 — Security: client tenantId override

| Field | Value |
|---|---|
| Severity | High (if ignored) |
| Location | R1-01 constraints, R6 |
| Flaw | New API could accept tenantId body |
| Failure scenario | Cross-tenant Handbook leak |
| Evidence | R6.1–R6.2 requirements |
| Suggested fix | MUST use auth context only |
| Disposition | **Accepted** — already in R1-01 constraints |
| Rationale | Keep as invariant |

### RT-07 — Migration silent mis-map

| Field | Value |
|---|---|
| Severity | High |
| Location | R0-02 / R1-01 |
| Flaw | Mapping CROP → combined category may be wrong for fertilizer-only advice |
| Failure scenario | Wrong filter group for staff |
| Evidence | R1.3 / R7.1 prefer UNCATEGORIZED |
| Suggested fix | Explicit map only; default UNCATEGORIZED |
| Disposition | **Accepted** — R0-02 task |
| Rationale | Lossless > perfect classification |

### RT-08 — Scope critic: 10–15 day estimate for Handbook taxonomy alone

| Field | Value |
|---|---|
| Severity | Medium |
| Location | `spec.json` effort |
| Flaw | Effort inflated by mega-scope |
| Failure scenario | Planning waste |
| Suggested fix | Re-estimate 4–7 implementation days after narrow |
| Disposition | **Accepted** — effort updated in validate step |
| Rationale | After scope cut |

## Deferred / rejected

| ID | Note |
|---|---|
| Rename all R2 files | Deferred path churn |
| Merge Handbook IDs into BusinessGroup enum | **Rejected** — different purpose |

## Post-fix checklist

- [x] scope_lock narrowed  
- [x] Stub tasks filled  
- [x] design Non-Goals / alignment  
- [x] dependencies blockedBy core-catalog-foundation  
- [ ] Validator PASS (run after this report)  
- [ ] ready_for_implementation only after PASS  
