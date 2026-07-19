# Task R0-02: Tenant status and query contracts

**Requirement:** R0 — Shared tenant status, filtering, and transport contracts
**Status:** done
**Priority:** P1
**Estimated Effort:** S
**Dependencies:** R0-01 permission and audit foundation
**Spec:** specs/admin-tenant-management/
**Contracts:** TenantStatusTransition

## Context

- **Why**: Later API and UI tasks need one validated status transition map, soft-delete rule, filter contract, and request DTO shape.
- **Current state**: `backend/prisma/schema.prisma` already defines `TenantType`, `TenantMode`, `TenantStatus`, `Tenant`, indexes on `status`/`deletedAt`, relations `users`, `subscriptions`, `supportTickets`, and `TicketStatus` (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`). Canonical response contracts live in `design.md`.
- **Target outcome**: Shared **request** DTO/query rules and transition constants for R1. Response mapping belongs to R1-01 service (no separate `tenant-contracts.ts`).

## Constraints

- **MUST**: Permit only `ACTIVE->SUSPENDED`, `ACTIVE->LOCKED`, `SUSPENDED->ACTIVE`, `SUSPENDED->LOCKED`, `LOCKED->ACTIVE`; exclude `deletedAt IS NOT NULL` records.
- **MUST**: Bound `q` maxLength 100 (trimmed); default `pageSize` 20; cap 100; status transition `reason` maxLength 500 (strip CRLF).
- **SHOULD**: Reuse existing Prisma enums and indexed fields.
- **MUST NOT**: Permit no-op transitions, free-form status mutation, delete endpoints, alternate contract field names, or a second response-type registry file.
- **SCOPE**: Request DTOs + transition constants only; response mapping and API handlers belong to R1.

## Steps

- [x] 1. Define tenant query and status request DTOs under `backend/src/platform/tenants/dto/`
  - _Requirements: 1.2, 1.3, 2.3, 2.4, 3.1, 8.4_
- [x] 2. Encode lifecycle transition constants under `backend/src/platform/tenants/`
  - _Requirements: 3.1, 3.2, 3.5_
- [x] 3. Document detail aggregate predicates for R1-01 (schema-grounded)
  - _Requirements: 2.1, 7.2_
- [x] 4. Verify DTO validation and transition unit tests
  - _Requirements: 1.3, 2.4, 3.1, 3.2, 8.2_

## Requirements

- R1.2, R1.3 — Server-side filter semantics, stable pagination, default 20, page size 1..100, `q` max 100.
- R2.1, R2.3, R2.4 — Detail aggregate predicates, optimistic concurrency field, logoUrl/name validation.
- R3.1, R3.2, R3.5 — Explicit status transitions, 409 for invalid/no-op, no deletion endpoint.
- R7.2 — Indexed query assumptions.
- R8.2, R8.4 — Safe denial payloads and object-level existence checks.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Read | Existing tenant enums, model, soft-delete, relations, indexes |
| `backend/src/platform/tenants/dto/tenant-query.dto.ts` | Create | List/export filter and pagination validation |
| `backend/src/platform/tenants/dto/tenant-status-transition.dto.ts` | Create | `TenantStatusTransition` request contract |
| `backend/src/platform/tenants/dto/update-tenant.dto.ts` | Create | Editable field whitelist + expectedUpdatedAt + logoUrl rules |
| `backend/src/platform/tenants/tenant-status.transitions.ts` | Create | Pure transition map + canTransition helper |
| `backend/src/platform/tenants/tenant-status.transitions.spec.ts` | Create | Transition unit tests |
| `backend/src/platform/tenants/dto/tenant-dto.spec.ts` | Create | DTO validation unit tests |
| `specs/admin-tenant-management/design.md` | Read | Canonical machine-checkable contracts and transition map |

## Completion Criteria

- [x] Query DTO rejects invalid status, blank/oversized pagination, `q` > 100, and page sizes outside 1..100.
- [x] Status validation accepts exactly five transitions and rejects no-op/unsupported without mutation.
- [x] Update DTO rejects non-HTTPS logoUrl and blank name; includes expectedUpdatedAt.
- [x] Aggregate predicates documented for R1-01; no `tenant-contracts.ts` response registry created.
- [x] DTOs and transition constants are consumable by R1 without orphaned module dependency.

## Evidence

- [x] Automated verification
  - `npx jest --testPathPatterns='tenant-status.transitions|tenant-dto' --no-coverage` → PASS (17 tests)
  - `npx tsc -p tsconfig.json --noEmit` → PASS
  - `npx nest build` → PASS
- [x] Artifact: 4 contract files; no `tenant-contracts.ts`
- [x] Runtime reachability: pure modules importable by future TenantsModule
- [x] Negative paths: pageSize 0/101, q 101, bad status, blank name, http/js logoUrl, private host logoUrl, reason 501, no-op transition

### Verification Receipt — 2026-07-18
```
Mode: full
jest tenant DTO + transitions: PASS (17)
tsc: PASS
nest build: PASS
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| DTO shape diverges between API and UI | High | Copy canonical fields from design.md; unit tests |
| Premature response-type registry | Medium | No tenant-contracts.ts |
| Transition validation bypassed by direct Prisma update | High | R1-02 atomic conditional update |

---

> **Dependency marker**: R1 API tasks start only after these contracts are stable.
