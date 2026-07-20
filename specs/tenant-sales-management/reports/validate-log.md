# Validation Log — Session 1 — 2026-07-20

**Trigger:** Mandatory final spec review after red-team pass; 5 task files and transactional payment/inventory scope.
**Questions asked:** 4 internal validation questions; no unresolved user-owned choice remained after codebase evidence and the approved scope.

## Questions & Answers

1. **[Architecture]** Should checkout use one relational transaction or asynchronous/eventual side effects?
   - **Answer:** One Prisma transaction (Recommended).
   - **Rationale:** Sale, stock, movement, and debt share the existing PostgreSQL database and must commit/rollback together.
2. **[Scope]** Should this spec include customer CRUD/search to make debt selection fully real?
   - **Answer:** Defer customer CRUD/search.
   - **Rationale:** The user requested the quick-sale API and real product data; adding CRM scope would expand the slice. Backend validation and anonymous paid sales keep the boundary safe.
3. **[Reliability]** How should retries identify the same checkout?
   - **Answer:** One UUID idempotency key plus canonical normalized request fingerprint (Recommended).
   - **Rationale:** It prevents duplicate side effects without a schema migration and tolerates line ordering/number formatting normalization.
4. **[Inventory]** Who derives base quantity for a sale unit?
   - **Answer:** Backend derives it from the product base unit/conversion (Recommended).
   - **Rationale:** Inventory quantities are stored in base units; client input must not be trusted for stock math.

## Confirmed Decisions

- Atomic relational transaction — recorded in `design.md` and R1 task.
- Customer CRUD/search deferred — recorded in `requirements.md` scope lock and research gaps.
- Canonical idempotency fingerprint — recorded in `design.md` and R1 task.
- Server-side unit conversion and `Customer.balance` update — recorded in requirements/design/task.

## Action Items

- [x] Apply accepted red-team findings to implementation-facing artifacts.
- [x] Run deterministic structural and grounding validators after propagation.
- [x] Keep `ready_for_implementation` gated until final validator and reconciliation pass.

## Impact on Tasks

- `task-R1-01-quick-sale-api.md`: adds unit conversion, customer balance, default warehouse failure, and canonical idempotency fingerprint proof.
- Other tasks: no scope or contract change beyond consuming the canonical `QuickSaleApi` block.
