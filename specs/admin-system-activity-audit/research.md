# Research & Design Decisions

## Summary

- **Feature:** `admin-system-activity-audit`
- **Discovery scope:** Extension of the existing admin platform across Prisma, NestJS, Next.js, RBAC, and tests.
- **Key findings:** audit writes already exist; read/query and UI surfaces do not; the navigation link is currently unreachable; the dashboard activity list is static.

## Evidence Summary

- **Codebase Scout:** Required and completed.
  - `backend/prisma/schema.prisma:574-594` defines `AuditLog`, its fields, and indexes.
  - `backend/src/platform/audit/audit-logger.service.ts` provides `run()` and `log()` write paths with enum validation and transaction support.
  - `backend/src/platform/auth/auth.service.ts`, `admin-users`, `roles`, `tenants`, and `billing` contain existing audit writes.
  - No `backend/src/platform/audit/audit.controller.ts`, query service, or audit DTO exists.
  - `frontend/lib/admin-navigation.ts` links `/admin/audit-log`, but no matching page exists.
  - `frontend/app/admin/(quan-tri)/page.tsx` renders a static `activities` array.
  - `frontend/lib/admin-api/fetch.ts` is the existing bearer/refresh/retry client contract.
  - `DESIGN.md` defines mobile-first layout, 48px controls, admin accent tiles, table-to-card responsive behavior, and accessibility rules.
  - `docs/base_spec.md:508-515` requires audit coverage for Login, Logout, Create, Update, Delete, and Approval; `§19.2` lists Audit as an Admin Portal capability.
- **External / Current Research:** Required and completed on 2026-07-19.
  - [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) recommends logging security-relevant events, sanitizing untrusted data, and excluding sensitive data.
  - [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) supports explicit access control for sensitive logs and warns against unnecessary sensitive logging.
  - [NestJS Authorization](https://docs.nestjs.com/security/authorization) documents guard-based authorization at controller/method boundaries.
  - [Next.js App Router data fetching](https://nextjs.org/docs/app/getting-started/fetching-data) documents fetch-based server/client data loading for App Router pages.
- **Selected decision:** Add a dedicated read-only audit query boundary, reuse existing AuditLog storage and admin API fetch/auth patterns, and mask sensitive JSON recursively before serialization.
  - This minimizes schema change and keeps mutation ownership in existing services.
  - Server-side filtering/pagination prevents unbounded data transfer and memory use.
- **Rejected alternatives:**
  - Global interceptor for every mutation — rejected for this slice because existing services already own transactional audit semantics and an interceptor could duplicate rows or lose domain snapshots.
  - Client-side filtering/all-row download — rejected because audit data is sensitive and may grow without bound.
  - External SIEM/log provider — out of scope for the Admin Portal activity view.
- **Remaining gaps / questions:** retention/archival policy and export are not defined by current product docs; both remain out of scope.
- **Downstream task/test implications:** API and UI tasks must share the named response contract; security tests must verify permission denial and recursive masking; final integration must prove nav, page, dashboard, backend module registration, and E2E reachability.

## Codebase Scout

| Area | Finding | Evidence / Path | Implication |
|---|---|---|---|
| Project surface | pnpm app with separate Next.js and NestJS packages | `frontend/package.json`, `backend/package.json` | Use existing package commands |
| Persistence | Audit table and enum already exist | `backend/prisma/schema.prisma` | Prefer additive index only if query plan requires it |
| Backend pattern | Guarded admin controllers and DTO query parsing | `backend/src/platform/*/*.controller.ts` | Add dedicated audit module/controller |
| Frontend pattern | API wrapper retries auth once; admin pages are App Router routes | `frontend/lib/admin-api/fetch.ts`, `frontend/app/admin/(quan-tri)` | Reuse wrapper and route grouping |
| Visual system | Admin shell, accents, mobile drawer, 48px controls | `DESIGN.md`, `frontend/components/admin/admin-shell.tsx` | Build table + mobile cards |
| Tests | Jest unit and E2E suites exist; no frontend test runner | `backend/src/**/*.spec.ts`, `backend/test`, `frontend/package.json` | Backend automated tests + runtime/UI smoke |
| Blast radius | New query module, permission seed, nav/page/dashboard | Paths above | Final reachability task required |
| Staleness | No root README or four baseline docs existed | baseline docs created in this run | Future specs can use baseline docs |

## External / Current Research

| Question | Source | Finding | Decision impact |
|---|---|---|---|
| What must audit viewers protect? | OWASP Logging and Authorization Cheat Sheets | Sensitive logs need access control; credentials and session secrets must not be exposed; sanitize untrusted values. | Dedicated permission, recursive masking, no raw token/password fields. |
| Where should authorization live? | NestJS Authorization docs | Guards can protect controller/method boundaries. | Use existing `AccessTokenGuard` + `PermissionGuard` + `@RequirePermission`. |
| How should the App Router load data? | Next.js App Router fetching docs | Fetch data through App Router server/client patterns. | Reuse current client admin API wrapper for interactive filters. |

## Architecture Pattern Evaluation

| Option | Strengths | Risks / Limitations | Decision |
|---|---|---|---|
| Dedicated query service/controller | Clear read boundary, testable filters, no mutation coupling | Adds a small module | Selected |
| Global audit interceptor | Broad automatic coverage | Duplicate/incorrect snapshots and transaction ambiguity | Rejected for this scope |
| Client-side all-row filtering | Simple UI code | Leaks data, poor scale, no server authorization boundary | Rejected |

## Design Decisions

### Decision: Read-only audit boundary

- **Selected approach:** `AuditQueryService` owns validated filters, stable order, count, pagination, detail lookup, and masking; `AuditController` owns route/guard/DTO wiring.
- **Rationale:** preserves `AuditLogger` as a write concern and keeps query behavior independently testable.
- **Status:** Accepted.

### Decision: Coordination with tenant provisioning

- `admin-system-activity-audit` and `admin-tenant-provisioning` are parallel specs with a coordination-only relationship. The audit feature consumes `TENANT_CREATE`/`USER_CREATE` values and does not implement tenant provisioning mutations. Shared schema/seed edits must be merged without replacing either spec’s additive changes.
- **Status:** Accepted.

## Risks & Mitigations

- Sensitive JSON leakage — recursively mask credential-like keys and test nested payloads.
- Large history queries — cap page size, use server-side pagination, stable order, and an index/query-plan acceptance fixture.
- Missing module registration — final E2E/reachability task checks backend module import, frontend route, navigation, and dashboard caller.
