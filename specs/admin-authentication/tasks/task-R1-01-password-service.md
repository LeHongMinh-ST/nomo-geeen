# Task R1-01: Password service

**Requirement:** R1 — PlatformAdmin Login (password hashing)
**Status:** done
**Priority:** P1
**Estimated Effort:** S
**Dependencies:** task-R0-01-backend-auth-foundation.md
**Spec:** specs/admin-authentication/

## Context

- **Why**: Login (R1.5) and the bootstrap seed (R5) must hash and verify passwords with Argon2id — the OWASP 2024+ default. A single injectable service centralizes this so no plaintext ever touches storage or logs.
- **Current state**: greenfield — no hashing utility exists. `argon2` is added as a dependency in R0-01.
- **Target outcome**: A `PasswordService` with `hash(plain)` and `verify(hash, plain)` used by AuthService and the seed, producing Argon2id hashes.

## Constraints

- **MUST**: Use `argon2` with `type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 2`; `verify` returns boolean and never throws to the caller on mismatch. Also expose a fixed decoy hash constant for the login timing-oracle defense (R1.2).
- **SHOULD**: Keep params in one constant so they can be tuned; expose as a `@Injectable()` provider in an `AuthModule` (or shared crypto module).
- **MUST NOT**: Log or return plaintext passwords or produced hashes; use bcrypt or any weaker/non-memory-hard algorithm.
- **SCOPE**: Implement only Argon2id hashing/verification mapped to R1.5 and the approved `scope_lock`; do not add token or login-flow logic here.

## Steps

- [x] 1. Create `PasswordService` at `backend/src/platform/auth/password.service.ts`
  - Business intent: secure, centralized credential hashing for login + seed.
  - Code detail: `hash(plain: string): Promise<string>` → `argon2.hash(plain, ARGON2_OPTS)` with `parallelism: 2`; `verify(hash: string, plain: string): Promise<boolean>` → `argon2.verify(hash, plain)` wrapped so a thrown error resolves `false`; export `ARGON2_OPTS` constant and a precomputed `DECOY_HASH` constant used by login's user-not-found branch (R1.2 timing defense).
  - _Requirements: 1.5_

- [x] 2. Register the provider for injection
  - Business intent: make it available to AuthService and the seed.
  - Code detail: declare in `AuthModule` providers/exports (module created in R1-02) or a small shared provider; the seed (R5) imports the same options/util.
  - _Requirements: 1.5_

- [x] 3. Verification implementation
  - Unit test `password.service.spec.ts`: `hash` output starts with `$argon2id$`; `verify(hash, correct)` is `true`; `verify(hash, wrong)` is `false`; two hashes of the same input differ (salted).
  - _Requirements: 1.5_

## Requirements

- 1.5 — Passwords verified using Argon2id; plaintext never stored or logged.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/auth/password.service.ts` | Create | Argon2id hash/verify service |
| `backend/src/platform/auth/password.service.spec.ts` | Create | Unit tests for hash/verify |

## Completion Criteria

- [x] `PasswordService.hash` returns an Argon2id-formatted string (`$argon2id$...`).
- [x] `verify` returns `true` for the correct password and `false` (never throws) for a wrong one.
- [x] Provider is exported and injectable by AuthService and reusable by the seed.
- [x] No plaintext/hash values appear in logs or return values beyond the intended hash output.

## Evidence

- [x] Automated verification (unit)
  - Command(s): `pnpm --dir backend test -- password.service`
  - Expected proof: unit suite passes; assertions on Argon2id prefix + verify true/false green.
- [x] Artifact / runtime verification
  - Inspect: sample hash string from a test log
  - Expect: format `$argon2id$v=19$m=65536,t=3,p=2$...`.
- [x] Runtime reachability verification
  - Entrypoint/caller: imported by `AuthService` (R1-02) and the seed (R5-01)
  - Expect: `PasswordService` is provided/exported by `AuthModule`; consumed by login + seed.
- [x] Contract / negative-path verification
  - Check: `verify` called with a wrong password and with a malformed hash
  - Expect: returns `false` without throwing; no plaintext logged.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Argon2 memory cost too high for VPS | Medium | Params tuned to 64MB; measure login latency (R7.1) |
| `verify` throwing on malformed hash breaks login | Medium | Wrap to resolve `false` on error |

---

> **Parallel marker**: (P) — independent of R2/R3 stores; can run alongside them after R0-01.
> **Requirement mapping**: sub-tasks end with `_Requirements: X.X_`.
> **Evidence rule**: `## Evidence` present above.

## Verification Receipt — 2026-07-17 (full-spec /develop)

**Commands run:**
- `pnpm --dir backend test -- password.service` → **6 passed / 6 total** (Argon2id prefix, verify true/false, malformed→false, salted-differs, decoy verify).
- `pnpm --dir backend build` → exit 0.
- `pnpm --dir backend check` → clean; DECOY_HASH intact after biome.

**Artifact proof:** `password.service.ts` exports `ARGON2_OPTS` (`argon2id, m=65536, t=3, p=2`) + a real fixed `DECOY_HASH` (`$argon2id$v=19$m=65536,t=3,p=2$...`); `verify()` wrapped in try/catch → never throws.

**Reachability:** `PasswordService` is a greenfield `@Injectable()`; wiring into `AuthModule` is explicitly owned by R1-02 (deferred, not orphan).

**Code review:** code-auditor SPEC_PASS, Score 9/10, 0 Critical. The one LOW finding was a stale `p=4` string in this task's Evidence line (doc drift from the validation p=4→p=2 change) — corrected to `p=2`. Code was already p=2.

**Outcome:** PASS.
