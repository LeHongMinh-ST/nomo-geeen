# Requirements: Stock Adjustment Frontend

The frontend consumes the completed tenant stock-adjustment API; this spec does not change backend contracts.

## R1 — Typed API boundary

- **R1.1** When adjustment data loads, the frontend shall call /tenant/stock-adjustments with bounded page, pageSize, optional status, and preserve decimal-string quantities.
- **R1.2** When a draft is created or completed, the frontend shall send the exact API payload and surface structured reason/message errors.

## R2 — Discover and inspect adjustments

- **R2.1** When inventory opens, the frontend shall provide a reachable adjustment list showing document number, status, date, line count, and loading/empty/error/pagination states.
- **R2.2** When an adjustment opens, it shall show warehouse, note, status, product lines, signed delta, before/after quantities, batch, and reason code.
- **R2.3** A completed adjustment shall be visibly read-only with no completion action.

## R3 — Create and complete adjustment

- **R3.1** The form shall support product/batch selection, non-zero signed base-unit delta, a reason code selected from the explicit frontend policy file frontend/lib/stock-adjustment-reasons.ts, and optional note.
- **R3.2** Missing product, zero/invalid delta, missing reason, or invalid batch shall block submission locally.
- **R3.3** Successful draft creation shall show the draft and explicit stock-changing completion confirmation.
- **R3.4** Successful completion shall show feedback, refetch the affected inventory detail and adjustment history through the typed clients, and navigate to completed detail; failure shall preserve context and show structured error.

## R4 — NomoGreen UX and accessibility

- **R4.1** Surfaces shall follow DESIGN.md: Vietnamese, Be Vietnam Pro/16px body, 48px targets, mobile-first, primary green #5CAD45, 16px cards, one primary action.
- **R4.2** Forms and actions shall expose labels, semantic roles, keyboard focus, disabled/loading states, and readable status text beyond color.
- **R4.3** Below lg use cards/mobile loading; at lg+ use existing desktop table/pagination convention.

## R5 — Verification and reachability

- **R5.1** Tests shall cover API mapping, validation, create/complete, structured errors, and completed read-only behavior.
- **R5.2** Runtime verification shall prove the adjustment history/list is mounted from the existing ton-kho inventory surfaces and the create/detail flow is reachable through both ton-kho route files and the authenticated app shell.

## Unresolved

- No reason-catalog endpoint exists; known codes get Vietnamese labels and unknown codes render safely as codes, never free text.
