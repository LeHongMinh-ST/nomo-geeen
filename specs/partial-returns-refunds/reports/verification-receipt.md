# Verification receipt — partial-returns-refunds (discovery/spec-only)

**Date:** 2026-07-25  
**Mode:** Spec-only (no backend/frontend/schema/migration edits; no commit; no other agents)  
**Workdir:** `/Users/minhlh.st/code/nomo-green`

## What was produced

| Artifact | Path |
|----------|------|
| Spec state | `specs/partial-returns-refunds/spec.json` |
| Requirements (EARS) | `specs/partial-returns-refunds/requirements.md` |
| Research / evidence | `specs/partial-returns-refunds/research.md` |
| Design + contracts | `specs/partial-returns-refunds/design.md` |
| Task | `specs/partial-returns-refunds/tasks/task-R1-01-partial-returns.md` |
| This receipt | `specs/partial-returns-refunds/reports/verification-receipt.md` |

Mirror copy note: user also allowed `reports/evidence` — see `reports/evidence/partial-returns-refunds/verification-receipt.md` if present.

## Evidence used (read-only)

- `README.md`
- `docs/core-business-catalog.md` (§11 inventory immutability; partial returns next)
- `docs/audit-core-business-catalog-2026-07-22.md` §8.5 (partial returns/refunds open)
- `specs/sales-return-core/*` (full sales return done)
- `specs/purchase-return-core/*` (full purchase return done)
- `specs/livestock-cas-recovery/design.md` + requirements (CAS + no silent HEALTHY + partial handoff)
- `backend/src/platform/sales/sales-return.service.ts`
- `backend/src/platform/purchases/purchase-return.service.ts`
- `backend/prisma/schema.prisma` (SalesReturnLine lacks batch linkage; DebtLedger; PaymentVoucher)

## Gates

| Gate | Result |
|------|--------|
| Spec docs only under `specs/partial-returns-refunds/` (+ evidence reports) | PASS (intent) |
| No product code/schema change this run | PASS by scope |
| `ready_for_implementation` | **false** — validation not run; livestock CAS dependency open; product open Qs |
| `validation_recommended` | true (schema + money + multi-tenant) |

## Implementation readiness

**Not ready.** Blockers:

1. `specs/livestock-cas-recovery` still in progress — need verified ProductBatch CAS on full returns before partial.
2. Product open questions (returnable storage, cash refund, debt pro-rata, full vs partial uniqueness, SalesReturnLine schema).

## Commands not run (by design)

- No `pnpm test/build` product verification (no code change).
- Optional later: `node .claude/scripts/validate-spec-output.cjs specs/partial-returns-refunds` before develop.

## PASS criteria for this discovery task

- [x] requirements/design/tasks capture partial sales + purchase returns
- [x] refund/payment/debt boundary documented
- [x] qty caps + no double-return
- [x] ProductBatch CAS + no auto HEALTHY
- [x] tenant, audit, idempotency, transaction, acceptance tests
- [x] dependency + open questions explicit
