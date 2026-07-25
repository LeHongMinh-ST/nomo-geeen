# Task R2-01: Kind scoped regulatory gates

**Requirement:** R2 — Kind-scoped PHI/REI and withdrawal sale gates
**Status:** done
**Priority:** P1
**Estimated Effort:** 0.5 day
**Dependencies:** R1-01
**Spec:** specs/product-kind-attrs-regulatory-gates/

## Context

- **Why**: The existing regulatory hard gates are kind-agnostic: the PHI branch fires for any kind carrying `phiDays`, the withdrawal branch collapses meat/milk/egg into the first defined value via `.find(...)`, and there is no REI branch at all. The catalog requires PHI/REI to be crop-only and the three withdrawal periods to stay separate.
- **Current state**: `backend/src/platform/sales/sale-eligibility-policy.ts` exposes `assertSaleRegulatoryDates`, already called before stock mutation on all three sale paths: order create (`sales.service.ts:458`), draft completion (`sales.service.ts:676`), quick sale (`sales.service.ts:1037`). Denials are audited through `recordSaleDenial` (`sales.service.ts:82`).
- **Target outcome**: PHI and REI gate only `PESTICIDE`, withdrawal gates only `VET_DRUG` and names the active type, both denials carry `productKind`, and every path still denies before any stock write with a `SALE_DENY` audit entry.

## Constraints

- **MUST**: Reuse `PRODUCT_PHI_ACTIVE` and `PRODUCT_WITHDRAWAL_ACTIVE` so `frontend/lib/sales-api-error.ts` needs no edit; keep missing event dates non-blocking.
- **SHOULD**: Evaluate meat, milk, and egg in an explicit loop so the message names the type that is still active.
- **MUST NOT**: Add reason codes, Prisma columns, DTO fields, frontend changes, or touch any Handbook/payment/report file; do not default or infer a regulatory value when attrs are missing.
- **SCOPE**: Implement only the behavior mapped to R2 and the approved `scope_lock`; do not add out-of-scope features or leave scoped acceptance criteria unwired.

## Steps

- [x] 1. Scope the PHI branch to `PESTICIDE` in `backend/src/platform/sales/sale-eligibility-policy.ts`
  - Stops a fertilizer or veterinary product with legacy `phiDays` from being gated on a crop rule.
  - Guard the existing branch on `product.productKind === ProductKind.PESTICIDE`, keep the `PRODUCT_PHI_ACTIVE` reason and `field: 'harvestDate'`, and attach `productKind` to the payload.
  - _Requirements: 2.1_

- [x] 2. Add the REI branch on the same supplied harvest date
  - Blocks a sale when the field is still inside the re-entry interval, which the catalog tracks separately from PHI.
  - Add a sibling branch reading `reiDays` through the same advisory extractor, computing the clearance date the same way as PHI, reusing `PRODUCT_PHI_ACTIVE` with `field: 'harvestDate'` and a message naming the re-entry interval.
  - _Requirements: 2.2_

- [x] 3. Make the withdrawal gate veterinary-only and per type
  - A milk withdrawal must not be satisfied by a meat value; the collapsing `.find(...)` hides that today.
  - Guard on `product.productKind === ProductKind.VET_DRUG` and replace `.find(...)` with an explicit loop over meat, milk, egg; throw `PRODUCT_WITHDRAWAL_ACTIVE` with `field: 'withdrawalEndDate'`, `productKind`, and a message naming the active type.
  - _Requirements: 2.3_

- [x] 4. Realign the existing spec fixtures
  - The current withdrawal tests rely on the un-scoped branch with a `PESTICIDE`-defaulted `baseProduct()`, so they must move to `VET_DRUG` to keep asserting real behavior.
  - Update `sale-eligibility-policy.spec.ts` cases that pass withdrawal attrs on the default product to set `productKind: ProductKind.VET_DRUG`; do not weaken or delete assertions.
  - _Requirements: 2.3_

