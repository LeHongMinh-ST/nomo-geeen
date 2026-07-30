# Project Changelog
- **Fixed product catalog and package entitlements** — bỏ route/quản lý danh mục tenant; sản phẩm dùng nhóm hàng cố định. Gói cơ bản mở Thuốc bảo vệ thực vật + Phân bón và Cây trồng; feature entitlement mở thêm Thuốc dùng cho người, Thuốc thú y và Thức ăn chăn nuôi.

Tất cả thay đổi đáng chú ý của NomoGreen Platform được ghi nhận tại đây.
Format theo [Keep a Changelog](https://keepachangelog.com/), tuân thủ [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- **Demo handbook by store profile** — `seed-demo` now enables business groups per demo store, assigns `Product.businessGroup` consistently, seeds disease entries by relevant SKU, and creates product-backed recommended protocols. Crop, livestock, aquaculture, seedling, and fertilizer/plant-protection entries are no longer shared indiscriminately across stores.
- **Notification deep links** — click từng thông báo mở đúng màn hình nghiệp vụ theo loại: công nợ → `/cong-no`, tồn thấp/HSD → `/ton-kho`, hệ thống → `/thong-bao`; thông báo chưa đọc được gửi đánh dấu đã đọc đồng thời khi điều hướng.
- **Bank account settings reachability** — thêm mục `Thông tin cửa hàng` vào nhóm `Cửa hàng` trong trang Thiết lập, mở được form cấu hình tài khoản nhận chuyển khoản trên desktop và mobile.
- Admin management surface completion: added /admin/transactions and /admin/status routes, guarded read-only endpoints, global admin search, persisted notification read-state, and canonical reset-password permission checks.
- **Package-driven business groups** — basic tenants expose only `Thuốc bảo vệ thực vật + Phân bón`; add-on `product_group:*` entitlements control other groups. The saved tenant switch is now applied by the backend and shared by product create/edit/list filters, Handbook category options, and settings; disabled groups preserve existing records but cannot be selected for new writes.
- **Customer debt receipt allocation** — customer receipts now update the settlement fields of completed outstanding sales oldest-first in the same transaction as the customer balance, payment voucher, and debt ledger; voucher lines preserve each sale allocation.
- **Order detail invoice actions** — `/don-ban-hang/:id` now presents a canonical order detail with mobile-first `Tải hóa đơn` and `In hóa đơn` actions. The client builds a narrow receipt-style invoice from `SalesOrderDetail`, supports browser print with app chrome hidden and a downloadable PDF with embedded Vietnamese font, without adding a new backend invoice contract. Order timeline values use the shared `dd/MM/yyyy HH:mm` display format.
- **Quick product creation** — tạo sản phẩm chỉ cần thông tin cơ bản; `baseUnitId`, tồn kho và quy đổi có thể bổ sung sau trong màn sửa. Sản phẩm chưa có đơn vị chưa được bán.
- **Product creation base-unit validation (superseded by quick product creation)** — khi tạo sản phẩm, form tự chọn đơn vị tồn kho hợp lệ đầu tiên (Gói/Chai/kg) trước khi gửi API; thêm regression test cho payload `baseUnitId`.
- **Quick-sale server-side draft sync (Phase 1)** — `backend/src/platform/sales/` exposes a tenant-scoped `QuickSaleDraft` (UUID PK, `@@unique([draftId, idempotencyKey])`, 20-minute lazy expiry → `410 Gone`) with `QuickSaleDraftLine` and `QuickSaleDraftMutation` tables, full Prisma migration `20260729120000_quick_sale_draft`, and a new `QuickSaleDraftEventsService` fan-out (in-process + Redis channel `nomo:tenant-quick-sale-draft`) paralleling the notification SSE hub. Auth reuses the existing `TenantAccessTokenGuard` + `TenantPermissionGuard` + `EntitlementsGuard` chain; mutations require `sales:create` / `sales:edit`, joins need only `sales:view`. Endpoints: `GET/PUT /current`, `POST /create` (token mint, opaque 10-char nanoid), `POST /join` (phone token lookup), `POST/PATCH/DELETE /:id/lines`, `POST /:id/checkout` (delegates to existing `SalesService.createQuickSale` for atomic FEFO + idempotency), `DELETE /:id`, and `GET /:id/stream` SSE. SSE emits `connected`, `heartbeat`, and `quick-sale-draft.changed` events, all tenant-scoped; `EventEmitter` fallbacks to in-process fan-out when Redis bridge fails.
- **Quick-sale multi-device FE hook** — `frontend/lib/use-quick-sale-draft.ts` provides `{draft, status, error, joinToken, addProduct, setQty, removeLine, setCustomer, checkout, close, refresh}` bootstrapped from `GET /current` → `POST /create` (desktop) or `POST /join` (phone when `?join=…`), and subscribes to `useQuickSaleDraftStream` (Babel-free SSE fetch with auto-reconnect/backoff reused from the notification stream). `frontend/components/app/sales/quick-sale-draft-token.tsx` renders the join token with copy-to-clipboard; existing `useQuickSaleStore` Zustand store remains the offline/local fallback.
- **Continuous sales barcode scanning** — sales product picker and handbook quick panel keep one camera session open for repeated product scans; invalid/out-of-stock codes re-arm immediately and the shared product-form scanner remains one-shot.
- **Thiết bị đăng nhập** — loại bỏ thẻ OTP chưa triển khai khỏi màn quản lý passkey, chỉ giữ phần thiết bị Face ID/Touch ID.
- **Tenant passkey device management** — thêm mục Thiết bị đăng nhập riêng trong Thiết lập; hỗ trợ đăng ký nhiều passkey, hiển thị loại sinh trắc học, ngày đăng ký, lần dùng gần nhất, trạng thái đồng bộ và thu hồi từng thiết bị. Nút đăng nhập mobile chọn icon Face ID/Touch ID theo nền tảng.
- **Product creation flow** — category selection now follows the tenant's purchased catalog, single-category tenants see a fixed value, product-unit choices are limited to `Gói`, `Chai`, and `kg`, and post-create-only information sections remain hidden during initial creation.
- **Home dashboard header** — removed the duplicate top-right “Bán” shortcut; quick sale remains available through the existing sales navigation.
- **Tenant notification SSE** — `GET /tenant/notifications/stream` (Bearer fetch streaming, heartbeat, disconnect cleanup); `NotificationEventsService` fan-out theo tenant/user + Redis pub/sub multi-instance (fallback in-process); producer publish sau create/update; FE subscribe/reconnect re-fetch list+unread, polling fallback, cleanup unmount. List/unread-count vẫn là source of truth.
- **Tenant in-app notifications (header bell)** — API `/tenant/notifications` (list/unread-count/sync/read/read-all); `notification` + per-user `notification_read` + `dedupeKey`; runtime producers công nợ/tồn thấp/gần HSD (digest/ngày, không spam); FE chuông desktop popover + mobile sheet + `/thong-bao`; seed demo; chưa BullMQ/push.
- **Tenant home dashboard live data** — trang chủ tenant (`/`) bỏ mock KPI; `GET /tenant/reports/home-summary` (`dashboard:view`) gom doanh thu hôm nay/tháng, phải thu, cảnh báo tồn/HSD/công nợ, series 7 ngày và top bán chạy; FE `HomeDashboard` xử lý loading/error/empty, chào theo `fullName` thật.
- **Quick-sale POS workspace refresh** — `/ban-nhanh` now presents a focused two-column counter workspace on desktop: product search and quick-add tiles on the left, sticky customer/order summary and payment actions on the right. Mobile keeps the existing stacked flow and bottom-fixed actions.
- **Quick-sale customer inline UX** — `/ban-nhanh` now exposes customer lookup directly in the counter form, supports debounced name/phone autocomplete, and creates a customer inline through the existing tenant customer API. Existing balance/note context is shown; customer order history remains pending a customerId-filtered sales-history contract.
- **Cảnh báo hạn dùng theo tầng** (catalog §14.2) — backend tính tier 180/90/30 ngày từ ngày hết
  hạn; inventory list/card/detail hiển thị kết quả server trả về, không tự tính theo đồng hồ trình duyệt.
- **Màn hình nhóm kinh doanh** — hiển thị các nhóm hàng được mở theo gói dịch vụ và số sản phẩm; tenant không tự bật/tắt quyền mở nhóm. Nhãn nhóm ở `product-kind-form.ts` đồng bộ với catalog hệ thống.
- **Nhà cung cấp: tỉnh/thành phố + loại chuẩn hoá** (catalog §14.1) — thêm `Supplier.province`
  tách khỏi `address`; `supplierType` chuyển từ free text sang enum `SupplierType`
  (`CROP_PROTECTION` / `FERTILIZER` / `BOTH`). Migration backfill best-effort theo token đã bỏ
  dấu qua `nomo_fold_search()`; giá trị không nhận dạng được thành `NULL`, không xoá dòng nào.
- **Nhập hàng: ngày sản xuất theo dòng** (catalog §14.1) — `PurchaseLine.manufacturedAt` chảy từ
  DTO qua service vào `ProductBatch.manufacturedAt`, hiển thị cạnh hạn dùng trong form nhập.
- **Expiry summary hotfix (`636375d`)** — bounds `expirySummary` in 500-record pages with minimal selects and tenant/live batch predicates; direct backend Jest 36/36, frontend inventory-list 7/7, Biome inventory files, direct Nest build, and independent review PASS 9.8/10.
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
- **Prisma Client watch-mode drift** — backend `start:dev` và `start:debug` giờ regenerate Prisma Client trước khi Nest watch khởi động, tránh lỗi TypeScript do generated client không theo kịp `schema.prisma`.
- **Quick-sale bottom action overlap** — đặt thanh tổng tiền/thanh toán mobile lên `bottom-nav-safe` để không bị bottom navigation che mất.
- **Quick-sale iPhone footer gap** — kéo nền thanh tổng tiền xuyên qua safe-area phía dưới, để bottom nav phủ lên lớp nền footer và không còn lộ customer picker giữa nút thanh toán với menu mobile.
- **Handbook empty state mobile CTA duplication** — ẩn nút “Thêm sổ tay” trong empty state trên mobile, giữ lại FAB “Thêm” duy nhất; desktop vẫn hiển thị CTA trong empty state.
- **Restore mobile quick-sale shortcut** — khôi phục nút `+` Bán nhanh ở giữa bottom navigation; các CTA tạo mới trong empty state vẫn chỉ hiển thị trên desktop để tránh trùng với FAB mobile.
- **Purchase empty state mobile CTA duplication** — ẩn nút “Tạo phiếu nhập” trong empty state trên mobile, giữ lại FAB “Tạo phiếu” duy nhất; desktop vẫn hiển thị CTA trong empty state.
- **Product empty state mobile CTA duplication** — ẩn nút “Thêm sản phẩm” trong empty state trên mobile, giữ lại FAB “Thêm” duy nhất; desktop vẫn hiển thị CTA trong empty state.
- **Mobile bottom navigation and footer overlap** — removed the redundant center `+` action from the four-item tenant navigation, reserved safe-area space in the shared app content, and increased handbook form bottom spacing/z-index so fixed actions do not cover content or appear detached from the bottom menu.
- **Quick-sale dual customer entry** — the new-customer name and optional phone fields now remain editable together; suggestions render inline instead of opening a modal that disabled the second field.
- **Quick-sale populated-state spacing** — removed the remaining bottom-action padding from the product list so adding items does not create a large gap before the customer form.
- **Quick-sale mobile footer overlap** — reserved bottom-navigation/action-bar space after the complete POS content so the phone field and customer form are not covered by the fixed checkout bar.
- **Quick-sale empty-state spacing** — removed the mobile bottom-action reserve from the empty product column so the customer form no longer appears after a large blank gap.
- **Quick-sale mobile checkout visibility** — restored the customer form on mobile and kept the total/payment bar fixed above bottom navigation; payment actions remain visible and disabled until an item is added.
- **Quick-sale header cleanup** — removed the global search field and customer pill from `/ban-nhanh` so the POS workspace starts directly with the sales task; other app routes keep the global header search.
- **Quick-sale customer creation fields** — customer lookup now separates required name entry from optional phone entry; no-match creation sends both values when provided and keeps the phone optional.
- **Quick-sale mobile action visibility** — hid the desktop customer/order summary on small screens and raised the mobile payment action bar above the bottom navigation so `Ghi nợ` and `Thu tiền` remain visible.
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
- **Quick-sale customer search placement** — removed the duplicate inline customer search from the quick-sale surface; customer search remains available inside the legacy drawer.
- **Quick-sale customer picker reset** — restored the legacy customer search + bottom drawer flow across the sales screen; removed the experimental two-field customer entry UI.
- **Quick-sale responsive customer picker** — mobile keeps the original compact search + customer trigger layout; the two-field name/optional-phone form is desktop-only.
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
## 2026-07-28

- Go-live hardening: đồng bộ contract nhóm hàng `HUMAN_DRUGS` và migration billing reference; thêm readiness Prisma/Redis, structured request/error logs, Prometheus counters, Redis-backed auth rate limit, frontend error-reporting baseline và policy SSE degraded/single-instance.
- Hoàn thiện các màn hình thông tin cửa hàng, đổi mật khẩu bằng API auth/profile hiện có; `LoadingGate` không còn delay giả lập.
- Reviewer hardening: bảo vệ `/metrics` bằng `METRICS_TOKEN`, thêm Nginx gateway `limit_req` + proxy headers, và cấu hình/test `TRUST_PROXY` explicit.

## 2026-07-28 — Passkey/WebAuthn

- Thêm tenant passkey registration/authentication bằng SimpleWebAuthn, Redis one-time challenge TTL 300 giây, Prisma public-key credential persistence, strict origin/RP ID và refresh-family issuance/revoke.
- Frontend thêm nút đăng nhập passkey tại /dang-nhap và bật/thu hồi passkey tại /thiet-lap; access token vẫn memory-only, không lưu biometric data.

## 2026-07-28 — Mobile PWA pull-to-refresh

- Thêm kéo xuống để tải lại cho standalone mobile PWA; không bật trên desktop, mobile browser thường hoặc vùng form/danh sách cuộn.

## 2026-07-29 — Quick-sale cart draft

- Lưu draft giỏ hàng bán nhanh bằng Zustand khi điều hướng sang màn hình khác; xóa sau thanh toán thành công hoặc nút Xóa giỏ hàng.

## 2026-07-29 — Quick-sale draft safety

- Reset idempotency key khi payload giỏ thay đổi và dọn draft khi logout, mất session hoặc chuyển tài khoản.

## 2026-07-29 — Product conversion UX

### Changed

- **Quy cách đóng gói & quy đổi sản phẩm** — form chỉnh sửa giải thích rõ chiều quy đổi `1 đơn vị quy đổi = hệ số đơn vị tồn kho`, bắt buộc nhập hệ số mới, chống trùng đơn vị và cho phép áp dụng khi nhập hàng, bán hàng hoặc cả hai; mặc định tương thích là `Cả hai`.
## 2026-07-30 — VietQR chuyển khoản theo cửa hàng

- Thêm cấu hình ngân hàng, số tài khoản và tên chủ tài khoản trong hồ sơ tenant; backend validate, map profile và lưu qua migration Prisma.
- Trang Thông tin cửa hàng tải danh sách ngân hàng VietQR, có nhập mã thủ công khi API không khả dụng.
- PaymentSheet gộp QR vào Chuyển khoản, hiển thị Quick Link VietQR theo số tiền đơn và chặn xác nhận khi chưa cấu hình tài khoản.
- Thêm test tập trung cho mapping/validation bank và parser danh sách VietQR.
