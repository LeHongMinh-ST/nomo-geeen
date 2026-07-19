# Code Standards

## General

- TypeScript is used across frontend and backend.
- Prefer small, focused modules and existing domain boundaries.
- Use explicit types; avoid `any` and broad object shapes.
- Preserve tenant scope and permission checks at the backend boundary.
- Keep business mutations and their audit writes in the same Prisma transaction where consistency requires it.

## Backend conventions

- Nest modules/controllers/services live below `backend/src/platform/<domain>/`.
- Controllers use `AccessTokenGuard`, `PermissionGuard`, and `@RequirePermission(...)` for admin routes.
- DTOs use class-validator and bounded query parameters.
- Services use Prisma through `PrismaService` and map domain errors to Nest HTTP exceptions.
- Unit tests are colocated as `*.spec.ts`; HTTP acceptance tests are under `backend/test/`.

## Frontend conventions

- Admin routes live under `frontend/app/admin/(quan-tri)/`.
- Shared admin components live under `frontend/components/admin/`.
- Admin HTTP calls use `frontend/lib/admin-api/fetch.ts`, which supplies the bearer token and one refresh/retry path.
- Zustand stores hold admin auth state; client-only stateful components use the `"use client"` directive.
- Use the existing `DESIGN.md` tokens, labels, spacing, touch targets, responsive patterns, and accessibility rules.

## Verification

- Backend: `pnpm --dir backend build`, `pnpm --dir backend test`, and relevant `pnpm --dir backend test:e2e` suites.
- Frontend: `pnpm --dir frontend build` and `pnpm --dir frontend lint`.
- UI changes require responsive and keyboard/focus checks in addition to static checks.

## Documentation discipline

- Keep docs under `docs/` and keep individual Markdown files below 800 lines.
- Document observed behavior from source; mark inferred or unresolved behavior explicitly.
- Update `docs/.sync_hash` only after the docs accurately represent the current source baseline.
