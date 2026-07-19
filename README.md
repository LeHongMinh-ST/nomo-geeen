# NomoGreen

NomoGreen is a Vietnamese SaaS platform for agricultural-supply retail, covering sales, inventory, debt, tenant operations, and an internal admin portal.

## Repository layout

- `backend/` — NestJS API, Prisma/PostgreSQL data access, Redis-backed admin sessions.
- `frontend/` — Next.js App Router admin and store web applications.
- `docs/` — product, architecture, database, and development documentation.
- `specs/` — specification-driven feature artifacts.

## Common commands

```bash
pnpm install
pnpm --dir backend build
pnpm --dir backend test
pnpm --dir backend test:e2e
pnpm --dir frontend build
pnpm --dir frontend lint
```

Local infrastructure is defined in `docker-compose.yml`. Backend environment variables and bootstrap behavior are documented in `backend/README.md` and the auth specs.

## Source of truth

Use `DESIGN.md` for frontend visual rules, `docs/base_spec.md` for product behavior, `docs/architecture.md` and `docs/database-design.md` for current architecture/data conventions, and `specs/` for approved feature scope.

## Evidence gaps

- No root CI workflow or production deployment manifest was found during baseline initialization.
- Runtime configuration is split between package scripts, environment variables, and local compose configuration.