- [x] 5. Verification implementation
  - Add boundary tests: harvest exactly on and one day before each clearance date; REI longer than PHI denying when PHI alone would pass; each withdrawal type active independently; withdrawal end date exactly on and one day before the sale date; a non-pesticide carrying legacy `phiDays` not gated; a non-veterinary carrying withdrawal keys not gated; missing dates passing on every kind.
  - _Requirements: 2_

## Requirements

- 2.1 — R4: PHI gates only `PESTICIDE`; other kinds are not gated even with legacy keys.
- 2.2 — R4: REI is enforced as a hard gate on the supplied harvest date.
- 2.3 — R5: withdrawal gates only `VET_DRUG` and evaluates meat, milk, and egg independently.
- 2.4 — R6: missing dates stay non-blocking, reason codes are unchanged, denial precedes stock mutation on all three paths, and `SALE_DENY` is still emitted.

## Related Files

| Path | Action | Description |
|---|---|---|
| `backend/src/platform/sales/sale-eligibility-policy.ts` | Modify | Kind-scoped PHI, new REI branch, per-type veterinary withdrawal loop, `productKind` in payloads |
| `backend/src/platform/sales/sale-eligibility-policy.spec.ts` | Modify | Realign withdrawal fixtures to `VET_DRUG` and add the boundary cases |

## Completion Criteria

- [x] A `PESTICIDE` line whose harvest date falls inside `phiDays` is denied with `PRODUCT_PHI_ACTIVE`; a harvest date exactly on the clearance date passes.
- [x] A `PESTICIDE` line whose harvest date falls inside `reiDays` is denied even when `phiDays` alone would allow it.
- [x] A non-pesticide product carrying `phiDays` or `reiDays` in legacy attrs is not gated.
- [x] A `VET_DRUG` line is denied when any single withdrawal type is positive and the withdrawal end date is on or after the sale date, and the message names that type.
- [x] A non-veterinary product carrying withdrawal keys is not gated.
- [x] Lines without `harvestDate` or `withdrawalEndDate` are never denied by this policy, and no regulatory value is defaulted.
- [x] Reason codes stay `PRODUCT_PHI_ACTIVE` and `PRODUCT_WITHDRAWAL_ACTIVE`, so `frontend/lib/sales-api-error.ts` and its test pass without modification.

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
  - Command(s): `pnpm --dir backend build`, `pnpm --dir backend test -- --runInBand sale-eligibility-policy sales.service`, `pnpm --dir frontend test -- sales-api-error`
  - Expected proof: exit code 0 with the new boundary cases passing, the realigned withdrawal cases passing, and the frontend mapper suite green without edits.
- [x] Artifact / runtime verification
  - Inspect: `backend/src/platform/sales/sale-eligibility-policy.ts`
  - Expect: PHI and REI branches guarded on `PESTICIDE`, an explicit meat/milk/egg loop guarded on `VET_DRUG`, `productKind` present in both payloads, and only the two pre-existing reason codes in use.
- [x] Runtime reachability verification
  - Entrypoint/caller: `backend/src/platform/sales/sales.service.ts` — order create `:458`, draft completion `:676`, quick sale `:1037`
  - Expect: `assertSaleRegulatoryDates` is still invoked on all three paths ahead of the FEFO allocation loop, and `recordSaleDenial` (`:82`) still converts the structured 422 into a `SALE_DENY` audit entry.
- [x] Contract / negative-path verification
  - Check: `FERTILIZER` with legacy `phiDays` and a near harvest date; `PESTICIDE` with withdrawal keys and an active withdrawal end date; `VET_DRUG` with only `withdrawalMilkDays` positive; lines with no dates at all.
  - Expect: the first two pass the policy, the third is denied naming milk, and the fourth is never denied.

### Verification Receipt — 2026-07-25

Toolchain note: xem receipt R1-01. Worktree thiếu `node_modules` gây `MODULE_NOT_FOUND` ở phiên trước; đã cài xong, không tái hiện. Lệnh gọi thẳng binary local vì `backend/pnpm-workspace.yaml` còn placeholder `allowBuilds:` chặn pnpm script (defect có sẵn, ngoài scope).

