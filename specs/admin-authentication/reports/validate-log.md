# Validation Log — Session 1 — 2026-07-17

**Trigger:** Post-red-team scope decisions for the 3 YAGNI/scope findings that change the approved `scope_lock` (require user sign-off per ask-user-question-gates).
**Questions asked:** 4

## Questions & Answers

1. **[Scope]** Red team proposed cutting the brute-force lockout (429) since it is absent from the original request.
   - Options: Cut (Recommended) | Keep & fix
   - **Answer:** Cut
   - **Rationale:** Not in the original request; low-QPS admin gate; rate limiting belongs at the reverse-proxy/infra layer (architecture §8). Removes R8.3, a Redis counter, the 429 branch, and its tests from R1-02.

2. **[Scope]** Red team proposed cutting the Redis access-token blacklist (~15m token).
   - Options: Keep blacklist (Recommended) | Cut blacklist
   - **Answer:** Keep blacklist
   - **Rationale:** The original request emphasizes the access_token principle; immediate revocation on logout is desirable. Cost is one O(1) Redis GET per guarded request. R2.4 retained.

3. **[Scope]** Audit log LOGIN/LOGOUT is not in the original request.
   - Options: Keep + reuse alert (Recommended) | Keep minimal | Defer
   - **Answer:** Keep + reuse alert
   - **Rationale:** `audit_log` table already exists; adds a `REFRESH_REUSE_DETECTED` theft signal (R9.2) so refresh-token reuse is durable/queryable rather than a silent 401.

4. **[Trade-off]** Performance NFR (login <500ms + guard ≤5ms budget + p95 report) flagged as gold-plating for a low-QPS gate.
   - Options: Relax (Recommended) | Keep as-is
   - **Answer:** Relax
   - **Rationale:** Dropped the hard ≤5ms guard budget and the manual p95 artifact; kept a qualitative ~500ms login target; set Argon2id `parallelism=2` to match the minimum target vCPU (was p=4, which oversubscribes a 2-vCPU box).

## Confirmed Decisions
- Cut brute-force 429 lockout — infra-layer instead.
- Keep access-token Redis blacklist (R2.4).
- Keep audit + add `REFRESH_REUSE_DETECTED` (R9.2).
- Relax perf NFR: drop guard budget, keep qualitative login target, Argon2id p=2.

## Action Items (all applied)
- [x] Remove R8.3; renumber Requirement 8; add deferral note.
- [x] Drop hard guard-latency criterion; make R7.1 qualitative; set p=2 in R1-01 + design.
- [x] Add `REFRESH_REUSE_DETECTED` to R9.2 + task-R3-02.
- [x] Propagate all Critical/High correctness fixes (findings 1–11) into requirements/design/tasks.

## Impact on Tasks
- task-R0-01: +migration (R9.3), +CORS, +PORT pin, +frontend env, +Redis AOF (R9.4), +Secure guard (R8.4).
- task-R1-01: Argon2id p=2 + DECOY_HASH.
- task-R1-02: DB-first ordering, decoy verify, familyId in access, removed 429.
- task-R2-01: familyId in access claim; removed guard latency budget.
- task-R3-01: atomic Lua CAS + `:prev` grace window + TTL floor.
- task-R3-02: refresh status re-check + role re-derive; logout via access-claim familyId + expired-access support; reuse audit.
- task-R5-01: Prisma 7 adapter + .env fix in seed.
- task-R6-01: `NEXT_PUBLIC_API_BASE_URL`, credentialed CORS note.
- task-R2-02: migration step in e2e; relaxed latency check.

## Deterministic Gate (final)
- `node .claude/scripts/validate-spec-output.cjs specs/admin-authentication` → PASS (exit 0)
- `node .claude/scripts/spec-ground.cjs specs/admin-authentication` → GROUNDED, 12 paths (exit 0)
