## Validation Log — Session 1 — 2026-07-23

**Trigger:** `/hapo:specs --validate sale-checkout-fe-gates`  
**Questions asked:** 3  
**Auto-decision:** Validate only (4 tasks; no security/migration keywords). Adversarial pre-pass recorded in `red-team-report.md`.

### Questions & Answers

1. **[Assumptions]** INSUFFICIENT_STOCK / INVALID_CUSTOMER: keep exact quick-sale VI strings or allow light rewrite?
   - Options: Keep exact (Recommended) | Light edit
   - **Answer:** Keep exact current copy
   - **Rationale:** R1.2 non-regression; map table pins strings.

2. **[Architecture]** When throw has no `reason` (message/unknown only): map output?
   - Options: generic VI fallback (Recommended) | prefer Error.message then fallback
   - **Answer:** generic VI fallback
   - **Rationale:** Avoid raw Nest English on POS; consistent with design invariant.

3. **[Scope]** Advisory strip data source when cart line lacks attrs?
   - Options: client-only present fields; missing → hide (Recommended) | enrich picker
   - **Answer:** client-only; hide if missing
   - **Rationale:** R3.3 + YAGNI; no new API / no scope expand.

### Confirmed Decisions
- Stock/customer copy: exact strings from current `quick-sale.tsx`.
- Missing reason: always generic VI (param `fallback` optional override).
- PHI strip: display-only from loaded product meta; no picker enrich task.

### Action Items
- [x] Pin exact VI strings in design.md UX table.
- [x] Document UserApiError top-level `reason` read path in design + R0-01.
- [x] Clarify map does not prefer `Error.message` when reason absent.
- [x] Strengthen R1-01 order-detail complete display criterion.
- [x] Update research remaining gaps with validation decisions.
- [x] Set validation.status completed after Layer1+Layer2 PASS.

### Impact on Tasks
- R0-01: map table + reason extraction rules.
- R1-01: complete path must surface mapped string (not load-error shell only).
- R1-02: no change beyond confirmed hide-if-missing (already in task).
