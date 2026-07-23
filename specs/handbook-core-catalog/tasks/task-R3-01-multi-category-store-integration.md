# Task R3-01: Tenant isolation and mixed-store smoke

**Requirement:** R3, R6
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5-1 day
**Dependencies:** `tasks/task-R1-01-backend-handbook-category.md`, `tasks/task-R2-01-handbook-reachability-and-regression.md`
**Spec:** specs/handbook-core-catalog/

## Context

- **Why**: Mixed/specialist stores share one Handbook; tenant isolation must hold with category filters.
- **Target outcome**: Cross-tenant denial proven; category filter never leaks other tenants; optional note that product `enabledBusinessGroups` does not delete Handbook history (product config out of this task if already in core-catalog-foundation).

## Constraints

- **MUST**: Tenant scope on every Handbook read/write.
- **MUST NOT**: Client-supplied tenantId override.
- **SCOPE**: Isolation tests + smoke; no full product menu rewrite.

## Steps

- [x] 1. Backend test: list with category filter never returns other tenant rows.
  - _Requirements: 3.4, 6.1, 6.2_
- [x] 2. Unauthorized/missing permission rejected with existing guard behavior.
  - _Requirements: 6.1_
- [x] 3. Document interaction: product group enable/disable does not delete Handbook entries (reference core-catalog-foundation).
  - _Requirements: 3.4_

## Requirements

- 3.4, 6.1, 6.2

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/handbook/` | Create | Module created in R1-01; isolation tests live here after create. |
| `backend/src/platform/products/products.service.ts` | Read | Tenant groups pattern. |
| `backend/prisma/schema.prisma` | Read | Disease tenant scope. |

## Completion Criteria

- [x] Cross-tenant tests pass.
- [x] Guard path covered.

## Evidence
## Evidence

### Automated verification

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/handbook/handbook.service.spec.ts
```

```text
# RESULT exit 0 — list where tenantId + category; create rejects UNCATEGORIZED; findById not found cross-tenant
```

### Artifact verification

```text
# PASS — service always scopes tenantId; controller uses request.user.tenantId only
```

### Runtime reachability verification

```text
# PASS — HandbookController under tenant guards
```

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Missing handbook module | High | Depends on R1-01 complete first |
