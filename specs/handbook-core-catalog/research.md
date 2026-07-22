# Research & Design Decisions

## Summary

- **Feature**: `handbook-core-catalog`
- **Discovery Scope**: Extension of an existing frontend Handbook with a persistence/API contract already represented in Prisma.
- **Key Findings**:
  - The current UI uses a FE-only `HandbookField` union with `cultivation`, `livestock`, and `aquaculture` in `frontend/lib/handbook.ts`.
  - The current product mock already has five relevant product groups, but its labels differ from the requested Handbook taxonomy.
  - Prisma already stores `Disease.domain` as `AgriDomain`; no runtime Handbook controller/service was found in `backend/src`, so API completion is a separate implementation slice.
  - Product recommendation ordering is independent of the category field and must remain unchanged.

## Evidence Summary

- **Codebase Scout**: Required
  - Result: Existing Handbook routes/components are under `frontend/app/(app)/so-tay` and `frontend/components/app/handbook`; mock data and selectors are in `frontend/lib/handbook.ts`.
  - Relevant files/modules: `frontend/lib/handbook.ts`, `frontend/components/app/handbook/handbook-list.tsx`, `frontend/components/app/handbook/disease-form.tsx`, `frontend/components/app/handbook/disease-detail.tsx`, `frontend/app/(app)/so-tay/page.tsx`, `backend/prisma/schema.prisma`, `docs/handbook.md`, `docs/base_spec.md`, `frontend/lib/products.ts`.
  - Existing patterns/contracts: Next.js App Router, TypeScript discriminated unions, mobile-first Design System, Prisma tenant-scoped models, Nest DTO validation, Jest/Vitest verification.
  - Tests/checks affected: frontend `pnpm --dir frontend test`, `pnpm --dir frontend build`, `pnpm --dir frontend lint`; backend `pnpm --dir backend test`, `pnpm --dir backend build`, and a focused Handbook E2E suite if the API is added.
- **External / Current Research**: Skipped
  - Rationale: No third-party API, current platform rule, or external provider is required. The requested labels and product values are user-provided and internal source-of-truth docs are sufficient.
- **Selected Decision**:
  - Use one stable `HandbookCategory` contract shared by backend and frontend; keep the first requested label as one combined category.
  - Store the stable category identifier on the tenant-scoped disease/Handbook record, while exposing the exact Vietnamese label through a central catalog map.
  - Preserve old fields and recommendation logic; migrate legacy domains through explicit mapping with `UNCATEGORIZED` as the lossless fallback.
- **Rejected Alternatives**:
  - Reuse the existing three `HandbookField` values — rejected because they do not match the five requested core-value categories.
  - Reuse product category IDs directly — rejected because Handbook categories describe advice context and must not be coupled to tenant-editable product categories.
  - Split `Thuốc bảo vệ thực vật` and `Phân bón` — rejected because the user explicitly requested one combined category.
- **Remaining Gaps / Questions**:
  - Final business seed mapping for every existing disease must be confirmed during implementation; unmappable records must remain visible as `Chưa phân loại`.
  - The repository has no current backend Handbook controller/service, so endpoint naming should follow existing tenant product conventions during implementation.
- **Downstream Task & Test Implications**:
  - Create the contract first, then backend persistence/API and frontend UI slices, followed by reachability/regression verification.
  - Add negative tests for invalid category and tenant isolation, plus component/UI checks for all five filters and create/edit validation.

## Codebase Scout

