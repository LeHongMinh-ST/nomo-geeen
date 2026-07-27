# Project Changelog

Tất cả thay đổi đáng chú ý của NomoGreen Platform được ghi nhận tại đây.
Format theo [Keep a Changelog](https://keepachangelog.com/), tuân thủ [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- **Tồn kho: tile cảnh báo HSD toàn tenant** — màn `Tồn kho` nối 2 tile "Còn dưới 30
  ngày"/"Đã hết hạn" vào `GET /tenant/inventory/expiry-summary` (đã có sẵn từ nhánh
  `feat/expiry-tiers`) thay vì đếm theo trang hiện tại; thêm trạng thái tải/lỗi/thử lại độc
  lập với danh sách phân trang. Fresh verification: frontend targeted 7/7, full 34 files/214 tests, Biome lint, and Next build pass; backend unit 60 suites (607 passed, 1 skipped). Backend E2E remains an environment follow-up (17 failed, 4 passed, 1 skipped) because the isolated/shared databases have migration/schema drift; no migration or schema was changed. Spec `specs/inventory-expiry-tenant-summary-ui/`.
- **Quota-only plan entitlements** — Starter, Professional và Enterprise đều nhận toàn bộ
  feature catalog; các gói chỉ khác nhau bằng quota số lượng và dung lượng. Billing seed/API
  quản trị plan tự động gắn full catalog, mở `advanced_mode` cho Starter.
- **Release receipt cho mốc `d7e9aca`** — thêm `docs/release-receipts/2026-07-25-audit-release-receipt.md`
  ghi ma trận verification (Prisma validate/generate, backend 458 tests, backend build, e2e 16/17
  suites, frontend 169 tests, frontend build) cùng blocker: e2e `tenant-auth` FAIL pre-existing và
  migration `20260725010000_partial_return_line_linkage` chưa apply trên DB dev dùng chung.
- **Livestock CAS/recovery hardening** — added explicit recovery approval, terminal health
  states, version CAS across adjustments and returns, and distinct insufficient-stock versus
  stale-version errors with audit coverage.
- **Partial returns foundation** — added line/batch returnability tracking, idempotent partial
  sales/purchase return routes, Serializable stock/batch mutations, proportional debt adjustment,
  and fail-closed cash-refund handling.
- **Operational Reports Phase 1** — added `/bao-cao`, tenant-scoped stock/sales summaries,
  five-group BusinessGroup filters/breakdowns, loading/error/empty/retry states, and shared
  structured frontend error mapping.
- **Livestock batch state machine (first slice)** — added tenant-scoped `ProductBatch.healthState`/`version`, HEALTHY-to-blocked transition API with transactional `LIVESTOCK_STATE_CHANGE` audit, FEFO health filtering/version CAS, and inventory batch state/version exposure. Recovery, adjustment/return CAS, and management UI remain follow-up work.
- **Reports HTTP contract hardening** — stock/sales summaries now serialize BigInt and Decimal values as JSON-safe strings while preserving tenant and date-range behavior.
- **Frontend sales error mapping** — added safe Vietnamese copy for user-actionable structured sales reasons, including livestock/regulatory gates and return/order lifecycle errors; internal conflict details continue using generic fallback.
- **Business catalog audit re-sync** — cập nhật lại trạng thái Reports, StockAdjustment, PHI/withdrawal, returns, SALE_DENY và livestock safety theo source commit `64c4918`; ghi rõ các phần partial và thứ tự ưu tiên tiếp theo.
- **Sale regulatory date gates** — order and quick-sale lines now snapshot optional harvest/withdrawal dates; PHI and active veterinary-withdrawal dates are rejected before stock mutation, including draft-order completion revalidation. Regulatory master data, prescription calculation, and frontend fields remain out of scope.
- **Verification baseline repair** — restored the historical admin billing migration fixture required by `billing-foundation.spec.ts`; full backend verification now passes 399 tests across 49 suites (1 suite skipped).
- **Handbook order snapshot** — sales order creation now accepts an optional tenant-scoped disease reference plus consultation/quantity metadata and stores immutable disease-name/context snapshots on Sale; quick-sale and AI diagnosis remain out of scope.
- **Core operational reports** — added tenant-scoped stock/batch summary and bounded completed-sales summary endpoints with permission/entitlement guards; charts, exports, and financial accounting remain separate.
- **Atomic full purchase return** — added guarded `POST /tenant/purchases/:id/return`, decrementing stock and received batches, compensating supplier debt transactionally, preventing duplicate returns, and writing `PURCHASE_RETURN` movements/audit. Partial returns, payment settlement, and frontend UI remain out of scope.
- **Atomic full sales return** — added guarded `POST /tenant/sales/orders/:id/return`, restoring aggregate stock and original FEFO batch allocations, compensating customer debt transactionally, preventing duplicate returns, and writing `SALE_RETURN` movements/audit. Partial returns, payment refunds, and purchase returns remain out of scope.
- **Livestock sale safety gate** — rejects `LIVESTOCK_SEED` products marked `QUARANTINED`, `SICK`, `DEAD`, or `REJECTED` through the shared sale eligibility policy on order create, complete, and quick sale; 91 focused sales tests, backend build, and Prisma validation pass. Persistent livestock state remains out of scope.
- **Tenant business audit coverage** — wired transactional audit events and permission-denial logging across tenant product, purchase, sales, stock-adjustment, and handbook boundaries; verified with 119 focused tests, live PostgreSQL rollback coverage, Prisma validation, and backend build.
- **Core catalog verification sync** — re-verified batch/FEFO lifecycle (4 suites, 99 tests) and stock-adjustment reasons/API (3 suites, 21 tests), with backend build and Prisma schema validation passing; closed the corresponding spec status drift.
- **Frontend ProductKind contract** — added the ordered BusinessGroup/ProductKind catalog, required specialist-attribute metadata, tenant-enabled group lookup, and API/Product mapping for `businessGroup`, `productKind`, and `attrs`.
- **Dynamic ProductKind product form** — ProductForm now loads tenant-enabled groups, filters compatible kinds, renders catalog-driven specialist fields, validates required attrs, confirms destructive kind changes, normalizes create/update payloads, hydrates edit state, and preserves the mobile sticky save action. Spec `specs/product-kind-form-ui/` is verified complete.

