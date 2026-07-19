# Project Changelog

Tất cả thay đổi đáng chú ý của NomoGreen Platform được ghi nhận tại đây.
Format theo [Keep a Changelog](https://keepachangelog.com/), tuân thủ [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- **Admin tenant management** — list/detail/edit/status/export for platform tenants (`/admin/cua-hang`), `admin.tenant:*` guards, formula-safe CSV, optimistic concurrency, lifecycle transitions (metadata-only), audit `TENANT_*`.
- **Admin RBAC & user management** — multi-role admin assignments, permission catalog, guarded role/admin APIs, audit integration, and admin navigation gating.

### Fixed
- Corrected Prisma DI for RBAC services, added `GET /admin/permissions`, restricted role grants to `admin.*`, fixed frontend permission-ID mapping, and restored backend test type safety.

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
