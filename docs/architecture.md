# NomoGreen — System Architecture

> Kiến trúc kỹ thuật Phase 1 (MVP) — quy mô startup nhỏ.
> Bám theo `docs/base_spec.md` và `DESIGN.md`.

Version: 1.0

---

# 1. Nguyên tắc kiến trúc

Đối tượng là nông hộ / cửa hàng nhỏ, lượng tenant ban đầu ít, ngân sách hạ tầng thấp. Vì vậy kiến trúc tuân theo:

- **Monolith module hóa** (modular monolith), không microservice. Một backend, một database.
- **Chi phí thấp trước, mở rộng sau.** Ưu tiên 1 VPS + Docker Compose; chỉ tách dịch vụ khi thật sự cần.
- **Chính xác dữ liệu tiền/tồn kho.** Chọn PostgreSQL (ACID, transaction), không dùng NoSQL cho dữ liệu nghiệp vụ.
- **Multi-tenant chia sẻ database** (shared DB, cột `tenant_id`) — rẻ và đơn giản nhất cho giai đoạn đầu.
- **Tách rõ nhưng không tách hạ tầng.** Frontend và backend là 2 app trong monorepo, deploy độc lập được nhưng dùng chung DB/hạ tầng.
- **KISS / YAGNI.** Không thêm Kafka, service mesh, k8s ở Phase 1.

---

# 2. Công nghệ (Tech Stack)

Phần in đậm là đã có sẵn trong repo, phần còn lại là đề xuất bổ sung.

## 2.1 Frontend

| Hạng mục | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | Đã cài |
| UI runtime | **React 19** | Đã cài |
| CSS | **Tailwind CSS v4** | Đã cài |
| Component | **shadcn/ui** | Theo DESIGN.md |
| Icon | **lucide-react** | Đã cài |
| Data fetching | TanStack Query (React Query) | Cache, retry, invalidation |
| Form | React Hook Form + Zod | Validate dùng chung schema với BE |
| State | Zustand (nhẹ) | Chỉ cho state cục bộ; server state để React Query lo |
| Chart | Recharts | Dashboard, báo cáo |
| Table | TanStack Table | Danh sách sản phẩm/đơn hàng |
| PWA | next-pwa (giai đoạn sau) | Bán offline nhẹ, cài lên điện thoại |

Rendering: mặc định **Server Components** cho trang đọc; **Client Components** cho form/bán nhanh. Gọi API qua REST.

## 2.2 Backend

| Hạng mục | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | **NestJS 11** | Đã cài |
| Ngôn ngữ | **TypeScript** | Đã cài |
| API style | REST + OpenAPI (`@nestjs/swagger`) | Đủ cho Phase 1; GraphQL không cần |
| ORM | **Prisma** | Type-safe, migration tốt, hợp NestJS |
| Validation | Zod + `nestjs-zod` | Chia sẻ schema với FE |
| Auth | Passport JWT (access + refresh) | Xem mục 6 |
| Background job | BullMQ (trên Redis) | Notification, hết hạn, công nợ đến hạn |
| Config | `@nestjs/config` + `.env` | `.env.example` bắt buộc |
| Log | Pino (`nestjs-pino`) | JSON log, gắn `tenant_id`/`request_id` |

## 2.3 Dữ liệu & hạ tầng

| Hạng mục | Lựa chọn | Ghi chú |
|---|---|---|
| Database | **PostgreSQL 16** | Nguồn sự thật duy nhất |
| Cache / Queue | **Redis 7** | Session/refresh token blacklist, BullMQ, rate limit |
| File Storage | S3-compatible: **Cloudflare R2** (prod) / **MinIO** (dev) | Logo, ảnh SP, chứng từ |
| Search | Postgres full-text (`tsvector`) | Đủ cho tìm sản phẩm; không cần Elasticsearch |
| Email/SMS | SMTP (email) — Phase 1; SMS OTP (provider VN) — sau | Login: username/phone/email+password; OTP chỉ sau |

> Lý do không dùng Firebase/Supabase làm lõi: nghiệp vụ tồn kho + công nợ cần transaction phức tạp và kiểm soát tại backend. Có thể dùng Supabase như Postgres managed nếu muốn đỡ vận hành, nhưng logic vẫn ở NestJS.

## 2.4 Công cụ (đã có)

- **pnpm workspace** (monorepo)
- **Biome** (lint + format)
- **Husky + lint-staged + commitlint** (conventional commits)
- Test: **Jest** (BE), Vitest/Playwright (FE — bổ sung khi cần)

---

# 3. Sơ đồ tổng thể

