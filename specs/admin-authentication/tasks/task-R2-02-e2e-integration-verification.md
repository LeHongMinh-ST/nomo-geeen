# Task R2-02: E2e integration verification

**Requirement:** R2 — End-to-End Integration & Reachability (covers R1/R2/R3/R4 + NFR proof)
**Status:** in_progress
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** task-R1-02-login-and-me-endpoints.md, task-R3-02-refresh-and-logout-endpoints.md, task-R5-01-bootstrap-admin-seed.md, task-R6-01-frontend-login-wiring.md
**Spec:** specs/admin-authentication/

## Context

- **Why**: Prove the whole admin-auth flow is wired and reachable end-to-end — from the seeded admin, through the frontend form, across login → guarded call → refresh → logout — and that NFRs (fail-closed, performance, no secret leakage) hold. This is the integration/reachability gate for the feature.
- **Current state**: all backend endpoints (R1-02, R3-02), the Redis store (R3-01), the guard (R2-01), the seed (R5-01), and the FE wiring (R6-01) exist individually.
- **Target outcome**: A single documented run (automated e2e + a scripted manual browser check) demonstrates the full lifecycle works against real Postgres + Redis, and every prior task output is reachable from the runtime entrypoint.

## Constraints

- **MUST**: Run against real infra (`docker compose up -d postgres redis`) with a seeded admin; exercise login → `/auth/me` → refresh → reuse-rejection → logout → post-logout rejection in one flow. Assert fail-closed (Redis down → 503) and that no token/secret appears in server logs. Confirm `AuthModule` is imported by `AppModule` and all routes respond (not 404).
- **SHOULD**: Capture login p95 latency to sanity-check R7.1 (<500ms); record results in `specs/admin-authentication/reports/`.
- **MUST NOT**: Mock Redis/Postgres in this task (that defeats integration proof); mark done on unit tests alone.
- **SCOPE**: Verification/integration only — do not add new product behavior; if a gap is found, file it against the owning task, don't patch here silently.

## Steps

- [ ] 1. Author the full-lifecycle e2e spec
  - Business intent: single source of truth that the flow works together.
  - Code detail: `backend/test/auth-flow.e2e-spec.ts` — seed/create an admin, `POST /auth/admin/login` (assert 200 + cookie), `GET /auth/me` (200), `POST /auth/refresh` (rotate), reuse old cookie (401), `POST /auth/logout` (204), old access token `/auth/me` (401).
  - _Requirements: 2.2, 2.5_

- [ ] 2. Reachability + fail-closed + log-hygiene checks
  - Business intent: prove wiring and NFRs.
  - Code detail: assert `AuthModule` in `AppModule` imports and routes non-404; run login/guard with Redis stopped → 503; grep server logs to confirm no plaintext password/token/hash lines.
  - _Requirements: 2.3, 2.4_

- [ ] 3. Manual browser smoke + report
  - Business intent: prove the FE→BE path a real admin uses.
  - Code detail: with backend (PORT 3001) + `pnpm --dir frontend dev` (3000) running, log in at `/admin/login` with the seeded admin → redirect; wrong creds → inline error. Record commands, outcomes, and observed login latency (qualitative ~500ms sanity check, not a gated budget) in `specs/admin-authentication/reports/integration-verification.md`.
  - _Requirements: 2.2, 2.5, 7.1_

## Requirements

- 2.2 — Guarded `/auth/me` reachable and authorized with a valid token end-to-end.
- 2.3 — Invalid/expired token rejected in the full flow.
- 2.4 — Revoked token rejected after logout in the full flow.
- 2.5 — `/auth/me` returns the current admin across the integrated path.
- 7.1 — Login latency sanity-checked (~500ms qualitative) and recorded in the report.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/test/auth-flow.e2e-spec.ts` | Create | Full login→refresh→logout lifecycle e2e |
| `specs/admin-authentication/reports/integration-verification.md` | Create | Recorded evidence + latency |
| `backend/src/app.module.ts` | Read | Confirm AuthModule is imported (reachability) |

## Completion Criteria

- [ ] The full lifecycle e2e passes against real Postgres + Redis.
- [ ] Reuse of a rotated refresh token and post-logout token use are both rejected (401).
- [ ] Redis-down path returns 503 (fail closed); no secret/token appears in logs.
- [ ] A verification report is written with commands, outcomes, and login latency.

## Evidence

- [ ] Automated verification (e2e)
  - Command(s): `docker compose up -d postgres redis && pnpm --dir backend prisma migrate deploy && pnpm --dir backend db:seed && pnpm --dir backend test:e2e -- auth-flow`
  - Expected proof: migration applies; e2e suite passes; lifecycle assertions green.
- [ ] Artifact / runtime verification
  - Inspect: `specs/admin-authentication/reports/integration-verification.md`; server logs
  - Expect: report shows the full flow + latency; logs contain no plaintext secrets/tokens.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `backend/src/app.module.ts` imports `AuthModule`; frontend `/admin/login` calls the API
  - Expect: all four routes respond (not 404); FE form drives a real login; no orphaned modules.
- [ ] Contract / negative-path verification
  - Check: stop Redis mid-flow; reuse rotated cookie; use access token after logout
  - Expect: 503 on Redis down; 401 on reuse and on post-logout token.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Integration passes but hides env/CORS gaps | High | Include the real browser smoke step, not just supertest |
| Flaky e2e due to infra timing | Medium | Wait-for-healthy on compose; deterministic seed |
| Secret leakage undetected | High | Explicit log grep for password/token/hash strings |

---

> **Parallel marker**: final gate — runs after all others; not parallel.
> **Requirement mapping**: sub-tasks end with `_Requirements: X.X_`.
> **Evidence rule**: `## Evidence` present above.
