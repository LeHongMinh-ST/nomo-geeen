# Project Changelog

Tất cả thay đổi đáng chú ý của NomoGreen Platform được ghi nhận tại đây.
Format theo [Keep a Changelog](https://keepachangelog.com/), tuân thủ [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
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
