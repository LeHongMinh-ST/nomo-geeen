# Project Changelog

Tất cả thay đổi đáng chú ý của NomoGreen Platform được ghi nhận tại đây.
Format theo [Keep a Changelog](https://keepachangelog.com/), tuân thủ [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- **Admin tenant provisioning (partial)** — added transactional `POST /admin/tenants` (guard `admin.tenant:create`) tạo Tenant + OWNER user đầu tiên + 3 role per-tenant (OWNER/MANAGER/STAFF) + audit `TENANT_CREATE`/`USER_CREATE` trong một `prisma.$transaction`; hỗ trợ password nhập tay hoặc sinh tự động (one-time reveal), `seatBonus` mặc định 10, ánh xạ `P2002` → 409 `SLUG_TAKEN`/`USERNAME_TAKEN` tương thích driver adapter-pg. Tenant-user CRUD, UI, và verify end-to-end còn pending.
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

### Fixed
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
