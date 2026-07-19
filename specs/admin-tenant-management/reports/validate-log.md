# Validation Log — Session 1 — 2026-07-18

**Trigger:** `/hapo:specs --validate admin-tenant-management` after Red Team (15 accepted findings applied)
**Questions asked:** 4

### Questions & Answers

1. **[Scope]** Status transitions (ACTIVE/SUSPENDED/LOCKED): metadata-only vs enforce sessions/APIs now?
   - Options: Metadata-only | Enforce now
   - **Answer:** Metadata-only (Recommended)
   - **Rationale:** Confirms R3.6 and design Non-Goal; no session/Redis/tenant-API enforcement in this feature.

2. **[Architecture]** Concurrent profile edits: optimistic concurrency vs last-write-wins?
   - Options: expectedUpdatedAt → 409 | Last-write-wins
   - **Answer:** expectedUpdatedAt → 409 (Recommended)
   - **Rationale:** Confirms R2.3 and design Data/persistence contract; lost-update + false audit risk closed.

3. **[Architecture]** TENANT_EXPORT audit timing relative to CSV body?
   - Options: Audit before body | Audit after full delivery
   - **Answer:** Audit before body (Recommended)
   - **Rationale:** Confirms R4.4 and design Audit/transaction contract; partial disconnect still audited as successful export.

4. **[Scope]** Default seed grant for SUPPORT on tenant codes?
   - Options: view only | view + edit | all four codes
   - **Answer:** all four codes
   - **Rationale:** SUPPORT is the primary ops role for tenant management; SUPER_ADMIN bypass remains; BILLING stays none. Propagated to design matrix, R5.1, R0-01, R3-01, scope_lock.

### Confirmed Decisions
- Status semantics: metadata-only — write `Tenant.status` + audit; future `tenant-status-enforcement` owns runtime effects.
- Profile concurrency: `expectedUpdatedAt` / If-Match → HTTP 409 on stale.
- Export audit: commit `TENANT_EXPORT` before sending CSV body.
- SUPPORT grants: all four `admin.tenant:*` codes in seed.

### Action Items
- [x] Confirm metadata-only status already in design Non-Goals, R3.6, R1-02, scope_lock out_of_scope
- [x] Confirm expectedUpdatedAt already in design, R2.3, R1-02, R2-02
- [x] Confirm audit-before-body already in design, R4.4, R1-03
- [x] Update SUPPORT grant matrix from view-only → all four codes across design, requirements, R0-01, R3-01, scope_lock

### Impact on Tasks
- Task R0-01: SUPPORT_GRANTS gets all four tenant codes (not view-only).
- Task R3-01: matrix asserts SUPPORT full four-code access; BILLING none.
- No new tasks required; no scope expansion beyond confirmed SUPPORT grant change.

### Red Team Reconciliation
- 15 Critical/High findings Accepted and applied to requirements.md, design.md, research.md, all 8 task files, spec.json.
- 9 Medium findings folded into related Critical/High fixes.
- Report: `reports/red-team-report.md`.
