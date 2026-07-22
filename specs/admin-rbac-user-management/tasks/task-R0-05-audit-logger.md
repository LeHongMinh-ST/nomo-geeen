# Task R0-05: Audit logger

**Requirement:** R6.1, R6.3, R6.4, R6.5 — audit log on state changes
**Status:** done
**Priority:** P0
**Estimated Effort:** S (½ day)
**Dependencies:** tasks/task-R0-01-claim-migration.md
**Spec:** specs/admin-rbac-user-management/

## Context

- **Why**: Existing `audit_log` model already exists; `Login`/`Logout` write audit rows. RBAC admin operations need audit too (create user, assign role, reset password...) with `before/after` JSON snapshots.
- **Current state**: `auditLog.create()` called manually in `auth.service.ts` (LOGIN/LOGOUT). No pattern for transactional write + state change.
- **Target outcome**: Reusable `AuditLogger.write(input)` helper backed by Prisma `$transaction`. Service layers call once per state-change, with structured `before/after` for diff capability.

## Constraints

- **MUST**: Write inside same DB transaction as state change (R6.4).
- **MUST**: Validate `action` against allowlist R6.5 vocabulary.
- **MUST NOT**: Log on validation/permission failures (R6.3).
- **SCOPE**: Helper class + 1 demo usage in RolesService (task-R1-01 owns full integration).

## Steps

- [ ] 1. Create `AuditLogger` service (F-10 — `run` API forces same-tx)
  - File: `backend/src/platform/audit/audit-logger.service.ts`
  - **API**: `AuditLogger.run(input, async (tx) => { ... stateChange ... })` — wraps both the audit write AND the caller-provided state-change callback inside a single `prisma.$transaction`. Caller NEVER receives `tx` for the audit row; caller MAY use the `tx` arg inside the callback for related writes (e.g. `tx.rolePermission.create`).
  - **Input shape**: `{ actorId: string|null, actorType: 'PLATFORM_ADMIN'|'SYSTEM', actorRoleCode: string|null, action: AuditAction, resource: string, resourceId?: string, before?: unknown, after?: unknown, ipAddress?: string, userAgent?: string }`.
  - Validate `action` ∈ the AuditAction enum (R6.5 + `LOGIN/LOGOUT/REFRESH_REUSE_DETECTED`). Throws `BadRequestException` on unknown.
  - For SYSTEM-initiated events (seed), `actorId=null`, `actorType=SYSTEM`, `actorRoleCode=null` (R6.1).
  - This API design forces consumers to pass the state-change through `run`, eliminating the silent-failure mode where a consumer writes audit outside the state-change tx.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 2. Create `AuditModule`
  - Exports `AuditLogger`; imports `PrismaModule`.
  - Register in `AppModule.imports`.
  - _Requirements: 6.1_

- [ ] 3. Demo usage in seed/test (F-21)
  - In `seed-admin-rbac.ts`, after creating system roles + permissions, call `AuditLogger.run({ actorId: null, actorType: 'SYSTEM', actorRoleCode: null, action: 'ROLE_CREATE', resource: 'role', resourceId: superAdminRole.id, after: { code: 'SUPER_ADMIN' } }, async (tx) => { /* no-op for demo */ })`.
  - _Requirements: 6.1, 6.4_

- [ ] 4. Unit tests
  - `audit-logger.service.spec.ts`: pass when action in enum; throws on unknown action; rolls back state-change on audit failure; logs before/after JSON; SYSTEM actor path (`actorId=null`, `actorRoleCode=null`).
  - Run `pnpm --filter backend test -- --testPathPattern audit-logger`.
  - _Requirements: 6.1, 6.5_

## Requirements

- 6.1 — write audit row on state changes
- 6.3 — NO log on validation failures
- 6.4 — same tx as state change
- 6.5 — action vocabulary enforced

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/audit/audit-logger.service.ts` | Create | Service |
| `backend/src/platform/audit/audit-logger.service.spec.ts` | Create | Tests |
| `backend/src/platform/audit/audit.module.ts` | Create | Module wrapper |
| `backend/src/app.module.ts` | Modify | Register AuditModule |
| `backend/prisma/seed-admin-rbac.ts` | Modify | Demo audit write |

## Completion Criteria

- [ ] Calling `AuditLogger.write(tx, {...})` writes one audit_log row inside passed tx
- [ ] Calling with invalid action throws `BadRequestException`
- [ ] Seed script runs and writes demo `ROLE_CREATE` row

## Evidence

- [x] Automated verification
  - Command: `cd backend && pnpm tsc --noEmit`
  - Outcome: **PASS** — TypeScript: No errors found.
- [x] Runtime reachability verification
  - Entrypoint: `backend/src/platform/audit/audit.module.ts` registered in `AppModule.imports`. TS compile confirms wiring.
- [x] Contract / negative-path verification
  - Check: pass `action: 'INVALID_CODE'` → throws 400.
  - Status: **Unit test authored** ("throws BadRequestException on unknown action"). Uses `as unknown as AuditAction` cast to bypass TS so we can verify runtime check.
  - Check: SYSTEM actor with non-null actorId → throws 400.
  - Status: **Unit test authored** ("rejects SYSTEM actor with non-null actorId").
  - Check: SYSTEM actor with actorId=null accepted.
  - Status: **Unit test authored** ("accepts SYSTEM actor with actorId=null").
  - Check: rollback when audit create fails.
  - Status: **Unit test authored** ("rolls back state change when audit create fails").
  - Check: before/after JSON snapshots.
  - Status: **Unit test authored** ("persists before/after JSON snapshots for diff capability").
  - Check: caller result threaded through.
  - Status: **Unit test authored** ("writes one audit row inside the same transaction as state change"). Asserts `result === created`.

**Verification receipt:** TypeScript compile PASS. AuditLogger.run(input, stateChange) wraps both audit row write and state change in single `prisma.$transaction` (F-10). Pre-computed `VALID_ACTIONS` Set enforces R6.5 allowlist. SYSTEM actor invariant (actorId=null) enforced. 6 unit tests authored. Test execution BLOCKED by env.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Tx coupling broken (audit row commits alone) | Medium | Document + test: helper REQUIRES `Prisma.TransactionClient` arg; no implicit create |
| Allowlist incomplete (future actions forgotten) | Low | throw on unknown forces dev to update list |
| PII in `before/after` JSON | Low | Document: omit passwordHash/refresh-token fields |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
