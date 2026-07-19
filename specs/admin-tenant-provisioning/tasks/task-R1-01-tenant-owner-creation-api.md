# Task R1-01: Tenant owner creation api

**Requirement:** R1 — Transactional tenant + owner creation; R2 — input validation
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** R0-01
**Spec:** specs/admin-tenant-provisioning/

## Context

- **Why**: There is no way to create a store from the admin portal today; a tenant must never exist without ≥1 OWNER, so creation must be atomic.
- **Current state**: `backend/src/platform/tenants/tenants.controller.ts` has GET list/`:id`, PATCH `:id`, POST `:id/status` — no create. `TenantsService` has no `create`. `PasswordService` has `hash`/`verify` but no `generate`.
- **Target outcome**: `POST /admin/tenants` creates Tenant + first OWNER user in one `prisma.$transaction`, returns tenant + owner public shape (+ generated password once), gated by `admin.tenant:create`, audited `TENANT_CREATE`+`USER_CREATE`.

## Constraints

- **MUST**: Wrap tenant + owner + audit in a single `prisma.$transaction`; on any failure roll back fully (no orphan tenant/user/audit). Never return `passwordHash`. Honor the `CreateTenantRequest` / `TenantOwnerCreatedResponse` contracts in `design.md`.
- **SHOULD**: Reuse `AdminUsersController`/`CreateAdminDto` hardening (length caps, CRLF strip, HTTPS-only URL) and existing tenant logo validation.
- **MUST NOT**: Accept an existing user as owner; accept a client-supplied `mode`; log or store generated plaintext; allow PATCH-style mass assignment.
- **SCOPE**: Implement only R1 + R2 and the approved `scope_lock`; do not assign a subscription/plan at creation (but DO set `seatBonus`, default 10).

## Steps

- [x] 1. Add `CreateTenantDto` (tenant + owner nested) with class-validator matching the `CreateTenantRequest` contract: `name` 1–200, `slug` `^[a-z0-9]+(?:-[a-z0-9]+)*$` 3–63 (normalize lowercase), `tenantType` enum, optional HTTPS `logoUrl`, `seatBonus` int 1–999 default 10; owner `fullName` 1–200, **required `username`**, optional `phone`/`email`, password as discriminated union (`{password}` XOR `{generatePassword:true}` — reject neither/both 400 `PASSWORD_MODE_INVALID`), optional `mustChangePassword`.
  - Business intent: reject malformed provisioning input before touching the DB.
  - Code detail: `backend/src/platform/tenants/dto/create-tenant.dto.ts`; model password as a class-validator discriminated shape asserting exactly-one; derive `mode` server-side; reuse existing admin hardening (length caps, CRLF strip, HTTPS-only URL). Add explicit neither/both test cases.
  - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 8.5_

- [x] 2. Extend `PasswordService` with `generate()` (≥12 chars, alphanumeric+symbol, crypto RNG) and implement `TenantsService.create(dto, actorCtx)`: normalize slug, hash provided/generated password, then `prisma.$transaction(async (tx) => ...)`: seed 3 per-tenant role rows (`OWNER/MANAGER/STAFF`, `tenantId=<new>`, permissions cloned from system role templates) → create tenant → create owner user (`createdByType=PLATFORM_ADMIN`, `createdById=actorId`, `status=ACTIVE`, `roleId=<seeded OWNER>`) → write `TENANT_CREATE` + `USER_CREATE` audit via the `AuditLogger` tx-client method inside the same tx. Map `P2002` slug → 409 `SLUG_TAKEN`, `(tenantId,username)` → 409 `USERNAME_TAKEN`.
  - Business intent: atomic provisioning that guarantees a store always has an owner and its own roles.
  - Code detail: `backend/src/platform/tenants/tenants.service.ts`, `backend/src/platform/auth/password.service.ts`; if `AuditLogger` lacks a `Prisma.TransactionClient`-accepting method, extend it (never call self-transacting `run()` here); return `TenantOwnerCreatedResponse` with `generatedPassword` only when generated; rely on DB unique constraints (`tenant.slug`, `@@unique([tenantId,username])`) rather than read-then-write.
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 2.2, 8.4_