```
$ ./node_modules/.bin/nest build
BUILD_EXIT=0

$ ./node_modules/.bin/jest --runInBand product-contract products.service sale-eligibility-policy
Test Suites: 3 passed, 3 total
Tests:       50 passed, 50 total

$ REDIS_URL=redis://127.0.0.1:6379 ./node_modules/.bin/jest --runInBand
JEST_EXIT=0
Test Suites: 1 skipped, 53 passed, 53 of 54 total
Tests:       1 skipped, 477 passed, 478 total

$ cd frontend && ./node_modules/.bin/vitest run sales-api-error
Test Files  1 passed (1)
Tests  58 passed (58)
```
Frontend suite xanh với **zero** file frontend bị sửa → reason code không đổi, đúng ràng buộc MUST.

Artifact: `sale-eligibility-policy.ts` — PHI (`:211`) và REI (`:221`) cùng guard `productKind === PESTICIDE && harvestDate`; vòng lặp `WITHDRAWAL_PERIODS` (`:237`) guard `productKind === VET_DRUG && withdrawalEndDate >= now`; cả hai payload spread `productKind`; chỉ dùng 2 reason code cũ (`SaleEligibilityReason` không thêm phần tử).

Runtime reachability:
```
$ grep -n "assertSaleRegulatoryDates\|assertProductSaleEligible" src/platform/sales/sales.service.ts
458: assertProductSaleEligible(product);            # order create
459: assertSaleRegulatoryDates(product, line);
676: assertProductSaleEligible(line.product, tenantId);   # draft completion (tenant-scoped)
677: assertSaleRegulatoryDates(line.product, line);
1037: assertProductSaleEligible(product);           # quick sale
1038: assertSaleRegulatoryDates(product, line);

$ grep -n "recordSaleDenial\|SALE_DENY" src/platform/sales/sales.service.ts
82:  private async recordSaleDenial(
104:    action: AuditAction.SALE_DENY,
596 / 622 / 819:  recordSaleDenial(..., 'ORDER', error)
1267:            recordSaleDenial(..., 'QUICK_SALE', error)
```
PASS — cả 3 path gate trong vòng duyệt line **trước** mọi `tx.saleLineBatch.createMany` / `tx.stock.findFirst`, nên deny xảy ra trước khi chạm tồn kho. Draft completion truyền `tenantId` → tenant scope. `SALE_DENY` phủ cả ORDER lẫn QUICK_SALE.

Negative-path: 11 case trong `sale-eligibility-policy.spec.ts` — FERTILIZER mang `phiDays`/`reiDays` không bị gate; PESTICIDE mang withdrawal key không bị gate; `it.each` 3 loại withdrawal khẳng định đúng message meat/milk/egg riêng biệt; biên đúng ngày clearance và trước 1 ngày; thiếu date không bao giờ deny. Tất cả pass.

DTO: `create-sales-order.dto.ts` và `create-quick-sale.dto.ts` đã có `harvestDate`/`withdrawalEndDate` với `@IsOptional() @IsISO8601({ strict: true })` — không cần sửa.

Biome: 2 lỗi format còn lại ở `sale-eligibility-policy*` nằm ngoài diff, trùng baseline HEAD. Không phát sinh lỗi mới.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Kind-scoping PHI weakens an existing gate for non-pesticide rows | Medium | The catalog forbids PHI on other kinds and R1-01 rejects those keys on new writes; tests pin both directions |
| Adding REI denies sales that previously succeeded | Medium | REI fires only when the product supplies a positive `reiDays` and the line supplies a harvest date; missing data stays non-blocking |
| Per-type withdrawal loop changes error text | Low | Reason code and field are unchanged; only `message` gains the type name, and the frontend maps on `reason` |
| Existing withdrawal fixtures silently stop exercising the branch | Medium | Step 4 realigns them to `VET_DRUG` instead of deleting them |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