- **Sale checkout eligibility hardening** — complete-order revalidation now loads `Product.tenantId` and `deletedAt`, rejecting soft-deleted or cross-tenant line products with `PRODUCT_UNSELLABLE` before FEFO or stock mutation. Added regression coverage; targeted sales verification is 85/85.

- **Crop-input ProductKind catalog (BA)** — added `BIOLOGICAL_PRODUCT`, `GROWTH_REGULATOR`, `SOIL_AMENDMENT` to `ProductKind` + migration; mapped to `CROP_INPUTS` in product contract with required `composition` attrs; documented six types in `docs/core-business-catalog.md` §4.0.

- **Tenant stock adjustments (core reasons)** — added `reasonCode` on adjustment lines, closed ProductKind reason policy, Serializable complete dual-write for Stock/ProductBatch/StockMovement `ADJUSTMENT`, and tenant API `GET/POST /tenant/stock-adjustments` + `POST :id/complete` (`inventory:view` / `inventory:edit`). Returns, transfers, FE cycle-count, and aquaculture reason packs remain out of scope.

- **Sale checkout FE gates** — shared `mapSalesApiError` for PRODUCT_LOCKED/RECALLED/INACTIVE/UNSELLABLE (+ stock/customer copy locked); wired quick-sale / order-form / order-detail action errors; optional PHI/REI/withdrawal advisory strip (display-only, hide if meta missing). Spec `specs/sale-checkout-fe-gates/`. No harvest hard-block.

