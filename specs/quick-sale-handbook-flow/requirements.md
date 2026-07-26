# Requirements — Quick-sale Handbook flow

## R1 — Search and select a disease

- The counter can search tenant-owned active Handbook entries by name, alias, target, or symptom.
- Search results include the stable disease ID, name snapshot source, category, symptom, aliases, and whether consultation fields exist.
- A disease from another tenant or a deleted/inactive entry is never returned or accepted.

## R2 — Suggest products safely

- Selecting a disease returns suggestions ranked by owner pin, recommended active ingredient, and product tag match.
- Suggestions are tenant-scoped and include only products that are active, not locked, not recalled, and currently sellable; out-of-stock items may be shown only as unavailable advisory rows.
- Each suggestion includes product identity, current price/unit, availability, reason, and warnings such as PHI/REI or withdrawal metadata when available.
- The API never adds a product to the cart. The seller must explicitly select and can change quantity/price through the existing cart.

## R3 — Optional consultation

- A selected disease may return enabled consult fields in stable sort order.
- The seller can skip consultation entirely.
- Submitted context is a JSON object keyed by field key. Unknown keys, oversized values, and invalid primitive types are rejected with a structured validation error.
- Quantity metadata is advisory, explicit, and editable; no arbitrary expression is executed by the server.

## R4 — Quick-sale snapshot

- `POST /tenant/sales/quick` accepts optional `diseaseId`, `consultContext`, `suggestedProductsMeta`, and `suggestedQtyMeta`.
- The service resolves `diseaseId` inside the existing serializable transaction using the request tenant, then writes immutable disease name and context snapshots on `Sale`.
- The snapshot includes selected suggestions, their reason/availability at selection time, warnings, and seller-edited quantity metadata when provided.
- A foreign/missing disease fails before stock mutation and does not leak cross-tenant existence.
- Idempotent replay compares the complete handbook payload as part of the existing quick-sale equivalence check.

## R5 — Counter experience

- Bán nhanh exposes a compact Sổ tay panel next to product search: search disease → optional consult → review suggestions → manually add selected products → checkout.
- Existing known-product flow remains usable without opening Sổ tay.
- The UI clearly labels advice as “Gợi ý tham khảo” and shows skip/close actions.

## Completion Criteria

- Backend API and frontend flow are reachable from `/ban-nhanh`.
- Focused tests cover tenant isolation, ranking/filtering, optional consult, quick-sale snapshot, idempotency, and existing checkout regression.
- Backend build, frontend lint/typecheck/tests, and `git diff --check` pass.

## Evidence

- `pnpm --dir backend test --runInBand --runTestsByPath src/platform/handbook/handbook.service.spec.ts src/platform/sales/sales.service.spec.ts`
- `pnpm --dir backend build`
- `pnpm --dir frontend test --run`
- `pnpm --dir frontend lint`
- `git diff --check`
