# Red Team Review — 2026-07-17

**Spec:** specs/admin-authentication/
**Reviewers:** 4 (Security Adversary, Failure Mode Analyst, Assumption Destroyer, Scope & Complexity Critic)
**Findings:** 27 raw → 14 after dedup/evidence-filter (11 accepted, 3 deferred-by-user)
**Severity breakdown (accepted):** 5 Critical, 4 High, 2 Medium

## Summary Table

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | Logout cannot revoke refresh family (path-scoped cookie not sent to `/auth/logout`; access claim lacks `familyId`) | Critical | Accept | requirements R2.1/R4.1, design contracts, task-R2-01, task-R3-02 |
| 2 | Refresh never re-validates `status=ACTIVE` — disabled/demoted admin works ~30d | Critical | Accept | requirements R3.2, design flow, task-R3-02 |
| 3 | No DB migration — `platform_admin` table never created → seed/e2e fail | Critical | Accept | requirements R9.3, design migration, task-R0-01, task-R2-02 |
| 4 | Non-atomic rotate + no grace window → false reuse / lost theft signal on concurrent refresh | Critical | Accept | requirements R3.3/R3.6, design flow, task-R3-01 |
| 5 | Seed uses bare `new PrismaClient()` (Prisma 7 needs adapter + .env) → cannot connect | Critical | Accept | task-R5-01 |
| 6 | Missing credentialed CORS for FE `credentials:'include'` | High | Accept | design contracts, task-R0-01, task-R6-01 |
| 7 | FE `API_BASE` undefined + FE/BE both default to port 3000 | High | Accept | task-R0-01 (PORT 3001 + `NEXT_PUBLIC_API_BASE_URL`), task-R6-01 |
| 8 | Argon2id timing oracle enables admin email enumeration | High | Accept | requirements R1.2, design flow, task-R1-01 (decoy), task-R1-02 |
| 9 | Redis ephemeral → restart un-revokes blacklist / mass logout | High | Accept | requirements R9.4, design data model, task-R0-01 (AOF+volume) |
| 10 | Logout blacklist TTL `exp-now` not floored; logout guarded so expired-access sessions can't log out | Medium | Accept | requirements R3.5, task-R3-01 (floor), task-R3-02 (accept expired-signature) |
| 11 | Login cross-store ordering / audit-failure swallow | Medium | Accept | design login flow, task-R1-02 (DB-first, audit fails login) |
| 12 | Brute-force lockout (429) is scope creep | High | Deferred (user) | requirements R8 note — removed R8.3, infra-layer instead |
| 13 | Access-token Redis blacklist is gold-plating for ~15m token | High | Rejected (user) | Kept R2.4 — user affirmed the access_token principle |
| 14 | Perf NFR (guard 5ms budget + p95 report) over-engineered | Medium | Accept (relaxed) | requirements R7 (dropped hard R7.2, kept qualitative R7.1, Argon2id p=2) |

## Notes on user dispositions (validation gate 2026-07-17)
- **#12 Lockout** — user chose to CUT: removed the 429 acceptance criterion; rate limiting deferred to reverse-proxy/infra per architecture §8.
- **#13 Access blacklist** — user chose to KEEP: aligns with the explicit "access_token principle" in the original request; cost is one O(1) Redis GET per guarded request.
- **#14 Perf** — user chose to RELAX: dropped the hard ≤5ms guard budget and the manual p95 artifact; kept a qualitative ~500ms login target; set Argon2id `parallelism=2` to match minimum target vCPU.

## Also surfaced (folded into accepted fixes, not separate rows)
- Reuse-detection produced no durable record → added `REFRESH_REUSE_DETECTED` audit event (R9.2) as a theft alert.
- No admin-scoped "revoke all sessions" primitive — noted as a future enhancement; not required for this feature's scope (single-family revoke on logout/reuse now works via access-claim `familyId`).

## Rejected before merit (evidence filter)
- Generic "JWT is stateless so it's insecure" style observations with no cited spec location — auto-rejected per review.md Step 5.5.

## Deterministic gate
- `node .claude/scripts/validate-spec-output.cjs specs/admin-authentication` → PASS
- `node .claude/scripts/spec-ground.cjs specs/admin-authentication` → GROUNDED (12 paths)
