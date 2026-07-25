# Task R1-01: Kind scoped specialized attrs

**Requirement:** R1 — ProductKind decides specialized attrs
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5 day
**Dependencies:** none
**Spec:** specs/product-kind-attrs-regulatory-gates/

## Context

- **Why**: The catalog makes `ProductKind` the authority over specialized attrs, but `REQUIRED_ATTRS` omits every regulatory attr it mandates and nothing rejects attrs belonging to another kind, so a fertilizer can silently carry crop PHI today.
- **Current state**: `backend/src/platform/products/product-contract.ts` owns `KIND_GROUP` and `REQUIRED_ATTRS`; `validateProductContract` is the single funnel used by `ProductsService.create` (`products.service.ts:237`) and `ProductsService.update` (`products.service.ts:344`, which merges `dto.attrs ?? current.attrs`).
- **Target outcome**: Creating or updating a product with supplied attrs enforces the per-kind specialized attrs and rejects wrong-kind keys with a `BadRequestException` naming the offending key, while updates that omit `attrs` keep working for legacy rows.

## Constraints

- **MUST**: Accept camelCase and snake_case spellings, and treat zero as a valid day count or percentage (a pesticide with no waiting period is real data).
- **SHOULD**: Derive the forbidden-key set per kind as the union of the other kinds' specialized keys minus its own, instead of hand-maintaining a deny list.
- **MUST NOT**: Change Prisma schema, DTOs, controllers, or any Handbook/payment/report file; do not enforce the new specialized rules when `update` merges stored attrs (R2b).
- **SCOPE**: Implement only the behavior mapped to R1 and the approved `scope_lock`; do not add out-of-scope features or leave scoped acceptance criteria unwired.

## Steps

- [x] 1. Declare the specialized numeric attr table in `backend/src/platform/products/product-contract.ts`
  - Makes `ProductKind` the deciding source for which regulatory attrs a product must carry.
  - Add `SPECIALIZED_NUMERIC_ATTRS: Partial<Record<ProductKind, string[]>>` with `PESTICIDE` → `phiDays`, `reiDays`; `VET_DRUG` → `withdrawalMeatDays`, `withdrawalMilkDays`, `withdrawalEggDays`; `FERTILIZER` → `nitrogenPercent`, `phosphorusPercent`, `potassiumPercent`. Leave `REQUIRED_ATTRS` untouched.
  - _Requirements: 1.1_

- [x] 2. Add the alias resolver and numeric check
  - Lets the API accept both spellings already used across the codebase without inventing a new convention.
  - Add an alias map mirroring `SALE_ADVISORY_ATTR_KEYS` in `sale-eligibility-policy.ts` (camelCase + snake_case), and a helper that reads the first present alias and rejects absent, non-numeric, non-finite, or negative values with `BadRequestException` naming the key and the kind. Zero is valid.
  - _Requirements: 1.3_

- [x] 3. Reject wrong-kind specialized attrs
  - Encodes the catalog prohibitions: no PHI/REI on fertilizer or veterinary drugs, no withdrawal on crop kinds.
  - Derive the forbidden set for a kind as the union of every other kind's specialized keys (all aliases) minus its own, then throw on the first offender naming that key.
  - _Requirements: 1.2_

- [x] 4. Thread the `attrsSupplied` boundary through `ProductsService`
  - Keeps products created before this slice editable, per R2b.
  - Add a fourth `attrsSupplied` parameter to `validateProductContract`; pass `true` from `create` (`products.service.ts:237`) and `dto.attrs !== undefined` from `update` (`products.service.ts:344`). Run the specialized and forbidden checks only when it is true; base `REQUIRED_ATTRS` behavior stays unconditional.
  - _Requirements: 1.4_

- [x] 5. Verification implementation
  - Extend `backend/src/platform/products/product-contract.spec.ts` with unit tests: each kind's specialized attrs required; snake_case accepted; zero accepted; negative and non-numeric rejected; PHI on `FERTILIZER` and on `VET_DRUG` rejected; withdrawal on `PESTICIDE` rejected; nutrient keys on non-fertilizer rejected; `attrsSupplied: false` skips the new rules.
  - _Requirements: 1_

## Requirements

