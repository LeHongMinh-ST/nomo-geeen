# Task R1-02: Audit detail and sanitization

**Requirement:** R1 — Audit query and detail
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** tasks/task-R1-01-audit-query-api.md
**Spec:** specs/admin-system-activity-audit/
Contracts: AuditLogQueryResponse

## Context

- **Why**: `before`/`after` can contain sensitive nested values and detail lookup is not available.
- **Current state**: `AuditLog` stores JSON snapshots; existing auth code explicitly avoids logging secrets.
- **Target outcome**: Detail endpoint returns useful forensic context while recursively masking credential-like keys.

## Constraints

- **MUST**: Mask password, token, secret, hash, cookie, authorization, credential, and equivalent key names case-insensitively at any nesting depth.
- **SHOULD**: Preserve object shape and use `[REDACTED]` so the UI can explain masking.
- **MUST NOT**: Return raw passwordHash, access/refresh token, refresh cookie, secret, or database error text.
- **SCOPE**: Detail endpoint and sanitizer; no retention/export.

## Steps

- [x] 1. Add a typed sanitizer utility in `backend/src/platform/audit/audit-sanitizer.ts` with recursion for objects/arrays and safe handling of null/scalars.
  - _Requirements: 2.3, 2.4_
- [x] 2. Add `GET /admin/audit-logs/:id` to `backend/src/platform/audit/audit.controller.ts`, returning 404 when absent and one sanitized event object (not the paginated list envelope).
  - _Requirements: 1.4, 1.5, 2.1_
- [x] 3. Add focused unit tests for nested secrets, arrays, nulls, not-found, and non-sensitive fields.
  - _Requirements: 2.3, 7.3_

## Requirements

- 1.4 — Detail endpoint returns selected event and sanitized snapshots.
- 1.5 — Unknown id returns 404.
- 2.1, 2.3, 2.4 — Guarded, masked, investigation-useful response.
- 7.3 — Sanitizer and negative paths are tested.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/audit/audit-sanitizer.ts` | Create | Recursive masking utility |
| `backend/src/platform/audit/audit.controller.ts` | Modify | Guarded detail route |
| `backend/src/platform/audit/audit-query.service.ts` | Modify | Detail lookup and mapping |
| `backend/src/platform/audit/audit-sanitizer.spec.ts` | Create | Masking unit tests |

## Completion Criteria

- [x] Detail route returns one event object, returns 404 for missing id, and exposes no raw database error.
- [x] Nested objects/arrays mask credential-like keys while preserving approved audit context.
- [x] List and detail serialization share the sanitizer and canonical response types.

## Evidence

- [x] Automated verification
  - Command(s): `pnpm --dir backend test -- --runInBand audit-sanitizer audit-query`; `pnpm --dir backend build`
  - Expected proof: all masking/detail tests and build pass.
- [x] Artifact / runtime verification
  - Inspect: seeded audit row containing nested `passwordHash`/`accessToken`.
  - Expect: response contains `[REDACTED]`, never raw values.
- [x] Runtime reachability verification
  - Entrypoint/caller: `GET /admin/audit-logs/:id` from `AuditController`.
  - Expect: route resolves through registered `AuditModule`.
- [x] Contract / negative-path verification
  - Check: unauthorized detail, unknown UUID, nested array secret.
  - Expect: 401/403, 404, and complete masking.

### Verification receipt

- `pnpm --dir backend test -- --runInBand audit-sanitizer audit-query`: PASS; full audit scope 4 suites / 19 tests passed.
- `pnpm --dir backend build`: PASS, exit 0.
- Biome check: PASS, no fixes.
- Proof: nested/case-insensitive aliases (`password`, `passwd`, `pwd`, `passcode`, `token`, `jwt`, `secret`, `hash`, `cookie`, `authorization`, `credential`, key variants) masked to `[REDACTED]`; arrays/null/scalars/context preserved; list and detail both sanitize snapshots; detail 404 and generic 500 verified; UUID parsing, guards, permission and module reachability verified.

<!-- contract:AuditLogQueryResponse -->
```json
{
  "items": [
    {
      "id": "uuid",
      "tenantId": "uuid|null",
      "actorType": "PLATFORM_ADMIN|USER|SYSTEM",
      "actorId": "string|null",
      "actorRoleCode": "string|null",
      "action": "AuditAction",
      "resource": "string|null",
      "resourceId": "string|null",
      "createdAt": "ISO-8601",
      "before": "sanitized JSON|null",
      "after": "sanitized JSON|null"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 0
}
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Key-pattern bypass | High | Case-insensitive recursive tests and deny-list review |
| Over-masking reduces investigation value | Medium | Preserve identifiers and non-secret values; document patterns |
