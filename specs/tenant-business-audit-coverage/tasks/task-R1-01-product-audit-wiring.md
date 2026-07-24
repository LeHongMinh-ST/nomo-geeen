# Task R1-01-product-audit-wiring: Product audit wiring

**Requirement:** R3 — Product audit coverage
**Status:** done
**Priority:** P1
**Estimated Effort:** 1 day
**Dependencies:** tasks/task-R0-01-audit-vocabulary-and-contract.md, tasks/task-R0-02-audit-context-boundary.md
**Spec:** specs/tenant-business-audit-coverage/

## Context
- **Why**: Close the approved tenant audit coverage slice.
- **Current state**: Existing AuditLogger, domain transactions, guards, and colocated Jest specs are identified in research.md.
- **Target outcome**: Product audit wiring is wired, bounded, reachable, and tested.

## Constraints
- **MUST**: Preserve tenant scope, routes, errors, transactions, and approved scope_lock.
- **SHOULD**: Reuse AuditLogger.run/writeInTx and existing retry patterns.
- **MUST NOT**: Add UI, reports, retention, returns, global interceptor, async queue, or SIEM.
- **SCOPE**: Implement only R3 — Product audit coverage.

## Steps
- [x] 1. Wire create/update/soft-delete/business-group update
  - Emit only after commit
  - _Requirements: 3.1, 3.2_
- [x] 2. Add allow-listed ProductKind/businessGroup/attrs summaries
  - No raw DTO or secrets; cap identifier/summary arrays at 100
  - _Requirements: 3.2, 3.3, 9.2, 10.3_
- [x] 3. Test success/rollback/foreign tenant/logger failure
  - Keep product behavior
  - _Requirements: 3.1, 3.2, 3.3, 2.2, 2.3_

## Requirements
- 3.1 Product events
- 3.2 Tenant scope
- 3.3 Safe snapshot

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/src/platform/products/products.service.ts | Modify | Mutation audit |
| backend/src/platform/products/products.service.spec.ts | Modify | Tests |
| backend/src/platform/products/products.controller.ts | Read/Modify | Verified context |
| backend/src/platform/products/products.module.ts | Modify | AuditModule |

## Completion Criteria
- [x] 3.1 Product events
- [x] 3.2 Tenant scope
- [x] 3.3 Safe snapshot
- [x] No orphaned provider, route, migration, or audit path remains.

## Evidence
- [x] Automated verification
  - Command(s): pnpm --dir backend test --runInBand --runTestsByPath backend/src/platform/products/products.service.spec.ts
  - Expected proof: focused tests/build/schema checks pass with counts recorded.
- [x] Artifact / runtime verification
  - Inspect: backend/src/platform/products/products.service.ts, backend/src/platform/products/products.service.spec.ts, backend/src/platform/products/products.controller.ts, backend/src/platform/products/products.module.ts
  - Expect: POST/PATCH/DELETE /tenant/products and business-groups
- [x] Runtime reachability verification
  - Entrypoint/caller: POST/PATCH/DELETE /tenant/products and business-groups
  - Expect: the audit behavior is registered and invoked from the existing runtime path.
- [x] Contract / negative-path verification
  - Check: foreign product, invalid DTO, logger failure, sensitive attrs
  - Expect: existing denial/rollback/isolation behavior is preserved and no unsafe row is written.

### Verification receipt
- `pnpm --dir backend test --runInBand --runTestsByPath src/platform/products/products.service.spec.ts` — PASS, 4 tests.
- `pnpm --dir backend build` — PASS.
- `git diff --check` — PASS.
- Runtime proof: ProductsController passes verified TenantIdentity to create/update/remove/business-group mutation methods; each writes its AuditAction through the existing transaction client.
- Negative-path proof: existing foreign-tenant update and soft-delete tests remain passing; snapshots are sanitized by the shared AuditLogger boundary.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Quota/soft-delete regression | High | Focused tests, build, and transaction-preserving implementation. |
| Sensitive or foreign-tenant payload | High | Allow-list snapshots and negative-path assertions. |
