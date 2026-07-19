# Codebase Summary

## Project shape

NomoGreen is a pnpm monorepo-style application with separate `frontend` and `backend` packages. The product is a multi-tenant agricultural-supply retail SaaS with a separate Platform Admin portal.

## Stack

| Area | Observed implementation |
|---|---|
| Frontend | Next.js 16.2, React 19.2, TypeScript, Tailwind CSS v4, Biome, Zustand |
| Backend | NestJS 11, TypeScript, Prisma 7, PostgreSQL, Redis/ioredis |
| Authentication | JWT access tokens, HttpOnly refresh-cookie rotation, admin and tenant guards |
| Validation | Nest `ValidationPipe`, class-validator DTOs |
| Tests | Jest unit tests under `backend/src`, E2E tests under `backend/test` |

## Runtime entry points

- Backend bootstrap: `backend/src/main.ts`.
- Backend module composition: `backend/src/app.module.ts`.
- Admin API modules: `backend/src/platform/*`.
- Frontend admin shell: `frontend/app/admin/(quan-tri)/layout.tsx` and `frontend/components/admin/admin-shell.tsx`.
- Frontend admin API client: `frontend/lib/admin-api/fetch.ts`.

## Existing platform areas

- `platform/auth` — admin/tenant login, JWT, refresh rotation, guards.
- `platform/admin-users` — platform admin management and audit writes.
- `platform/roles` — roles, permissions, and audit writes.
- `platform/tenants` — tenant management and tenant audit writes.
- `platform/billing` — plan/subscription lifecycle and audit writes.
- `platform/audit` — shared `AuditLogger` write service plus guarded list/detail query API; detail snapshots are recursively sanitized before response.

## Data

The Prisma schema is in `backend/prisma/schema.prisma`. `AuditLog` is an append-only-style record with actor, tenant, action, resource, before/after JSON, IP/User-Agent, and timestamp fields. Migrations are under `backend/prisma/migrations/`.

## Current gaps relevant to admin activity tracking

- Admin audit API exposes guarded `GET /admin/audit-logs` and `GET /admin/audit-logs/:id`; the detail endpoint masks sensitive keys recursively in `before`/`after`. No retention or export API is implemented.
- The dashboard activity panel is currently static UI data.
- `AuditAction` coverage is explicit per service; no global audit interceptor was found.
