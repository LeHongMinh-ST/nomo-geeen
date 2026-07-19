# Red-Team Report — admin-tenant-provisioning

**Date:** 2026-07-19
**Spec:** `specs/admin-tenant-provisioning/`
**Stage:** Red Team → Validate (Deep tier, 7 task files)
**Reviewers:** 4 adversarial passes (Assumption Destroyer, Contract/Schema Auditor, Security/Authz, Integration/Reachability)

## Summary

| Metric | Count |
|---|---|
| Raw findings collected | 31 |
| After dedup + evidence filter | 15 |
| Accepted & applied | 12 |
| Escalated to user decision | 3 |
| Rejected (no evidence / meta / out-of-scope) | 16 |

All accepted findings were propagated into `requirements.md`, `design.md`, and the affected task files. Three findings changed scope and were approved by the user before applying.

## User-Escalated Decisions (binding)

| # | Finding | Decision | Rationale |
|---|---|---|---|
| 1 | Owner cannot be created without `username` because `User.username` is NOT NULL (`schema.prisma`, `@@unique([tenantId, username])`). Design allowed email/phone-only. | **Require username** | Schema enforces NOT NULL + per-tenant uniqueness; email/phone-only creation would throw at insert. |
| 2 | With "no plan at creation", `effective_max_users = 0` blocked adding any second user until a plan was assigned elsewhere — R3 unusable out of the box. | **Allow `seatBonus` at creation** (1..999, default 10) | Lets tenant-user management work immediately while preserving the "no plan at creation" decision. |
| — | Design draft reused system roles `tenantId=null`; conflicts with tenant-scoped role model and per-tenant `@@unique`. | **Seed 3 per-tenant roles** (OWNER/MANAGER/STAFF, `tenantId=<new>`) inside the creation tx | Clones grants from system templates; keeps roles tenant-scoped and owner linked to per-tenant OWNER. |
| — | Disposition of remaining verified findings. | **Apply all** | User instruction "Apply tất cả". |

## Accepted & Applied Findings

| # | Severity | Finding | Resolution | Artifacts |
|---|---|---|---|---|
| 1 | High | Username NOT NULL vs optional-identifier design | R2.5 requires `username`; 409 `USERNAME_TAKEN`; contract `username: string` | requirements R2.5, design contracts, R1-01, R3-01, R4-01 |
| 2 | High | Plan-less seat lockout | R2.1 optional `seatBonus` (1..999, default 10); seat formula revised | requirements R2.1/R3.3, design SeatUsage, R3-01, R3-02, R4-01 |
| 3 | High | System-role reuse conflict | R1.4 seeds 3 per-tenant roles in tx, clones grants, links owner | requirements R1.4, design TenantsService.create, R1-01, R4-01 |
| 4 | High | Audit rows self-transacting → survive rollback (`audit-logger.service.ts:50-83`) | Design mandates AuditLogger tx-client method inside the creation tx; R4-01 asserts survival semantics | design Risk + Audit invariant, R1-01 |
| 5 | High | Mass-assignment on user edit (tenantId/status/roleId/roleCode/passwordHash) | R3.4 strict field whitelist → 400 `FIELD_NOT_ALLOWED`; role change is a separate endpoint | requirements R3.4, design routes, R2-01, R3-02, R4-01 |
| 6 | High | Role change through field-edit form escalates privilege | Separate `PATCH :userId/role` gated by `admin.tenant-user:manage` | design routes, R2-01, R3-02 |
| 7 | Med | Ambiguous password input (neither/both) | R2.6 discriminated union `{mode:'provided',password}` XOR `{mode:'generate'}` → 400 `PASSWORD_MODE_INVALID` | requirements R2.6, design owner contract, R1-01, R4-01 |
| 8 | Med | Seat active-count included INVITED | R3.3 `active_count = status = ACTIVE`; INVITED dropped from status set | requirements R3.3, design SeatUsage/TenantUserPublic |
| 9 | Med | Active-subscription status undefined | Seat uses `activeSubscription.status IN (ACTIVE, TRIALING)` | requirements R3.3, design seat invariant |
| 10 | Med | TOCTOU on seat check | R3.5–R3.7 serializable tx guards around seat/last-owner checks | requirements R3.5–R3.7, R2-01, design Risk |
| 11 | Med | Enum migration in shared transactional migration would fail (`ALTER TYPE ADD VALUE` non-transactional) | R4.1 isolated enum-only migration note | requirements R4.1, R0-01 |
| 12 | Med | Permission catalog over-broad (`admin.tenant-user:*`, SUPPORT) | Collapsed to `view`/`manage`; grants SUPER_ADMIN + SALER only | requirements R4.2/R4.3, design routes, R0-01 |
| 13 | Med | Password reset didn't force change | R8.1 reset sets `mustChangePassword=true` | requirements R8.1, R2-01, R3-02, R4-01 |
| 14 | Low | Route mount not self-verified | R7.1 self-contained route mount check (403 sample) | requirements R7.1, R1-01 |
| 15 | Low | R4-02 duplicated R4-01 backend acceptance assertions | R4-02 Step 1 narrowed to wiring/registration; exhaustive negative-path owned by R4-01 | R4-02 constraints + Step 1 |

## Rejected Findings (representative)

| Finding | Reason |
|---|---|
| Derive password `mode` from presence of `password` field | No-op vs explicit discriminated union; already covered by R2.6 |
| Defer `logoUrl` / branding to later spec | Out of scope; not blocking |
| Capture audit IP / User-Agent | No evidence current audit model carries them; scope creep |
| Audit denied operations | Meta; not required by any requirement |
| Various "consider adding X" without evidence | Speculative, violates YAGNI |

## Verification Status

- Findings propagated across requirements/design/tasks: **complete**
- Validators re-run: see Validate stage receipt (`validate-spec-output.cjs` Layer 1 + `spec-ground.cjs` Layer 2)
- `spec.json.scope_lock` reconciled with role-seeding + permission decisions
