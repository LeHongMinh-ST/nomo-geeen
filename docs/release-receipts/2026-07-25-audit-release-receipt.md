# Release Receipt — 2026-07-25 (Luồng D: audit/doc cleanup + E2E)

Receipt xác minh mốc `d7e9aca` sau batch A/B/C/D. Chạy read-only trên worktree
`nomo-green-d`, branch `chore/audit-release-receipt`. Không sửa backend/frontend/schema/migrations.

## Bối cảnh

| Mục | Giá trị |
|---|---|
| Commit verify | `d7e9aca` (`docs: sync architecture and changelog`) |
| Diff vs `main` | rỗng — worktree không có code delta, chỉ thêm docs của receipt này |
| Node / pnpm | v22.19.0 / 11.12.0 |
| Postgres | `nomogreen-postgres` healthy, host port **5434** |
| Redis | `nomogreen-redis` healthy, port 6379 |

`backend/.env` là file gitignored và không tồn tại trong worktree này. Đã tạo local từ
`backend/.env.example` với secret dev placeholder (`local-dev-*-secret-worktree-d`,
`AUTH_COOKIE_SECURE=false`) chỉ để chạy verification; không commit, không copy secret thật.

## Ma trận kết quả

| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| Prisma validate | `prisma validate` | **PASS** — schema valid |
| Prisma generate | `prisma generate` | **PASS** — Prisma Client v7.8.0 |
| Prisma migrate status | `prisma migrate status` | **DRIFT** — 1 migration chưa apply trên DB dùng chung (chi tiết dưới) |
| Backend unit/integration | `jest --runInBand` | **PASS** — 53 suites / 458 tests, 1 suite + 1 test skipped |
| Backend build | `nest build` | **PASS** — exit 0 |
| Backend e2e (full) | `jest --config test/jest-e2e.json --runInBand --forceExit` | **1 FAIL / 16 PASS** — fail là pre-existing (chi tiết dưới) |
| Frontend unit | `vitest run` | **PASS** — 29 files / 169 tests |
| Frontend build | `next build` | **PASS** — route `/bao-cao` được generate |

### Lệnh và output rút gọn

```bash
# backend/
./node_modules/.bin/prisma validate
# The schema at prisma/schema.prisma is valid 🚀

./node_modules/.bin/prisma generate
# ✔ Generated Prisma Client (v7.8.0)

./node_modules/.bin/jest --runInBand
# Test Suites: 1 skipped, 53 passed, 53 of 54 total
# Tests:       1 skipped, 458 passed, 459 total

./node_modules/.bin/nest build
# EXIT=0

./node_modules/.bin/jest --config ./test/jest-e2e.json --runInBand --forceExit
# Test Suites: 1 failed, 1 skipped, 16 passed, 17 of 18 total
# Tests:       1 failed, 3 skipped, 84 passed, 88 total
```

```bash
# frontend/
./node_modules/.bin/vitest run
# Test Files  29 passed (29)
#      Tests  169 passed (169)

./node_modules/.bin/next build
# ○ /bao-cao  (Static)
```

## Blocker và ghi nhận trung thực

### 1. E2E `tenant-auth.e2e-spec.ts` FAIL — pre-existing, không do Luồng D

```text
● Tenant auth session lifecycle (e2e) › registers, refreshes, exposes current
  identity, and revokes the session on logout
  expected 201 "Created", got 400 "Bad Request"
  at tenant-auth.e2e-spec.ts:157  (POST /tenant/users, generatePassword: true)
```

Đã xác minh đây là pre-existing:

- Tái hiện khi chạy isolation (`jest ... tenant-auth`): 1 failed / 3 passed.
- Tái hiện **identical** trên worktree `nomo-green` (cùng commit `d7e9aca`, code không khác):
  `expected 201 "Created", got 400 "Bad Request"`, 1 failed / 3 passed.
- `tenant-users.e2e-spec.ts` chạy riêng: **10/10 PASS** — nên không phải lỗi module tenant-users
  nói chung.

Quota/seat denial trong code là `403` (`EntitlementDenialException extends ForbiddenException`)
và `409` (`SEAT_LIMIT_REACHED`), nên `400` đến từ nhánh khác trong chuỗi auth/refresh của test này.
Chưa root-cause vì Luồng D là docs-only; cần một luồng debug riêng.

### 2. Migration chưa apply trên DB dev dùng chung

```text
14 migrations found in prisma/migrations
Following migration have not yet been applied:
20260725010000_partial_return_line_linkage
```

Không tự chạy `migrate dev`/`deploy`: DB `nomogreen@localhost:5434` dùng chung cho 5 worktree,
apply migration là hành động ghi ra state chia sẻ, ngoài scope docs-only. E2E vẫn chạy được vì
migration này chỉ thêm cột/index cho partial returns (`IF NOT EXISTS`), không phải bảng mới.

### 3. `ERR_PNPM_IGNORED_BUILDS`

`pnpm --dir backend install --frozen-lockfile` báo blocked build script cho
`@prisma/engines@7.8.0`, `argon2@0.44.0`, `prisma@7.8.0` do `backend/pnpm-workspace.yaml`
còn placeholder `set this to true or false` trong `allowBuilds`. Không sửa file này (không phải
docs). Thực tế không chặn verification: prisma engine và argon2 vẫn hoạt động (generate PASS,
e2e log ghi `login includes Argon2`).

### 4. Không chạy

- Biome lint/format toàn repo: không chạy vì thay đổi của Luồng D chỉ là markdown.
- `docs/.sync_hash`: **không đổi** — hash sẽ set centrally sau merge theo yêu cầu.

## Doc reconcile

Chỉ sửa `docs/core-business-catalog.md`, hai chỗ mâu thuẫn với §8.6 của
`docs/audit-core-business-catalog-2026-07-22.md`:

| Vị trí | Trước | Sau | Evidence |
|---|---|---|---|
| §9 Con giống | "Partial return/refund ngoài scope" | partial return có route + batch CAS, cash refund vẫn fail-closed | `sales.controller.ts:107`, `purchases.controller.ts:106`, `sales-return.service.ts:192`, `purchase-return.service.ts:200` |
| §13 Báo cáo | "UI reports, partial returns/refunds và báo cáo đầy đủ theo nhóm vẫn là scope tiếp theo" | UI `/bao-cao` + filter/breakdown 5 nhóm Phase 1 đã có; nêu đúng phần chưa có | `frontend/app/(app)/bao-cao/page.tsx`, `components/app/reports/reports-page.tsx:201-209`, `reports.service.spec.ts` businessGroup tests |

Không sửa `docs/system-architecture.md`, `docs/project-changelog.md`, `docs/architecture.md`:
đã kiểm và không còn stale claim về reports/partial returns (`architecture.md:272` chỉ nói về
Stripe/billing, vẫn đúng).

## Câu hỏi chưa giải quyết

1. Root cause `400` ở `tenant-auth.e2e-spec.ts:157` — cần luồng debug riêng, không thuộc docs-only.
2. Ai apply `20260725010000_partial_return_line_linkage` lên DB dev dùng chung, và khi nào.
3. `backend/pnpm-workspace.yaml` `allowBuilds` còn placeholder — cần chốt true/false ở luồng có
   quyền sửa non-docs.
4. `backend/.env` thiếu trong worktree mới: nên thêm hướng dẫn setup vào `backend/README.md`?
