# Task R3-01: Refresh token store

**Requirement:** R3 — Refresh Token Rotation & Reuse Detection (Redis store)
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** task-R0-01-backend-auth-foundation.md
**Spec:** specs/admin-authentication/

## Context

- **Why**: Refresh tokens must rotate on every use and detect reuse of a rotated token (theft signal). This task owns the Redis-backed rotation family store and the access-token blacklist helpers used by the guard (R2) and logout (R4).
- **Current state**: greenfield — `RedisService` exists from R0-01; no refresh-state logic yet.
- **Target outcome**: A `RefreshTokenStore` that opens a family on login, rotates (returns `ok`/`reuse`/`missing`), revokes a family, and blacklists access tokens — storing only sha256 hashes with TTLs.

## Constraints

- **MUST**: Store only `sha256(refreshToken)` under key `admin:rt:{familyId}` with TTL = refresh lifetime; keep the immediately-previous hash under `admin:rt:{familyId}:prev` with a short grace TTL (a few seconds); blacklist key `admin:bl:{sha256(accessToken)}` with TTL = `max(1, exp-now)` of the access token. Rotation MUST be an **atomic compare-and-swap** (a single Redis Lua `eval`), not a read-then-write. On a presented hash matching neither current nor `:prev` while the family still exists → return `reuse` and delete the whole family (R3.3). Match the canonical Data/persistence contract in `design.md`.
- **SHOULD**: Compute the blacklist TTL flooring at 1s; keep all Redis key formats + the Lua script centralized as constants.
- **MUST NOT**: Persist raw refresh tokens (R8.3); leave keys without TTL; do a non-atomic GET-then-SET rotate; grant on Redis error (fail closed at the call sites, R9.1).
- **SCOPE**: Implement only the Redis rotation/blacklist store mapped to R3 and the approved `scope_lock`; HTTP endpoints live in R3-02.

## Steps

- [x] 1. Create `RefreshTokenStore` at `backend/src/platform/auth/refresh-token.store.ts`
  - Business intent: single owner of refresh-family + blacklist state; never persists a raw token; atomic rotation.
  - Code detail: `open(familyId, token, ttlSec)` → SET `sha256(token)`; `rotate(familyId, oldToken, newToken, ttlSec, graceSec): 'ok'|'reuse'|'missing'` implemented as a **Lua CAS** — in one `eval`: if family key missing → `missing`; if `sha256(old)` == current → SET current=`sha256(new)`, copy old current into `:prev` (TTL graceSec), return `ok`; elif `sha256(old)` == `:prev` (grace) → return `ok` idempotently without deleting; else DEL family(+`:prev`) → `reuse`; `revokeFamily(familyId)` → DEL both; `blacklistAccess(token, ttlSec)` / `isAccessBlacklisted(token)`.
  - _Requirements: 3.1, 3.2, 3.3, 3.6, 8.3_

- [x] 2. Centralize key/format helpers and TTL derivation
  - Business intent: consistent keys across guard, refresh, logout.
  - Code detail: export `rtKey(familyId)`, `rtPrevKey(familyId)`, `blKey(token)`, `sha256(v)`; helper to derive `max(1, exp-now)` remaining TTL from a JWT `exp`.
  - _Requirements: 3.4, 4.1_

- [x] 3. Verification implementation
  - Unit `refresh-token.store.spec.ts` (ioredis-mock or a test Redis): `open`+`rotate(ok)`; concurrent rotate with the same old token converges (both `ok`, no family deletion) via `:prev` grace; a stale token outside grace → `reuse` and family deleted; unknown family → `missing`; blacklist round-trip true/false; all keys carry a TTL; the Lua path is exercised (atomicity).
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

## Requirements