```
                    ┌───────────────────────────┐
                    │        Người dùng          │
                    │  (trình duyệt / mobile web)│
                    └─────────────┬─────────────┘
                                  │ HTTPS
                    ┌─────────────▼─────────────┐
                    │   Reverse Proxy (Caddy)    │  TLS tự động
                    └──────┬──────────────┬──────┘
                           │              │
              ┌────────────▼───┐   ┌──────▼─────────────┐
              │  Next.js 16    │   │   NestJS 11 API    │
              │  (frontend)    │──▶│   (REST /api)      │
              └────────────────┘   └─────┬───────┬──────┘
                                         │       │
                             ┌───────────▼─┐  ┌──▼──────────┐
                             │ PostgreSQL  │  │   Redis     │
                             │ (multi-     │  │ cache+queue │
                             │  tenant)    │  └──┬──────────┘
                             └─────────────┘     │ BullMQ worker
                                                 ▼
                                        ┌────────────────┐
                                        │  Worker (job)  │
                                        │  cùng codebase │
                                        └────────────────┘
                             ┌──────────────────────────┐
                             │  Object Storage (R2/MinIO)│
                             └──────────────────────────┘
```

Phase 1 tất cả chạy trên **1 VPS** qua Docker Compose (trừ R2 là dịch vụ ngoài).

---

# 4. Cấu trúc monorepo

```
nomo-green/
├── backend/                # NestJS API + worker (chung codebase)
│   └── src/
│       ├── common/         # guard, interceptor, filter, decorator dùng chung
│       ├── platform/       # tenant, auth, subscription, billing, feature-flag, audit, storage, notification
│       └── retail/         # product, purchase, inventory, sales, customer, supplier, debt, report
├── frontend/               # Next.js app
│   ├── app/                # App Router (route theo module)
│   └── components/         # UI theo DESIGN.md + shadcn/ui
├── packages/               # (bổ sung) code dùng chung FE/BE
│   └── shared/             # Zod schema, type DTO, hằng số nghiệp vụ
└── docs/
```

Mỗi module NestJS gồm: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `dto/`, `prisma` repository. Ranh giới module bám đúng mục trong `base_spec.md`.

---

# 5. Multi-Tenancy

Chiến lược: **Shared Database, Shared Schema** — mọi bảng nghiệp vụ có cột `tenant_id`.

- Mỗi request qua `TenantMiddleware` xác định tenant từ **path** (`/minhtam/...`) — Phase 1. Middleware tách phần đầu path làm tenant slug, tra ra `tenant_id`.
- Thiết kế để đổi sang **subdomain** (`minhtam.argonext.vn`) hoặc claim trong JWT về sau mà không đụng tầng nghiệp vụ.
- `tenant_id` được đưa vào request context (AsyncLocalStorage).
- **Prisma middleware** tự động thêm điều kiện `where tenant_id = ?` cho mọi truy vấn nghiệp vụ → chống rò rỉ dữ liệu chéo tenant.
- Bảo vệ tầng 2 (khuyến nghị): bật **PostgreSQL Row-Level Security (RLS)** theo `tenant_id`. Tầng ứng dụng + RLS = an toàn kép.
- Bảng platform (tenant, subscription, user hệ thống) không lọc theo tenant.

Lý do không tách DB/schema mỗi tenant ở Phase 1: số tenant nhỏ, tách schema làm migration và vận hành phức tạp gấp nhiều lần. Khi có tenant lớn cần cô lập, mới cân nhắc tách schema riêng cho tenant đó (hybrid).

---

# 6. Xác thực & Phân quyền

## 6.1 Authentication

- Phase 1: đăng nhập bằng **identifier + mật khẩu**. Identifier = **username / phone / email** (resolve → user, rồi verify password). Không OTP ở Phase 1.
- Onboarding: **Saler B2C / Platform Admin** tạo Tenant+User từ Admin Portal; **đặt & đổi MK giúp khách** (field sales). `must_change_password` tùy chọn, không bắt buộc.
- Google/Apple OAuth và SMS OTP → sau (đã chừa chỗ Passport strategy).
- **JWT**: access token ngắn hạn (~15 phút) + refresh token dài hạn (~30 ngày) lưu HttpOnly cookie.
- Refresh token rotation; blacklist token thu hồi trong Redis.

## 6.2 Authorization

- Phase 1 (tenant Simple): 3 vai trò **Owner > Manager > Staff** — `RolesGuard` + permission `resource:action`.
- Seed permission map sẵn 3 role (xem `base_spec` §3.8). Owner/Manager quản lý nhân viên trong app; **seat** = `plan.max_users + tenant.seat_bonus`.
- `QuotaGuard`: chặn tạo user khi `active_count >= effective_max_users`.
- Admin Portal RBAC: `role.is_admin`, prefix `admin.`, `PermissionGuard`, JWT `roleCodes`/`permissions`.
- Admin permission catalog: `GET /admin/permissions`; route admin dùng `AccessTokenGuard + PermissionGuard`.
- `FeatureGuard`: module theo plan ⊕ tenant override (`multi_user`, `roles_manager`, …).

Chuỗi guard request tenant: `JwtAuthGuard → TenantGuard → FeatureGuard → RolesGuard` (+ `QuotaGuard` trên write tạo user/resource).

---

# 7. Quy ước dữ liệu nghiệp vụ

