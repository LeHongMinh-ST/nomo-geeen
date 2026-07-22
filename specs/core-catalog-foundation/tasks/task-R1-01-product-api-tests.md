# Task R1-01: Prove product taxonomy API behavior and tenant isolation

**Requirement:** R4
**Status:** pending
**Priority:** P1
**Estimated Effort:** 0.5-1 day
**Dependencies:** `tasks/task-R0-01-business-taxonomy.md`, `tasks/task-R0-02-product-contract.md`
**Spec:** specs/core-catalog-foundation/

## Context

The foundation affects all later inventory and sales work, so isolated type checks are insufficient. This task provides focused proof at the service/controller boundary before batch and purchase implementation begins.

## Constraints

- **MUST** test valid and invalid group/kind/attrs combinations.
- **MUST** test mixed and specialist tenants and cross-tenant access.
- **MUST NOT** mark later stock, Handbook, or aquaculture behavior as covered.
- **SCOPE** focused automated verification and receipt only.

## Steps

- [x] Add unit tests for taxonomy order, compatibility, attrs rules, and legacy fallback.
- [x] Add service-boundary tests for tenant capability enforcement and response fields.
- [x] Record exact commands and remaining deferred phases in the verification receipt.

## Requirements

- R4.1

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/products/products.service.spec.ts` | Modify | Service-level contract coverage. |
| `backend/test/tenant-products.e2e-spec.ts` | Modify | Tenant-scoped API coverage where environment supports it. |
| `specs/core-catalog-foundation/reports/verification-receipt.md` | Create | Fresh evidence and deferred-scope record. |

## Completion Criteria

- [x] Focused tests prove the foundation's positive and negative paths.
- [x] Tenant isolation and legacy fallback have concrete assertions.
- [x] Receipt records commands, results, and deferred FEFO/purchase/Handbook work.

## Evidence

- [ ] Automated verification: `pnpm --dir backend test -- --runInBand products` and the focused tenant test where infrastructure is available.
- [ ] Artifact verification: inspect the verification receipt and changed test names.
- [ ] Runtime reachability verification: tests invoke the actual ProductsService/controller path, not a disconnected helper only.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Passing unit tests hide API wiring gaps | Medium | include controller/integration path and serializer assertions |