- 3.1 — Refresh stored as hash keyed by familyId with TTL = refresh lifetime.
- 3.2 — Rotate replaces the stored hash and returns `ok`.
- 3.3 — Reuse of a rotated token (outside grace) deletes the whole family (`reuse`).
- 3.4 — Missing/unknown family handled (`missing`) so the endpoint can 401.
- 3.6 — Atomic CAS + `:prev` grace window so concurrent legitimate refreshes converge.
- 8.3 — Refresh stored only as a hash; access revocation state auto-expires via TTL.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/refresh-token.store.ts` | Create | Redis rotation family + blacklist store |
| `backend/src/platform/auth/refresh-token.store.spec.ts` | Create | Unit tests for rotate/reuse/blacklist |

## Completion Criteria

- [x] `open`/`rotate`/`revokeFamily`/`blacklistAccess`/`isAccessBlacklisted` behave per contract.
- [x] `rotate` returns `ok` on match, `reuse` (+family deleted) on mismatch, `missing` when absent.
- [x] Only sha256 hashes are stored; every key has a TTL.
- [x] Store is exported and injectable by AuthService (R3-02) and the AccessTokenGuard (R2-01).

## Evidence

- [x] Automated verification (unit)
  - Command(s): `pnpm --dir backend test -- refresh-token.store`
  - Expected proof: suite passes; reuse-detection + TTL assertions green.
- [x] Artifact / runtime verification
  - Inspect: Redis keys after `open` then `rotate`
  - Expect: `admin:rt:{familyId}` holds the new hash with TTL; reuse path leaves no key.
- [x] Runtime reachability verification
  - Entrypoint/caller: injected by `AuthService.refresh/logout` (R3-02) and `AccessTokenGuard` (R2-01)
  - Expect: provided/exported by `AuthModule`; consumed by guard + endpoints.
- [x] Contract / negative-path verification
  - Check: rotate with a stale (already-rotated) token; rotate an unknown family
  - Expect: `reuse` deletes the family; `missing` returned for unknown family.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Concurrent rotate for one family false-positives as reuse | High | Atomic Lua CAS + `:prev` grace window so parallel legit refreshes converge (R3.6) |
| Key without TTL leaking state | Medium | Always pass ttlSec; blacklist TTL floored at `max(1, exp-now)`; unit-assert TTL presence |
| Storing raw token by mistake | High | Hash-only helper enforced (R8.3) |

---

> **Parallel marker**: shares Redis with R2-01; sequence R2-01 → R3-01 or coordinate on shared helpers.
> **Requirement mapping**: sub-tasks end with `_Requirements: X.X_`.
> **Evidence rule**: `## Evidence` present above.

## Verification Receipt — 2026-07-17 (full-spec /develop)

**Commands run:**
- `REDIS_URL=redis://localhost:6379 npx jest refresh-token.store` → **7 passed / 7 total** (real Redis): open+rotate(ok), grace convergence (family survives), reuse outside grace → family deleted, missing family, blacklist round-trip + TTL, family-key TTL, helpers.
- `pnpm --dir backend build` → exit 0.
- `pnpm --dir backend check` → clean; password.service 6/6 (no regression).

**Artifact proof:** `refresh-token.store.ts` — atomic Lua CAS `rotate()` (single `eval`, KEYS[1]=`admin:rt:{familyId}`, KEYS[2]=`admin:rt:{familyId}:prev`); stores only `sha256(token)`; `blacklistAccess`/`isAccessBlacklisted` on `admin:bl:{sha256}`; `remainingTtlSec` floors `max(1, exp-now)`; Lua also floors `EX` to ≥1 (hardening).

**Reachability:** `RefreshTokenStore` is a store consumed by `AccessTokenGuard` (R2-01) and login/refresh/logout (R1-02/R3-02); module registration owned by R1-02 (deferred, tracked as cross-task dep, not orphan — real-Redis harness exercises it).

**Code review:** code-auditor SPEC_PASS, Score 9/10, 0 Critical. Two LOW hardening findings applied: (1) Lua `math.max(1, EX)` floor; (2) blacklist-key TTL assertion added to tests. Design.md `RefreshTokenStore` sketch updated to include `graceSec`.

**Scope-escape:** `backend/biome.json` disabled `lint/style/useImportType` — the rule kept rewriting NestJS DI injectable imports to `import type`, erasing `design:paramtypes` and breaking runtime DI. Standard NestJS+Biome fix; one rule only. (Also removed the now-redundant biome-ignore in `app.controller.ts`.)

**Outcome:** PASS.
