# Validation Log — Session 1 — 2026-07-22
**Trigger:** Explicit user request to validate tenant-debt-management.
**Questions asked:** 0

## Confirmed decisions
- Keep existing PaymentVoucher and DebtLedger models as the canonical financial documents.
- Keep general cash accounting, exports, printing, and completed-voucher edits out of scope.
- Apply all accepted Red Team findings because they refine implementation safety without expanding the approved scope.

## Action items
- [x] Add rollback proof requirements to R0 migration evidence.
- [x] Define exact replay payload equality and 409 conflict behavior.
- [x] Require explicit party type in the detail route contract.
- [x] Define p95 performance measurement with a repeatable 1,000-party fixture.

## Impact on tasks
- R0 requires forward and rollback migration evidence.
- R1 requires canonical replay comparison fields.
- R1-02 requires p95 measurement over 30 warm requests.
- R2 requires a party-type-preserving detail route.

## Interview note
No user-owned architecture or scope decision remained unresolved: the source spec already explicitly selects existing Prisma models, tenant guards, and the out-of-scope cash-accounting boundary. The review therefore applied only evidence-backed hardening within the confirmed scope.