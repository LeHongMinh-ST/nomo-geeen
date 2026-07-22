# Requirements: Core Catalog Foundation

## R1 — Canonical business taxonomy

- **R1.1** The system shall expose exactly five selectable Phase 1 business groups in the approved order: crop inputs, crop seedlings, animal feed, veterinary drugs, and livestock seed.
- **R1.2** The first group shall keep the single business label `Thuốc bảo vệ thực vật + Phân bón`; pesticide and fertilizer remain product kinds under that group.
- **R1.3** Aquaculture shall not be selectable in this tranche and legacy product kinds shall remain readable.

## R2 — Tenant business profile

- **R2.1** A tenant shall store enabled business groups without deleting historical products when a group is disabled.
- **R2.2** Mixed stores may enable multiple groups and specialist stores may enable one group.
- **R2.3** Product creation shall reject a product whose group is not enabled for the tenant, unless an explicit legacy compatibility path is used.

## R3 — Product contract and validation

- **R3.1** Product create/update/list/detail shall carry `businessGroup`, `productKind`, and validated `attrs`.
- **R3.2** The API shall reject an incompatible group/kind pair and malformed group-specific attributes with a field-level 400 response.
- **R3.3** The five groups shall have distinct required attribute rules and unit/lifecycle metadata; the contract shall be extensible without changing common product fields.
- **R3.4** Existing products remain readable with deterministic legacy fallback and no silent reassignment.

## R4 — Verification

- **R4.1** Focused tests shall cover taxonomy order, mixed/specialist tenant profiles, valid/invalid product contracts, legacy fallback, and tenant isolation.
