# Validation Log — Session 1 — 2026-07-19

**Trigger:** Mandatory validation after Red Team for a 9-task schema/security/billing spec.
**Questions asked:** 3
**Answer source:** User prompt and repository evidence; no new user-owned scope choice was introduced.

### Questions & Answers

1. **[Scope]** Should billing collection call Stripe or another provider in this release?
   - Options: Manual operator recording (Confirmed) | Provider integration
   - **Answer:** Manual operator recording, based on the explicit prompt: Stripe will be handled later.
   - **Rationale:** Keeps the current spec limited to manual assignment and audit history.
2. **[Data safety]** What should happen when a downgrade leaves usage above the new quota?
   - Options: Preserve data and block growth (Confirmed) | Delete/archive data | Block all reads
   - **Answer:** Preserve data and block growth, based on the explicit completion criterion that downgrade must not lose existing data.
   - **Rationale:** Makes downgrade reversible and avoids destructive cleanup.
3. **[Authorization]** Which default role grants should the implementation seed?
   - Options: SUPER_ADMIN bypass; SUPPORT subscription view; BILLING plan/subscription view+mutation; custom roles none (Confirmed) | Grant all billing permissions to SUPPORT | Grant no defaults
   - **Answer:** The confirmed matrix above, selected to separate support visibility from billing mutation.
   - **Rationale:** Removes the ambiguity found by Red Team Finding 8 while retaining custom-role least privilege.

### Confirmed Decisions

- Manual billing only; no provider/invoice automation.
- Downgrade preserves rows and blocks only new quota-increasing writes.
- Effective entitlements are granted only for `ACTIVE`/`TRIALING`; `PAST_DUE` is denied.
- Plan feature/quota edits take effect immediately for existing subscribers and are captured in before/after plan audit snapshots; no plan versioning is added.
- Tenant identity for enforcement is server-derived from authenticated context; client-supplied IDs cannot select another tenant.
- Quota writes use an explicit atomic lock/conditional strategy and period-scoped order counters where needed.
- Duplicate subscriptions receive a deterministic pre-migration report and operator resolution path without destructive deletion.

### Action Items

- [x] Propagate all accepted Red Team findings into implementation-facing documents.
- [x] Run structural validator and grounding after reconciliation.
- [x] Keep `ready_for_implementation` false until final review state is synchronized.

### Impact on Tasks

- `task-R0-01`: exact default permission matrix, duplicate report/migration evidence, bounded manual fields.
- `task-R0-02` and `task-R1-03`: trusted tenant identity and atomic quota strategy.
- `task-R1-01`: immediate plan-edit semantics and before/after audit snapshots.
- `task-R1-02`: PAST_DUE denial and manual field limits.
- `task-R3-01`: deterministic performance fixture and p95 method.