| Area | Finding | Evidence / Path | Implication |
|---|---|---|---|
| Project surface | pnpm monorepo-style app with Next.js 16 frontend and NestJS/Prisma backend | `README.md`, `docs/codebase-summary.md`, `frontend/package.json`, `backend/package.json` | Use existing package commands and split FE/BE tasks |
| Relevant files/modules | Handbook is a route-backed UI with mock data; Prisma has Disease, pins, ingredients, consult fields, and fallback relations | `frontend/app/(app)/so-tay`, `frontend/lib/handbook.ts`, `backend/prisma/schema.prisma` | Change taxonomy without removing technical fields |
| Existing patterns | Frontend uses typed unions/maps and `ListFilterBar`; backend uses tenant-scoped Prisma models and DTO validation | `frontend/components/app/handbook/handbook-list.tsx`, `docs/code-standards.md` | Centralize the category map and validate at the backend boundary |
| Contracts | Current `Disease.domain` is only `CROP/LIVESTOCK/AQUACULTURE/GENERAL`; requested taxonomy is more granular and product-context oriented | `backend/prisma/schema.prisma:642`, `docs/database-design-retail.md:13.1` | Add a dedicated category field/enum or a documented compatibility mapping; do not overload product category IDs |
| Tests and verification | No Handbook backend tests were found; frontend has existing Vitest setup and route components | `frontend/package.json`, `backend/test`, `frontend/components/app/handbook` | Add focused unit/component tests and backend contract/E2E tests where runtime API is introduced |
| Blast radius | Category type is consumed by list, form, cards, detail, and mock seed data; Disease domain may be used by future API | `frontend/lib/handbook.ts`, `frontend/components/app/handbook/*.tsx`, `backend/prisma/schema.prisma` | Keep recommendation function signature stable; migration must be reversible |
| Staleness / conflicts | Product categories already include `Thuốc BVTV`, `Phân bón`, `Giống cây trồng`, `Thuốc thú y`, `Thức ăn chăn nuôi`, while requested Handbook labels use combined/renamed terms | `frontend/lib/products.ts`, `docs/handbook.md` | Do not infer Handbook categories from mutable product category rows |

## External / Current Research

No external research was required. This is an internal taxonomy decision backed by the user request, `docs/base_spec.md` core-value section, `docs/handbook.md`, and current source inspection.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Decision |
|---|---|---|---|---|
| Dedicated Handbook category contract | Stable enum/identifier plus central label catalog | Matches business language; independent from tenant product categories; testable | Requires a compatibility mapping from legacy domain | Selected |
| Reuse `AgriDomain` | Keep CROP/LIVESTOCK/AQUACULTURE/GENERAL | Small schema change | Cannot represent five requested groups or combined first category | Rejected |
| Product-category foreign key | Link Handbook directly to `Category` | Reuses existing table | Tenant-editable product taxonomy can break Handbook meaning and cross-tenant seed behavior | Rejected |

## Design Decisions

### Decision: Stable five-value Handbook taxonomy

- **Context**: The Handbook currently filters by broad cultivation domains, while the product's core value is technical advice across five commercial categories.
- **Selected Approach**: Add a dedicated stable category contract with identifiers `CROP_PROTECTION_AND_FERTILIZER`, `CROP_SEEDLINGS`, `ANIMAL_FEED`, `VETERINARY_DRUGS`, and `LIVESTOCK`; expose exact Vietnamese labels from one catalog.
- **Rationale**: It preserves business wording, keeps the combined first category atomic, and avoids coupling advice data to editable product categories.
- **Status**: Accepted
- **Trade-offs**: More explicit migration work; lower long-term ambiguity and safer tenant isolation.

### Decision: Lossless legacy handling

- **Context**: Existing `AgriDomain` values are broader than the requested catalog.
- **Selected Approach**: Map only where the seed/business rule is explicit; keep unmappable records with `UNCATEGORIZED` and label them `Chưa phân loại` until an owner resolves them.
- **Rationale**: Avoids silently misclassifying technical advice.
- **Status**: Accepted
- **Trade-offs**: The UI must support one non-selectable fallback state for legacy records, while new writes accept only the five canonical values.

## Risks & Mitigations

- Legacy data misclassification — require an explicit mapping table and report unmappable rows.
- FE/BE enum drift — use the named contract below and contract tests.
- UI category labels becoming product-catalog dependent — keep a dedicated Handbook catalog module.

## References

- `README.md` — repository surface and commands.
- `DESIGN.md` — mobile-first visual and interaction rules.
- `docs/base_spec.md` — core values and Handbook behavior.
- `docs/handbook.md` — current Handbook domain and recommendation rules.
- `docs/database-design-retail.md` — current retail schema conventions.