- **Tiền tệ**: lưu số nguyên đơn vị nhỏ nhất (VND, không phần lẻ) kiểu `BigInt`/`decimal` — không dùng float.
- **Tồn kho**: lưu theo **Base Unit** (mục 5.1 spec); quy đổi đơn vị ở tầng service.
- **Giao dịch tồn kho + công nợ**: thực hiện trong **Prisma `$transaction`**; chống tồn âm bằng ràng buộc + kiểm tra trong transaction (hoặc `SELECT ... FOR UPDATE`).
- **Số chứng từ duy nhất**: sinh theo tenant + loại chứng từ + sequence (bảng counter riêng, khóa hàng).
- **Soft delete**: cột `deleted_at`; Prisma middleware ẩn bản ghi đã xóa; có Trash/Restore.
- **Audit log**: interceptor ghi Create/Update/Delete/Approval kèm `tenant_id`, `user_id`, `before/after`.
- **Giá vốn**: bình quân gia quyền (moving average), cập nhật khi nhập hàng.

---

# 8. Nền tảng phụ trợ

| Nhu cầu | Giải pháp Phase 1 |
|---|---|
| Background job | BullMQ + Redis: quét công nợ đến hạn, hàng sắp hết hạn, gửi notification (cron). |
| Notification | In-app (bảng notification) trước; email/SMS sau. |
| File upload | Presigned URL lên R2/MinIO; BE chỉ lưu metadata. |
| Import/Export | Excel/CSV (SheetJS), PDF (chứng từ) qua job nếu file lớn. |
| Rate limit | `@nestjs/throttler` + Redis (chống lạm dụng OTP/API). |
| Migration | Prisma Migrate; chạy tự động khi deploy. |
| Seed | Script seed gói Subscription, Feature Flag mặc định, tài khoản demo. |

---

# 9. Môi trường & Triển khai

## 9.1 Môi trường

- `local` (Docker Compose: Postgres + Redis + MinIO)
- `staging`
- `production`

Cấu hình qua `.env` (không commit) + `.env.example` (commit). Đổi biến env phải cập nhật `.env.example`.

## 9.2 Triển khai Phase 1 (rẻ, đơn giản)

- **1 VPS** (2–4 vCPU / 4–8GB RAM, VN hoặc SG cho độ trễ thấp).
- **Docker Compose**: `caddy` (TLS + reverse proxy) · `frontend` · `backend` · `worker` · `postgres` · `redis`.
- File tĩnh/ảnh trên **Cloudflare R2** (không lo backup ổ đĩa VPS).
- Backup: `pg_dump` định kỳ đẩy lên R2.
- Domain: wildcard `*.argonext.vn` cho subdomain tenant.

> Phương án thay thế: Frontend deploy **Vercel**, Backend + DB trên VPS/Railway. Tốn hơn chút nhưng đỡ vận hành FE. Chọn theo ngân sách.

## 9.3 CI/CD

- **GitHub Actions**: lint (Biome) → test (Jest) → build → build Docker image → deploy (SSH/registry).
- Husky chặn commit sai convention ngay từ máy dev.

---

# 10. Khả năng mở rộng (khi lớn dần)

Chỉ làm khi số liệu thực tế yêu cầu — không làm sớm:

1. Tách **worker** ra tiến trình/VPS riêng khi job nặng.
2. **Postgres read replica** cho báo cáo.
3. **Redis** cho cache báo cáo Dashboard.
4. Tách tenant lớn sang **schema riêng** (hybrid multi-tenant).
5. CDN cho asset tĩnh (R2 đã có sẵn CDN Cloudflare).
6. Tách module thành service riêng **chỉ khi** một module thành nút thắt rõ ràng.

---

# 11. Tóm tắt quyết định

**Đã chốt cho Phase 1:**

- Kiến trúc: **Modular monolith**.
- Database: **PostgreSQL 16**, shared-DB multi-tenant.
- ORM: **Prisma**.
- API: **REST + OpenAPI**.
- Auth: **JWT**, login **username | phone | email + password**; Saler/Admin tạo TK + **đặt/đổi MK giúp khách** (Audit Log). OTP/OAuth sau.
- Subscription: entity gói có sẵn; **chia hạn mức / ma trận gói sau** (Phase 1 full feature Simple Mode).
- Định danh tenant: **theo path** (`/minhtam`) — dùng subdomain sau, middleware thiết kế để đổi được mà không sửa nghiệp vụ.
- Queue/Cache: **Redis + BullMQ**.
- Storage: **Cloudflare R2** (prod) / MinIO (dev).
- Hosting: **VPS tự quản + Docker Compose** (Caddy TLS).

**Hoãn / chốt sau:**

- **SMS OTP**: chọn nhà cung cấp VN sau (khôi phục / xác minh SĐT — login phone Phase 1 dùng password, không OTP).
- **Chia gói / hạn mức subscription**: sau khi bao quát đủ chức năng.