- 1.1 — R1: per-kind specialized attrs (PESTICIDE PHI/REI, VET_DRUG withdrawal trio, FERTILIZER NPK) are server-authoritative.
- 1.2 — R2: attrs belonging to a different kind are rejected with the offending key named.
- 1.3 — R3: numeric regulatory attrs accept finite non-negative numbers or numeric strings, in either spelling.
- 1.4 — R2b: the new rules apply only when the caller supplies attrs, so implicit merges on update stay backward compatible.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/products/product-contract.ts` | Modify | Specialized attr table, alias resolver, numeric check, forbidden-key rejection, `attrsSupplied` parameter |
| `backend/src/platform/products/product-contract.spec.ts` | Modify | Unit coverage for required, wrong-kind, typing, and legacy-boundary cases |
| `backend/src/platform/products/products.service.ts` | Modify | Pass `attrsSupplied` from `create` and `update` |

## Completion Criteria

- [x] Creating a `PESTICIDE` without `phiDays` or without `reiDays` is rejected with a 400 naming the missing key.
- [x] Creating a `VET_DRUG` without any one of `withdrawalMeatDays`/`withdrawalMilkDays`/`withdrawalEggDays` is rejected, and all three are validated independently.
- [x] Creating a `FERTILIZER` without `nitrogenPercent`/`phosphorusPercent`/`potassiumPercent` is rejected.
- [x] Supplying `phiDays` on a `FERTILIZER` or a `VET_DRUG`, or a withdrawal key on a crop kind, is rejected with the offending key named.
- [x] Numeric strings and zero are accepted; negative and non-numeric values are rejected.
- [x] An update that does not send `attrs` still succeeds on a product created before this slice.
- [x] `REQUIRED_ATTRS` behavior for the remaining kinds is unchanged and existing product tests still pass.
- [x] No Prisma, DTO, controller, frontend, Handbook, payment, or report file is touched.

## Evidence

This section is both the task-level test plan and the proof checklist. Keep it short, exact, and executable.
Select the proof by task risk; do not run every test type for every task.

- Logic/data/validator task: include unit tests.
- Stateful UI/component task: include component or integration tests.
- Cross-module/API/state flow task: include integration tests.
- User-facing end-to-end workflow: include E2E/UI flow verification.
- Layout/theme/responsive task: include visual/runtime viewport checks.
- Interactive UI task: include accessibility checks when keyboard, focus, labels, or ARIA can regress.
- Scaffold/release task: include smoke build/test/dev-server checks.
- Performance/security checks are required only when the requirement, risk, or touched surface calls for them.

- [x] Automated verification (unit/component/integration/E2E as applicable)
  - Command(s): `pnpm --dir backend exec prisma validate`, `pnpm --dir backend build`, `pnpm --dir backend test -- --runInBand product-contract products.service`
  - Expected proof: exit code 0 with the new product-contract cases listed as passing, and no regression in the existing products suite.
- [x] Artifact / runtime verification
  - Inspect: `backend/src/platform/products/product-contract.ts`
  - Expect: the specialized attr table, alias map, numeric check, and derived forbidden-key set exist in the single validator reached by both write paths.
- [x] Runtime reachability verification
  - Entrypoint/caller: `backend/src/platform/products/products.service.ts` — `create()` at `:237` and `update()` at `:344`
  - Expect: `validateProductContract` is invoked from both, now with the `attrsSupplied` argument; a repo-wide search confirms no other writer of `Product.attrs`, so the rules cannot be bypassed.
- [x] Contract / negative-path verification
  - Check: `phiDays` supplied on `FERTILIZER`; withdrawal key supplied on `PESTICIDE`; negative `reiDays`; update without `attrs` on a legacy product.
  - Expect: the first three throw `BadRequestException` naming the offending key; the last succeeds unchanged.

### Verification Receipt — 2026-07-25

Toolchain note: worktree ban đầu chưa cài `node_modules` nên mọi lệnh `pnpm` fail `MODULE_NOT_FOUND`. Đã khắc phục bằng `pnpm install --frozen-lockfile` (root, backend, frontend). Repo không phải pnpm workspace nên phải cài riêng từng package. Ngoài ra `backend/pnpm-workspace.yaml` còn placeholder `set this to true or false` trong `allowBuilds:` khiến pnpm 11 chặn mọi script (`ERR_PNPM_IGNORED_BUILDS`) — defect có sẵn, giống hệt repo chính, nằm ngoài scope Luồng A, nên các lệnh dưới gọi thẳng binary local thay vì qua pnpm script. `backend/.env` được tạo từ `.env.example` vì `prisma.config.ts` gọi `process.loadEnvFile?.('.env')`; file này gitignored (`backend/.gitignore:39`), không chứa secret thật.

```
$ node node_modules/prisma/build/index.js validate
The schema at prisma/schema.prisma is valid 🚀

$ ./node_modules/.bin/nest build
BUILD_EXIT=0

$ ./node_modules/.bin/jest --runInBand product-contract products.service sale-eligibility-policy
Test Suites: 3 passed, 3 total
Tests:       50 passed, 50 total
Time:        0.633 s

$ REDIS_URL=redis://127.0.0.1:6379 ./node_modules/.bin/jest --runInBand
JEST_EXIT=0
MODULE_NOT_FOUND occurrences: 0
Test Suites: 1 skipped, 53 passed, 53 of 54 total
Tests:       1 skipped, 477 passed, 478 total
```

Artifact: `product-contract.ts` chứa `SPECIALIZED_NUMERIC_ATTRS`, `SPECIALIZED_ATTR_ALIASES`, `assertNonNegativeNumber`, `forbiddenAliasesFor`, `validateSpecializedAttrs`.

Runtime reachability:
```
$ grep -rn "validateProductContract" src --include=*.ts | grep -v spec
src/platform/products/products.service.ts:237:  validateProductContract(   # create → attrsSupplied=true
src/platform/products/products.service.ts:349:  validateProductContract(   # update → dto.attrs !== undefined

$ grep -rn "product.create(\|product.update(\|product.updateMany(\|product.upsert(" src --include=*.ts | grep -v spec
src/platform/products/products.service.ts:268:  tx.product.create({
src/platform/products/products.service.ts:395:  tx.product.update({
src/platform/products/products.service.ts:461:  tx.product.updateMany({   # soft-delete, không ghi attrs
```
PASS — không có writer `Product.attrs` nào khác né được validator.

Negative-path: 12 case trong `product-contract.spec.ts` phủ required/wrong-kind/typing/zero/legacy-boundary, tất cả pass trong lần chạy trên.

Biome: `./node_modules/.bin/biome check` trên 5 file còn đúng 2 lỗi format, cả hai nằm ngoài diff (đã đối chiếu với bản HEAD dựng trong `src/platform/__biome_base__` — baseline HEAD cũng 2 lỗi ở chính 2 file đó). Không phát sinh lỗi mới.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Tightened required attrs lock legacy products out of editing | High | R2b `attrsSupplied` boundary: implicit merges skip the new rules; covered by a dedicated test |
| Zero-day regulatory values misread as missing | Medium | The numeric check accepts zero; sale gates fire only on positive values |
| Alias drift between the product validator and the sale policy | Low | The alias map mirrors `SALE_ADVISORY_ATTR_KEYS`, asserted by tests using both spellings |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
