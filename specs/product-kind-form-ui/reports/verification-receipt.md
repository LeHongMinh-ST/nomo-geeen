# ProductKind form verification receipt

Date: 2026-07-24 (Asia/Ho_Chi_Minh)

## Scope

Frontend-only ProductForm, ProductKind catalog, tenant product API types/mapping, and create/edit route reachability.

## Evidence

- `pnpm test` from `frontend`: **22 test files / 90 tests passed**.
- Changed-scope Biome lint: **passed**; full frontend lint remains blocked by 4 errors and 21 warnings in unrelated pre-existing sales/admin/handbook files.
- `pnpm exec next build --webpack`: **passed**; TypeScript passed and 43 routes were generated, including `/san-pham/them`, `/san-pham/[id]`, and `/san-pham`.
- `node .claude/scripts/validate-spec-output.cjs specs/product-kind-form-ui`: **passed**.
- ProductForm tests prove compatible kind filtering, specialist-field gating, required-attr rejection, canonical submit payload, normalized attrs, edit hydration, legacy crop fallback, and inline API error mapping.
- `createUserApiError` tests prove NestJS string/array messages are preserved for field mapping while the user-facing error remains Vietnamese.

## Known environment baseline

- Default Turbopack build is blocked in the managed sandbox when it tries to create a process/bind a port (`Operation not permitted`). Webpack build is the independent passing build proof.
- Full frontend lint remains a baseline blocker: 4 errors and 21 warnings are outside the ProductKind form/API/type surface; all changed ProductKind files lint clean.

## Review

Adversarial follow-up review of the ProductKind form/API/type surface: **PASS**, zero Critical findings. Resolved field-level accessibility/error mapping, edit hydration/legacy fallback coverage, and NestJS API-message preservation.
