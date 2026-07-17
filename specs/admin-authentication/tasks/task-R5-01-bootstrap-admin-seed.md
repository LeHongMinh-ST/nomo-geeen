# Task R5-01: Bootstrap admin seed

**Requirement:** R5 — Admin Provisioning (Bootstrap Seed)
**Status:** done
**Priority:** P2
**Estimated Effort:** S
**Dependencies:** task-R0-01-backend-auth-foundation.md, task-R1-01-password-service.md
**Spec:** specs/admin-authentication/

## Context

- **Why**: A fresh deployment has no `PlatformAdmin`, so nobody can log in. An env-driven bootstrap seed creates the initial SUPER_ADMIN.
- **Current state**: `backend/prisma/seed.ts` seeds features/plans/permissions/roles but no admin. `PasswordService`/Argon2id options come from R1-01. `PlatformAdmin` model exists.
- **Target outcome**: Running `pnpm --dir backend db:seed` with the bootstrap env vars set creates one ACTIVE SUPER_ADMIN with an Argon2id password hash, idempotently.

## Constraints

- **MUST**: Read `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD`; create a `PlatformAdmin` with `role=SUPER_ADMIN`, `status=ACTIVE`, Argon2id hash (R5.1). Skip cleanly if env vars absent (R5.2). Idempotent — no duplicates, no password overwrite on re-run (R5.3).
- **MUST**: Construct the seed's `PrismaClient` with the `@prisma/adapter-pg` driver adapter (mirroring `PrismaService`) and load `.env` first — `schema.prisma` has no `url`, so a bare `new PrismaClient()` cannot connect under Prisma 7. The current `seed.ts` uses `new PrismaClient()` and must be refactored to the adapter path.
- **SHOULD**: Reuse the same Argon2id options/util (`ARGON2_OPTS`) as `PasswordService`; use `findUnique` on the unique `email`.
- **MUST NOT**: Hardcode a default password; overwrite an existing admin's password; log the plaintext password.
- **SCOPE**: Implement only the bootstrap admin seed + the required Prisma 7 adapter fix mapped to R5 and the approved `scope_lock`; do not alter existing feature/plan/role seeding logic.

## Steps

- [x] 1. Fix the seed's Prisma 7 connection, then add `seedBootstrapAdmin` to `backend/prisma/seed.ts`
  - Business intent: make the seed actually connect and guarantee a first admin.
  - Code detail: at the top, `process.loadEnvFile?.('.env')` and construct `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`. Then: if both bootstrap env vars set, `findUnique({ email })`; if absent → `create` with `argon2.hash(password, ARGON2_OPTS)`, `role: 'SUPER_ADMIN'`, `status: 'ACTIVE'`; if present → leave intact, log "exists, skipped". If env vars missing → log "bootstrap admin skipped" and continue.
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. Document the vars
  - Business intent: operators know how to set the first admin.
  - Code detail: ensure `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` are present in `backend/.env.example` (added in R0-01) with placeholder values.
  - _Requirements: 5.1_

- [x] 3. Verification implementation
  - Run seed twice with env set (requires the R0-01 migration applied): first creates, second reports "exists, skipped" (no duplicate, same hash). Run once with env unset: reports "skipped", exit 0. Verify via a `SELECT` against `platform_admin`.
  - _Requirements: 5.1, 5.2, 5.3_

## Requirements

- 5.1 — Env-driven creation of an ACTIVE SUPER_ADMIN with Argon2id hash.
- 5.2 — Missing env vars → skip admin creation without failing the seed.
- 5.3 — Idempotent — no duplicate admins, no password overwrite.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/seed.ts` | Modify | Add env-driven bootstrap admin step |
| `backend/.env.example` | Modify | Ensure bootstrap admin vars documented |

## Completion Criteria

- [x] With env set, one ACTIVE SUPER_ADMIN is created with an Argon2id hash.
- [x] Re-running the seed does not duplicate or overwrite the admin.
- [x] With env unset, the seed skips admin creation and still exits 0.
- [x] The created admin can log in via `POST /auth/admin/login` (cross-check with R1-02).

## Evidence

- [x] Automated verification (smoke/manual)
  - Command(s): `pnpm --dir backend db:seed` (run twice with env set, once unset)
  - Expected proof: logs show create → skip → skip; exit 0 in all cases.
- [x] Artifact / runtime verification
  - Inspect: `SELECT id,email,role,status FROM platform_admin WHERE email=$BOOTSTRAP_ADMIN_EMAIL`
  - Expect: exactly one row, role SUPER_ADMIN, status ACTIVE, `passwordHash` starts with `$argon2id$`.
- [x] Runtime reachability verification
  - Entrypoint/caller: `backend/prisma/seed.ts` `main()` invoked by `pnpm db:seed`
  - Expect: `seedBootstrapAdmin` is called from `main()`; not dead code.
- [x] Contract / negative-path verification
  - Check: run with env unset; run twice with env set
  - Expect: skip without error; no duplicate; hash unchanged on second run.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Weak/default bootstrap password | High | Require env value; no hardcoded default; doc guidance |
| Overwriting an existing admin password on re-seed | High | Skip when email already exists (R5.3) |
| Plaintext password in seed logs | Medium | Never log the password; log email only |

---

> **Parallel marker**: (P) — independent of the endpoint tasks once R1-01 exists.
> **Requirement mapping**: sub-tasks end with `_Requirements: X.X_`.
> **Evidence rule**: `## Evidence` present above.

## Verification Receipt — 2026-07-17 (full-spec /develop)

**Commands run (real Postgres 5434):**
- Run 1 (env set): `BOOTSTRAP_ADMIN_EMAIL/PASSWORD set` → "Bootstrap admin created: root@nomogreen.vn".
- Run 2 (env set, DIFFERENT password): → "Bootstrap admin exists, skipped" (no overwrite), exit 0.
- Run 3 (no env): → "Bootstrap admin skipped (BOOTSTRAP_ADMIN_* not set)", exit 0.
- `pnpm --dir backend build` clean; backend biome clean; full unit suite 30/30 (no regression).

**Artifact proof:** `SELECT` on `platform_admin` → exactly 1 row for the email, `role=SUPER_ADMIN`, `status=ACTIVE`, `passwordHash` starts with `$argon2id$v=19$m=65536,t=3,p=2$`.

**Cross-check (R5.1):** the seeded admin logged in successfully via `AuthService.login` (real Nest context, then test data cleaned up) — proving the seed produces a usable credential.

**Prisma 7 fix:** `seed.ts` now constructs `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })` with `process.loadEnvFile?.('.env')` first — the old bare `new PrismaClient()` could not connect under Prisma 7 (no url in schema). Verified by the seed connecting and writing.

**Code review:** code-auditor SPEC_PASS, 9/10, 0 Critical. Two INFO/Low only (seed-script TOCTOU not reachable; ARGON2_OPTS kept inline to avoid a `prisma/`→`src/` dependency — auditor accepted as reasonable). No actionable blockers.

**Outcome:** PASS.