- [x] 3. Add `POST` handler on `TenantsController` guarded by `@UseGuards(AccessTokenGuard, PermissionGuard)` + `@RequirePermission('admin.tenant:create')`, passing actor context `{actorId, actorRoleCode, ipAddress, userAgent}`; register `TenantUsersModule` import readiness is R2-01's, but assert THIS route mounts: a request without the permission returns 403 (proves resolution, R7.1). Return 201.
  - Business intent: expose the provisioning route with correct authz and a self-contained mount proof.
  - Code detail: `backend/src/platform/tenants/tenants.controller.ts`; mirror existing controller guard/decorator usage.
  - _Requirements: 1.3, 7.1_

- [x] 4. Verification implementation
  - Integration/e2e: happy path 201; forced owner-insert failure → full rollback (no tenant row); duplicate slug → 409 `SLUG_TAKEN`; missing permission → 403; response excludes `passwordHash`.
  - _Requirements: 1.1, 1.2, 1.3, 2.2_

## Requirements

- 1.1 — atomic tenant + OWNER creation, public owner shape returned
- 1.2 — full rollback on any transaction failure
- 1.3 — `admin.tenant:create` gate, 403 without it
- 1.4 — seed 3 per-tenant roles in tx; owner linked to seeded per-tenant `OWNER` role
- 1.5 — always new owner, no existing-user reference
- 1.6 — `TENANT_CREATE` + `USER_CREATE` audit in the same tx (via AuditLogger tx-client method)
- 2.1–2.7 — tenant/owner DTO validation, slug pattern, HTTPS logo, seatBonus default 10, required username, password discriminated-union XOR, mustChangePassword
- 7.1 — new POST route mounts (permission-less request → 403 proves resolution)
- 8.4 — DB-constraint uniqueness (slug, tenantId+username) mapped to stable 409, no read-then-write
- 8.5 — reuse existing DTO hardening (length caps, CRLF strip, HTTPS-only URL)

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/tenants/dto/create-tenant.dto.ts` | Create | Nested tenant+owner DTO with validators |
| `backend/src/platform/tenants/tenants.service.ts` | Modify | Add transactional `create()` |
| `backend/src/platform/tenants/tenants.controller.ts` | Modify | Add guarded `POST /admin/tenants` |
| `backend/src/platform/auth/password.service.ts` | Modify | Add `generate()` |
| `backend/src/platform/audit/audit-logger.service.ts` | Modify | Add `Prisma.TransactionClient`-accepting write for in-tx audit rows |

## Completion Criteria

- [x] `POST /admin/tenants` returns 201 with tenant + owner public shape; `passwordHash` never present (R1.1, R8.1).
- [x] Any in-transaction failure rolls back — no orphan tenant/user/audit rows (R1.2).
- [x] Duplicate slug → 409 `SLUG_TAKEN`; duplicate owner username → 409 `USERNAME_TAKEN` (R2.2, R2.5).
- [x] Missing `admin.tenant:create` → 403 (also proves route mount, R1.3/R7.1); owner bound to seeded per-tenant OWNER role; tenant has 3 role rows (R1.4).

## Evidence

This section is both the task-level test plan and the proof checklist. Keep it short, exact, and executable.

- [x] Automated verification (integration/e2e)
  - Command(s): `cd backend && pnpm build && pnpm test:e2e -- tenants-create`
  - Expected proof: happy-path, rollback, 409 SLUG_TAKEN, and 403 cases pass; exit 0.
- [x] Artifact / runtime verification
  - Inspect: `POST /admin/tenants` response JSON + DB `tenant`/`user` rows after a forced failure.
  - Expect: response has `owner` without `passwordHash`; after forced failure zero tenant rows for the slug.
- [x] Runtime reachability verification
  - Entrypoint/caller: `backend/src/platform/tenants/tenants.controller.ts` route registered in `TenantsModule` → `app.module.ts`.
  - Expect: route resolves over HTTP with an authenticated admin token (verified end-to-end in R4-02).
- [x] Contract / negative-path verification
  - Check: caller without `admin.tenant:create`; slug already taken (incl. soft-deleted); owner with no username; password neither/both.
  - Expect: 403 / 409 `SLUG_TAKEN` / 400 `PASSWORD_MODE_INVALID`, each with no partial write.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Partial creation leaves orphan tenant | Critical | Single `$transaction` (roles+tenant+owner+audit); explicit rollback e2e test (R1.2) |
| Audit rows survive rollback | High | AuditLogger tx-client method writes inside the outer tx; rollback test asserts 0 audit rows |
| Generated password leakage | High | One-time reveal in response; excluded from logs/audit |
| Slug/username race on concurrent create | Medium | Rely on DB unique constraints; map `P2002` → 409, no read-then-write |

## Verification Receipt

**Verified at:** 2026-07-19T16:31:17Z · **Result:** PASS · **Git HEAD:** 3f77675

### Commands run (fresh, this run)

```bash
cd backend && pnpm build && pnpm test:e2e -- tenants-create
# build_exit=0
# Test Suites: 1 passed, 1 total
# Tests:       7 passed, 7 total  (e2e_exit=0)
```

```bash
cd backend && pnpm test -- tenants.service
# Test Suites: 1 passed, 1 total
# Tests:       16 passed, 16 total  (exit 0)
```

```bash
cd backend && pnpm exec biome check src/platform/tenants
# no issues found (scope clean)
```

### Evidence mapping

- **R1.1 / R8.1** — e2e "201 generated password" + "201 explicit password" assert owner public shape, `owner.passwordHash === undefined`. PASS
- **R1.2** — e2e rollback test forces in-tx failure via `jest.spyOn(audit, 'writeInTx')` (2nd call rejects); asserts tenant, orphan user, orphan `TENANT_CREATE` audit all null. PASS
- **R2.2 / R2.5** — e2e dup-slug → 409 `SLUG_TAKEN`; unit `mapCreateError` injects real adapter-pg P2002 shapes: `['slug']` → SLUG_TAKEN, `['tenantId','username']` → USERNAME_TAKEN, `['tenantId','code']` → rethrown. PASS
- **R1.3 / R7.1** — e2e limited-admin (no `admin.tenant:create`) → 403, proving route mount + permission resolution. PASS
- **R1.4** — e2e happy path asserts 3 role rows [MANAGER, OWNER, STAFF] and owner bound to seeded OWNER role. PASS
- **R2.x / M1 regression** — e2e missing-`owner` object → 400 (not 500) with no tenant row; neither-password → 400 `PASSWORD_MODE_INVALID`. PASS

### Notes / defects found & fixed during verification

- **Latent adapter-pg P2002 bug (genuine):** original `mapCreateError` read only `meta.target`, which is **absent** under `@prisma/adapter-pg`. Every P2002 fell through to a default `SLUG_TAKEN`, making `USERNAME_TAKEN` unreachable and mislabeling unrelated unique violations. Fixed via `uniqueViolationFields()` reading `meta.target` **and** `meta.driverAdapterError.cause.constraint.fields` + `originalMessage`. Verified real shape against live DB with a throwaway probe.
- code-auditor MAJOR **M1** (missing-owner → 500): fixed with `@IsDefined()+@IsObject()` on nested DTOs + regression e2e case.
- code-auditor MAJOR **M2** (USERNAME_TAKEN unproven): fixed with deterministic unit tests injecting the real adapter-pg P2002 payload.
- Deferred as tech debt (non-blocking): m3/m4/m5 minors.

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