- **Sale checkout eligibility gates (gap #4 partial)** — pure `sale-eligibility-policy` + wire on `createOrder` / `completeOrder` / `createQuickSale` before stock; hard reject inactive/locked/recalled/missing with structured 422 reasons; complete re-loads product flags (not DRAFT-only). PHI/REI harvest hard-block, 7 kind-specific hard branches, livestock SM, FE PHI UI, and tenant audit deny remain open. Spec `specs/sale-checkout-kind-gates/`; re-audit §8.4 in `docs/audit-core-business-catalog-2026-07-22.md`.

- **Frontend tenant sales client and customer picker** — added typed tenant-scoped order list/detail/create/complete/cancel calls and a tenant-backed customer picker with debounced search, loading/error/retry states, and an explicit walk-in option. Order-list/detail seed migration remains staged for R5/R6; no new seed fallback was added.
- **Tenant sales order lifecycle and cancellation** — added canonical tenant-scoped `/tenant/sales/orders` list/detail/create/complete/cancel APIs with DRAFT-only status cancellation, Serializable retry and idempotent order creation/replay, plus atomic completed-order stock restoration and conditional original-debt compensation. Original sale history remains append-only; returned sales and unsafe/cross-tenant transitions are rejected. The existing `/tenant/sales/quick` shortcut remains separate.
- **Tenant debt management** — added tenant-scoped debt list/detail APIs and real `/cong-no` UI data flows, plus idempotent customer receipt vouchers with conditional balance decrement and atomic debt-ledger recording. Supplier receipt creation remains unsupported.
- **Admin permission settings** — added the read-only `/admin/settings/permissions` catalog, gated by `admin.permission:view` and limited to role-assigned `admin.*` permissions.
- **Tenant profile settings API** — added authenticated `GET/PATCH /auth/profile`, atomically updating the tenant user's full name/contact fields and `TenantSettings.address` with tenant audit logging; Settings and app-shell desktop/mobile identity now read and persist the current auth profile.
- **Tenant supplier management** — added tenant-scoped supplier CRUD/search/soft-delete hardening plus authenticated `/nha-cung-cap` list, detail, create, edit, delete, pagination, validation-error, and read-only payable UI flows. Supplier purchase history, debt vouchers, and cooperation-policy editing remain out of scope.
- **Tenant customer management** — wired authenticated `/khach-hang` list, search, detail, create, edit, and soft-delete screens to tenant customer APIs with read-only server balance; transaction history and debt mutation remain out of scope.
- **Tenant product management** — added tenant-scoped product detail, catalog lookups, update, and soft-delete APIs with live permission/feature enforcement; replaced user-app product seed mutations with authenticated API-backed list, detail, create, edit, and delete flows. Inventory mutations remain out of scope.
- **Admin tenant provisioning (partial)** — added transactional `POST /admin/tenants` (guard `admin.tenant:create`) tạo Tenant + OWNER user đầu tiên + 3 role per-tenant (OWNER/MANAGER/STAFF) + audit `TENANT_CREATE`/`USER_CREATE` trong một `prisma.$transaction`; hỗ trợ password nhập tay hoặc sinh tự động (one-time reveal), `seatBonus` mặc định 10, ánh xạ `P2002` → 409 `SLUG_TAKEN`/`USERNAME_TAKEN` tương thích driver adapter-pg. UI và verify end-to-end còn pending.
- **Quản lý người dùng cửa hàng (tenant users)** — thêm CRUD `admin/tenants/:tenantId/users` (guard `admin.tenant-user:{view,manage}`): list phân trang kèm `SeatUsage` (không lộ `passwordHash`), tạo/sửa (whitelist `fullName/username/phone/email`)/đổi role/vô hiệu hóa/kích hoạt lại/reset mật khẩu. Cưỡng chế seat trong transaction `Serializable` (409 `SEAT_LIMIT_REACHED`), bảo vệ OWNER cuối cùng (409 `LAST_OWNER`), cô lập cross-tenant (404), reset ép `mustChangePassword=true`. Audit hiện chỉ ghi `USER_CREATE` (spec-gap enum, chờ migration). UI panel còn pending.
- **Admin tenant management** — list/detail/edit/status/export for platform tenants (`/admin/cua-hang`), `admin.tenant:*` guards, formula-safe CSV, optimistic concurrency, lifecycle transitions (metadata-only), audit `TENANT_*`.
- **Admin RBAC & user management** — multi-role admin assignments, permission catalog, guarded role/admin APIs, audit integration, and admin navigation gating.
- **Documentation sync** — architecture and database docs now reflect identifier login, admin RBAC, tenant seat quotas, and the manual subscription/entitlement boundary.
- **Admin billing control plane (partial)** — additive plan/audit foundation, entitlement/quota guard primitives, guarded plan catalog API, and manual subscription lifecycle routes with real Postgres/Redis E2E acceptance; entitlement write integration and UI remain pending.
- **Permission labels** — admin permission catalog now carries Vietnamese labels/groups for clearer RBAC administration.
- **Tenant entitlement enforcement** — added tenant JWT login with tenant-scoped identity, real `/tenant/products` read/write routes, atomic `maxProducts` counter reservations, and downgrade-safe product reads with Postgres/Redis E2E coverage.
- **Admin billing UI** — added permission-gated `/admin/plans` catalog and tenant-detail subscription lifecycle panel with current/history, expiry, quota/feature summaries, overage visibility, manual actions, and stale-write refetch.
- **Subscription history bounds** — added stable server-side pagination (`pageSize <= 100`) for tenant subscription history and HTTP acceptance evidence using 1,000 seeded rows, 30 warmups, 100 measured requests, p95 8.43ms on Node v24.14.0.
- **Admin activity audit query API** — added guarded `GET /admin/audit-logs` and `GET /admin/audit-logs/:id` with `admin.audit:view`, bounded filters, stable pagination, total counts, and recursive masking of sensitive keys in detail `before`/`after` snapshots; no retention or export endpoint is included.
- **Admin activity audit UI** — added permission-gated `/admin/audit-log` with typed API access, responsive table/cards, filters, pagination, detail disclosure, and explicit loading/empty/error states; dashboard recent activity now reads the newest five audit rows and links to the full log.
- **Tenant authentication preparation** — finalized tenant auth contracts for separate JWT/cookie/Redis namespaces, identifier login, rotating refresh sessions, tenant permissions, forced password change, and Origin/CSRF checks; implementation remains pending verification.
- **Public tenant registration backend** — added validated `POST /auth/register`, reused the provisioning transaction for Tenant + OWNER + three tenant roles, returned canonical public identity/access token, and set the HttpOnly `nomo_user_rt` cookie without exposing credentials.
- **Tenant login backend** — upgraded `POST /auth/login` from access-only to tenant-scoped username/email/phone login with current permissions, rotating user refresh cookie, transactional `lastLoginAt` + `LOGIN` audit, generic decoy failures, and AppModule reachability proof.
- **Login UX simplification** — removed the required tenant code from user login; the backend resolves the tenant from the credential match and rejects ambiguous duplicate credentials without leaking account details.
- **Tenant membership scope** — current user accounts belong to exactly one tenant; selecting a store for multi-tenant accounts is explicitly deferred to a future phase.
- **Tenant user management** — added tenant-authenticated `/tenant/users` CRUD/lifecycle endpoints, Owner/Manager role boundaries, serializable seat enforcement, USER lifecycle audit actions, and user-app `/thiet-lap/nhan-vien` management UI. Platform-admin tenant-user APIs remain separate.
- **Tenant user session lifecycle** — completed user refresh rotation/reuse detection, `nomo_user_rt` realm dispatch, current `/auth/me`, logout blacklist/family revocation, fail-closed Redis handling, tenant guard tests, and Postgres/Redis E2E coverage; admin auth regression remains passing.
- **Tenant authorization/password lifecycle** — added server-derived `TenantPermissionGuard`, centralized forced-password-change gating for tenant business routes, authenticated `/auth/change-password`, and revocation of other user session families after password change; unit/E2E coverage passes.
- **Frontend user auth state** — added typed tenant auth API calls, memory-only Zustand user session, independent user route guard, Vietnamese error mapping, and bounded single-flight refresh/retry handling; frontend build/lint pass.
- **Frontend user auth screens** — replaced mock login with tenant-aware real login, added public registration and forced password-change routes, responsive accessible forms, and Playwright route/viewport verification.
- **Tenant auth acceptance coverage** — added deterministic Postgres/Redis tenant lifecycle E2E and re-ran admin auth plus tenant product regressions: 5 suites / 19 tests passing.

### Fixed
- **Demo inventory entitlement** — `seed-tenant` now repairs the demo store with a 30-day Starter trial when no active subscription exists, so `/ton-kho` is available for the seeded OWNER account.
- **Tenant logout when access token idle-expired (H1)** — `logoutUser` accepts controller-decoded claims (including `decodeExpiredAccess`) instead of re-verifying strictly; blacklist + refresh-family revoke still run so `/auth/refresh` cannot revive a logged-out session.
- **Tenant login/register rate limit (H2)** — wired Redis attempt counters into production `login`/`register` (`assertLoginNotThrottled`); over `USER_LOGIN_MAX_ATTEMPTS` returns 429; Redis errors fail-open per R5.4. Regression e2e cases added in `tenant-auth.e2e-spec.ts`.
- **Settings network error** — translated unavailable backend/network failures in user API requests into an actionable Vietnamese message and documented the shared authenticated request boundary.
- **Auth realm isolation on shared devices** — refresh requests now declare `admin` or `user`, so simultaneous admin and tenant HttpOnly cookies are rotated independently without cross-session token mixing; legacy single-cookie refresh remains compatible.
- **Supplier management review follow-up** — restored mobile supplier pagination, debounced and race-safe search loading, aligned `INACTIVE` updates with `deletedAt` soft-delete retention, and clarified supplier type mapping ownership.
- Fixed frontend verification drift by adding the required `lowStockThreshold` field to the product-picker test fixture; supplier management unit/E2E, client tests, typecheck, lint, build, and route reachability now pass.
- Corrected Prisma DI for RBAC services, added `GET /admin/permissions`, restricted role grants to `admin.*`, fixed frontend permission-ID mapping, and restored backend test type safety.
- Fixed admin subscription assignment so the save action submits its form; cleared the admin frontend lint baseline and verified responsive plan/subscription smoke flows.
- Plan cards now expose the full header as a clickable, keyboard-accessible expand/collapse control with visible pointer feedback.

### Changed
- **Tenant password-change check removed** — users can access business routes even when `mustChangePassword=true`; the optional password-change API and account-management data remain available.
- Tách tạo mới và chỉnh sửa plan thành các trang riêng: `/admin/plans/new` và `/admin/plans/[id]/edit`; catalog chỉ còn danh sách và thao tác trạng thái.

  - `PlatformAdmin` email + password login (`POST /auth/admin/login`) với Argon2id hashing + constant-time decoy verify (R1)
  - JWT access token (~15m) + refresh token rotation (~30d) với 2 secret riêng biệt (R2)
  - Redis-backed refresh family store với Lua CAS atomic rotation + reuse detection (R3)
  - Logout blacklist access + revoke family, accept expired-but-valid signature cho idle session (R4)
  - `GET /auth/me` cho admin hiện tại (guarded)
  - Brute-force lockout + LOGIN/LOGOUT/REFRESH_REUSE_DETECTED audit logs
  - Bootstrap admin seed (env-driven `BOOTSTRAP_ADMIN_*`)
  - Frontend admin login form wired to real API (`frontend/lib/auth-api.ts`)
  - Fail-closed trên Redis down (R9.1) — guard + service throw `ServiceUnavailableException`
  - docker-compose Redis 7 service với AOF persistence

### Security
- HttpOnly + Secure + SameSite=Strict refresh cookie, `path=/auth`
- 2 JWT secret riêng (access/refresh), `algorithms: ['HS256']` pinned
- Plaintext token không bao giờ lưu — chỉ `sha256(token)` trong Redis với TTL
- `ignoreExpiration: true` chỉ dùng trong `decodeExpiredAccess()` cho logout idle session
- Cookie `secure=false` bị chặn khi `NODE_ENV=production` (R8.4)

### Changed
- Backend foundation: `PrismaService` (Prisma 7 + pg adapter), `RedisService` (ioredis), `ConfigModule.forRoot({ isGlobal: true })`, `cookie-parser`, `ValidationPipe`, `enableCors({ credentials: true })`
- Spec admin-authentication closed: `status: ready_for_review` (2026-07-17)

### Test Coverage
- Backend unit: 30/30 pass (6 spec files — auth.service, password.service, token.service, refresh-token.store, access-token.guard, app.controller)
- Backend e2e: 14/14 pass (4 suites — app, auth-login, auth-refresh-logout, auth-flow) chạy `--runInBand` deterministic
- Frontend: 0 test files (chưa có Vitest/RTL setup; manual smoke qua FE wiring)

### Verification
- `nest build` exit 0
- `pnpm check` (Biome) clean
- Code review: **9.8/10 PASS** (2 warning đã fix: forensic ctx cho reuse row + Redis error logging)

---

## [0.0.0] - 2026-07-17

### Added
- Initial monorepo skeleton (`nomo-green`) với CafeKit runtime
- Frontend: Next.js 16 + React 19 (trang chủ, login, app shell)
- Backend: NestJS 11 + Prisma 7 foundation
- Database: PostgreSQL schema (`platform_admin`, `audit_log`, tenant, subscription, invoice, payment, handbook, sales, inventory, product, debt, customer, supplier)
- Phases đã ship trước admin-auth: dashboard, product, sales (POS), inventory (nhập hàng/tồn kho), handbook
## 2026-07-22

### Tenant sales order management — R5

- Migrated `/don-ban-hang` list and `/don-ban-hang/:id` detail surfaces from seeded records to the tenant sales-order API.
- Added server-backed search/status filters, stale-request protection, desktop replacement pagination, mobile deduplicated append with no-progress terminal guard, inline retry, canonical detail/cancel rendering, and 409 conflict refetch.
- Added focused responsive UI tests covering 403/404, loading/empty, debounce/race, paging, duplicate cancellation, canonical response, and stale cancellation recovery. Frontend test/build verification passed.

### Tenant sales order management — R6

- Wired OrderForm draft/direct-complete flows to the canonical API with stable retry idempotency, real base-unit IDs, PaymentSheet settlement mapping, and recoverable errors.
- Wired draft detail completion with duplicate-submit protection and canonical server response replacement.
- Added form and lifecycle component coverage; frontend build and focused tests pass.
