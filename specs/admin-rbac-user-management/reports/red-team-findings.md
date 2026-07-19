# Red Team Findings — admin-rbac-user-management

**Reviewer:** code-review (Red Team)
**Date:** 2026-07-18
**Spec phase:** validation
**Scope:** spec defects that break implementation. Not code review.

---

## 1. Summary

| Severity | Count |
|---|---|
| BLOCKER | 4 |
| CRITICAL | 9 |
| MAJOR | 7 |
| MINOR | 5 |
| **Total** | **25** |

**Verdict: FAIL — spec requires corrections before implementation.**

The spec reads coherently as a narrative, but cross-checking against the existing `admin-authentication` contracts (NFR-4), the current `Prisma` schema (`Role`, `Permission`, `RolePermission` already exist), the bootstrap seed (`backend/prisma/seed.ts`), and the named `ACCESS_CLAIMS`/`ADMIN_IDENTITY` invariants surfaced 25 spec-defects. BLOCKERs deal with state-machine integrity and contract drift; CRITICALs deal with the migration contract that NFR-4 explicitly requires.

---

## 2. Findings Table

| ID | Sev | Area | Title |
|---|---|---|---|
| F-01 | BLOCKER | Permissions | Permission taxonomy mismatches existing `seed.ts` resources |
| F-02 | BLOCKER | INV-1 | INV-1 self-contradicts: `Role.tenantId` is real but admin-only `null` claim broken |
| F-03 | BLOCKER | Audit | `actor_role_code` field referenced but `audit_log` schema has no such column |
| F-04 | BLOCKER | Permissions | `audit_log.action` columns are `String`, allowlist enforcement not actually possible at DB level |
| F-05 | CRITICAL | Migration | NFR-3 reversibility ignored — Phase A `down` never specified |
| F-06 | CRITICAL | ACCESS_CLAIMS | `roleCodes` semantics: comma-join vs. `string[]` defined twice with different type |
| F-07 | CRITICAL | R0-02 | `loadAdminPermissions` filters `isSystem:false` — kills SUPER_ADMIN short-circuit at login |
| F-08 | CRITICAL | R8.x | R8.2 "auto-assign" races with `loadAdminPermissions` (no transaction wrap) |
| F-09 | CRITICAL | R3.7 | Reset-password revoke-all uses Redis SCAN — invasive runtime change with no spike test |
| F-10 | CRITICAL | R6.4 | No `Prisma.$transaction` invocation shown in any task — same-tx claim is aspirational |
| F-11 | CRITICAL | Endpoint matrix | `/admin/users/:id` PATCH missing `@UseGuards(PermissionGuard)` annotation in spec matrix |
| F-12 | CRITICAL | Audit | `ROLE_PERMISSION_GRANT`/`REVOKE` vocabulary exists (R6.5) but endpoint matrix emits none |
| F-13 | CRITICAL | R7.x | "Toast" requirement (R7.9) contradicts FE gating — URL-leak protection missing |
| F-14 | MAJOR | task_registry | All `dependencies: []` arrays empty — `task_registry` contradicts task-file "Dependencies" headers |
| F-15 | MAJOR | R0-03 | `permission.guard.spec.ts` does not exist in `auth.spec.ts` coverage; e2e spec placement wrong |
| F-16 | MAJOR | R1-01 | `roles.service` claims `tenantId: null` enforcement but admin role DTO has no tenantId field |
| F-17 | MAJOR | R2-01 | Self-block `CANNOT_RESET_OWN_VIA_ADMIN_API` only REST — UI never gets feedback until it calls API |
| F-18 | MAJOR | R3.7.a | `revokeAllForAdmin` requires per-admin index not in current schema or migration list |
| F-19 | MAJOR | Permissions | R6.2 "all actor_role_code are SUPER_ADMIN" inconsistent — SUPPORT also creates roles per design §8 |
| F-20 | MAJOR | Q-Audit | R6.2 + R6.5 is structural (let me list both endpoints): `Audit actions do not include PASSWORD_RESET separately |
| F-21 | MAJOR | R0-04 | SYSTEM actor for audit `actorId=null` violates `audit_log.actor_id` schema (nullable but R6 contract says "actorId=<caller>") |
| F-22 | MINOR | Open Q | Design §13 Q-self-deactivate answers conflict (block via R3.5 vs. "also block sole SUPER_ADMIN") |
| F-23 | MINOR | R3.5 | "sole SUPER_ADMIN" definition missing — `roleCodes.includes('SUPER_ADMIN') AND status='ACTIVE'` count unclear for frozen/enum-retained admins |
| F-24 | MINOR | R3.4 | "email and status NOT updatable here" — but R3.5/R3.6 update `status` via other endpoints; no shared schema-validation helper |
| F-25 | MINOR | NFR-7 | "All strings Vietnamese" hard rule, but DB seed data (role codes, permission codes) are English — risk of UI/code mismatch |

---

## 3. Per-Finding Detail

### F-01 — BLOCKER — Permission taxonomy mismatch with existing seed

**Location:** design.md §7 (Permission Taxonomy) and task-R0-04 step 1

**Issue:** design.md §7 defines taxonomy: `user, role, permission, tenant, billing, report, support`. task-R0-04 claims "seed all 42 codes (7 resources × 6 actions)". But existing `backend/prisma/seed.ts:101-113` already seeds `dashboard, product, purchase, inventory, sales, customer, supplier, debt, report, setting` (10 resources × 6 actions = 60 codes). The new RBAC seed will coexist — old `sales:view` (tenant RBAC) ≠ new `user:view` (admin RBAC). No migration handles the dual-catalog naming.

**Why it matters:** Two `permission.code` namespaces share one table with a `@@unique` on `code` (schema.prisma:423). R1.4 ("no duplicates on code") passes only because the codes don't overlap, but `PermissionGuard` reading `user:view` and someone else coding `sales:view` to a tenant-only role will collide on naming once someone tries to grant admin user-management via the *tenant* `Role` table (no DB separation). Implementation will pass tests but fail at the moment a permission is renamed/re-purposed.

**Recommendation:** Document the `admin.*` prefix in taxonomy (e.g. `admin.user:view`) OR split into `permission` (tenant) + `admin_permission` (platform) tables. Either resolution must appear in INV-2 and design §7.

---

### F-02 — BLOCKER — INV-1 self-contradicts the schema

**Location:** design.md §5 INV-1; requirements.md INV-1 lineage

**Issue:** design.md INV-1: "Admin roles MUST have `Role.tenantId IS NULL`. Enforced at API + DB level (CHECK constraint added in migration)." But the existing `Role.tenantId String?` column is `null` for *tenant system roles* OWNER/STAFF (`backend/prisma/seed.ts:175-188`). Adding a `CHECK (tenant_id IS NULL OR is_admin = true)` requires a new column. No task in `task-R0-01` adds such a column or constraint.

**Why it matters:** A tenant owner could create a `Role` with `tenantId IS NULL` (e.g. via the existing OWNER/STAFF tenants path) and grant it `role:create` permission, then the admin `Role` query (`role.tenantId IS NULL`) returns tenant roles. The 401 vs 403 distinction collapses — admin endpoint recognizes tenant-created roles as "platform roles".

**Recommendation:** Add step to R0-01 migration: `ALTER TABLE role ADD COLUMN is_admin BOOLEAN DEFAULT false; CREATE UNIQUE INDEX ... ON role (code) WHERE is_admin = true;`. Update INV-1 text to refer to `is_admin=true` instead of `tenantId IS NULL`.

---

### F-03 — BLOCKER — `audit_log.actor_role_code` column does not exist

**Location:** design.md §5 R6.2, requirements.md R6.2, task-R0-05 step 1

**Issue:** design.md/requirements.md requires `actor_role_code` on audit rows; task-R0-05 says "SUPER_ADMIN-attributed calls record `actor_role_code = "SUPER_ADMIN"` via caller-provided context." The current `AuditLog` model (schema.prisma:465-484) only has `actorType`, `actorId`, `action`, `resource`, `resourceId`, `before`, `after`, `ipAddress`, `userAgent`. **No `actor_role_code` column exists.**

**Why it matters:** R6.2 is structurally impossible without a schema change. The current `task-R0-01` schema-migration list does NOT include `audit_log` modifications. If developer reads R6.2 and stores actor role in `before/after` JSON, the audit-query path (out-of-scope spec) cannot find it via SQL filter. Implementation will either fail-soft by writing to JSON (silently violating R6.2) or hard-fail at compile-time because the Prisma client field does not exist.

**Recommendation:** Add migration step in R0-01: `ALTER TABLE audit_log ADD COLUMN actor_role_code TEXT;`. Update R6.2 to assert "denormalized role-code for query efficiency; nullable for SYSTEM actor". Add to `AuditLog` model.

---

### F-04 — BLOCKER — `audit_log.action` is `String`, not enum — R6.5 cannot be DB-enforced

**Location:** requirements.md R6.5; backend/prisma/schema.prisma:470

**Issue:** R6.5 declares audit action vocabulary as an allowlist. `AuditLog.action` is `String` with no CHECK constraint. The "throw on unknown" promise (task-R0-05 step 4) only handles application-layer enforcement; nothing prevents a future audit-writing call site from inserting `action: 'LOGIN'` (old-style) or `action: 'sale_view'`. Existing `LOGIN/LOGOUT/REFRESH_REUSE_DETECTED` rows already break R6.5 vocabulary.

**Why it matters:** Spec promises an "allowlist" but enforcement is application-side only. A future code path (e.g. ticket close) writing `audit_log.create({action: 'TICKET_CLOSE'})` is currently legal. R6.5 cannot be satisfied as written.

**Recommendation:** Either (a) convert `AuditLog.action` to PG enum `AuditAction` with the 12 R6.5 codes + `LOGIN/LOGOUT/REFRESH_REUSE_DETECTED` (extending the list explicitly); or (b) split into `admin_audit_log` (R6.5 vocab) + existing `audit_log`. Document decision in design §12.

---

### F-05 — CRITICAL — NFR-3 reversibility is handwaved

**Location:** requirements.md NFR-3; design.md §6 "Reversibility"

**Issue:** NFR-3: "Migration MUST be idempotent and reversible (down migration drops new tables, restores enum column data)." Design §6 says: "down drops new tables and reassigns `PlatformAdmin.role` from role assignments back to enum (using SUPER_ADMIN if any role assigned, else SUPPORT)." No task covers writing the down-migration. `task-R0-01` step 2 runs `prisma migrate dev` — by default Prisma generates a `migration.sql` for `up` only; down-migration requires explicit `--create-only` then manual `migration.down.sql`. None of the 11 tasks mention `migration.down.sql` or the rollback procedure.

**Why it matters:** If Phase A misbehaves in staging, there is no rollback path documented at the task level. The dev will improvise — R8.2 (legacy SUPER_ADMIN auto-assignment) is also undone by down-migration; if rolled back, those auto-assigned rows are orphaned because they live in a dropped table.

**Recommendation:** Add step in `task-R0-01`: explicit `prisma migrate dev --create-only` then author `migration.down.sql` (drop `admin_role_assignment`, restore enum from `Role.code` lookup). Add Evidence line: `pgm Down` returns 0.

---

### F-06 — CRITICAL — ACCESS_CLAIMS `role` claim has two conflicting types

**Location:** design.md §5 ACCESS_CLAIMS, vs. ADMIN_IDENTITY

**Issue:** ACCESS_CLAIMS block says `role: string; // BACKWARD: comma-joined roleCodes (string)`. ADMIN_IDENTITY block says `roleCodes: string[]`. But `task-R0-01` step 3 "Add `roleCodes: string[]` + `permissions: string[]` to `AdminIdentity` and `AccessClaims`" — AccessClaims is a JWT payload, JWT payloads accept primitives only (no arrays-as-claims cleanly typed). The "BACKWARD: comma-joined roleCodes" claim is implementation detail at JWT-serialize time, but it's not specified whether `signAccess` joins with `,` or `|` or whether the receiving code splits or reads the array.

**Why it matters:** Old `admin-authentication` spec R8.5 contract: `payload.role` is `string`. New code adds `roleCodes: string[]` — but `task-R0-01` step 3 rewrites `token.service.ts` to "expand `signAccess` payload" without specifying that `role` (existing string) becomes the comma-joined form. NFR-4 "tests unchanged" will pass only if the existing `token.service.spec.ts` checks `payload.role === "SUPER_ADMIN"`. After migration, login with multi-role admin must produce a `role` string that old consumers still recognize — uncomma-joined multi-role would BREAK NFR-4.

**Recommendation:** Spec text: "On sign, set `payload.role = roleCodes.join(',')` so backward consumer reading `payload.role` sees CSV. On validate, treat `payload.role` as deprecated; read `payload.roleCodes ?? payload.role.split(',')`." Both branches must be in the unit test for backward compat.

---

### F-07 — CRITICAL — `loadAdminPermissions` filter kills SUPER_ADMIN shortcut at login

**Location:** task-R0-02 step 1 code block

**Issue:** The proposed `loadAdminPermissions()` has `where: { adminId, role: { tenantId: null, isSystem: false } }`. Filter `isSystem: false` excludes the seeded `SUPER_ADMIN` system role (R0-04 step 2 explicitly creates SUPER_ADMIN with `isSystem: true`). On first login, the auto-assigned SUPER_ADMIN (R8.2) has the system role; `loadAdminPermissions` returns `roleCodes: []` and `permissions: []`. The downstream `PermissionGuard` (R4.2 super-admin shortcut) checks `roleCodes.includes('SUPER_ADMIN')` — which is now empty — so SUPER_ADMIN has no bypass.

**Why it matters:** This is contradictory at design level: R8.2 says legacy SUPER_ADMIN must get all permissions; R0-04 says SUPER_ADMIN role is `isSystem: true`; R0-02's helper filters out `isSystem: true` roles. SUPER_ADMIN shortcut fails on first login, locking out the only operator capable of granting themselves new permissions. Classic deadlock.

**Recommendation:** Drop `isSystem: false` from the filter. Re-fetch plan: `where: { adminId, role: { tenantId: null } }`.

---

### F-08 — CRITICAL — R8.2 auto-assign races with `loadAdminPermissions`

**Location:** task-R0-02 step 4; requirements.md R8.2

**Issue:** "On `login()`, if admin has no role assignments AND `admin.role === 'SUPER_ADMIN'`, auto-create assignment to seeded system SUPER_ADMIN role (idempotent)." But the check `no role assignments` and the creation `auto-create assignment` are not wrapped in a transaction. Concurrent login attempts (replicating frontend retried POST) will both pass the check, both attempt to insert, one fails on `@@unique([adminId, roleId])` (R0-01 step 1 schema).

**Why it matters:** spec promises "idempotent" but doesn't specify the idempotency mechanism. Idempotency is supposed to be the unique constraint at DB level, but the failed insert throws and login returns 500 — operator sees broken login while valid assignment exists.

**Recommendation:** Wrap step 4 in `prisma.$transaction` + use `upsert` (not `create`) keyed on the unique. Add Evidence: "concurrent first-time logins both return 200 with `permissions[]` non-empty".

---

### F-09 — CRITICAL — `revokeAllForAdmin` requires Redis schema not in scope

**Location:** task-R2-01 step 1

**Issue:** "Add `RefreshTokenStore.revokeAllForAdmin(adminId)`. Use SCAN + DEL or maintain per-admin index set." Current `RefreshTokenStore` (backend/src/platform/auth/refresh-token.store.ts) keys families by `familyId` only — no admin→family index exists. SCAN over `admin:rt:*` is O(total families) which is N×M (admins × sessions) — fine for 10 admins, fails at 1000. Per-admin index (Redis SET `admin:rtidx:{adminId}` containing familyIds) is net-new infra, not in scope, no migration step.

**Why it matters:** R3.7.a promises "revoke ALL refresh-token families for that admin". Implementation has two paths and the spec doesn't choose. Without index, SCAN-block on large keyspaces blocks Redis event loop. Without SCAN, lookup is impossible.

**Recommendation:** Spec must choose: (a) per-admin SET index added by migration step R0-01, OR (b) "best-effort revocation within refresh TTL (30d)" + log warning. Add to NFR-1: "revoke op completes in <200ms with ≤1000 family keys; document degradation".

---

### F-10 — CRITICAL — Audit-same-tx guarantee is unverified, no `$transaction` shown

**Location:** requirements.md R6.4, task-R0-05 step 1, task-R1-01 step 3

**Issue:** R6.4: "Audit log writes SHALL run inside the same DB transaction as the state change, OR fail closed (rollback state change) — no orphan rows." task-R0-05 API design is `AuditLogger.write(tx, input)` where `tx = Prisma.TransactionClient`. task-R1-01 step 3 (`POST /admin/roles`) says "write role + role_permission in tx + audit" but doesn't show the `$transaction` invocation. The actual transaction wrapper is missing from every consumer task.

**Why it matters:** The function signature `write(tx, ...)` enforces contract at *call site* — but if any consumer (R1-01, R2-01) forgets to pass `tx` and instead uses `prisma` directly, the audit row is written outside the state-change transaction. The bug is silent: 99% of the time both writes succeed; on DB error, audit succeeds, state rollbacks. R6.4 violated.

**Recommendation:** Refactor `AuditLogger.write` to accept no `tx` and instead expose `AuditLogger.run(stateChange, audit)` that wraps both in a single `prisma.$transaction`. Forces the consumer pattern. Update all R1-01/R2-01 step texts.

---

### F-11 — CRITICAL — Endpoint matrix missing `@UseGuards` notation for several routes

**Location:** design.md §8 Endpoint Matrix

**Issue:** The matrix has 11 endpoints listed with `Permission` column but no `@UseGuards(AccessTokenGuard, PermissionGuard)` annotation is repeated. R0-03 task explicitly says "controllers MUST `@UseGuards(AccessTokenGuard, PermissionGuard)`" but none of the per-endpoint rows show this. Specifically: `/admin/users/:id` PATCH, `/admin/users/:id/deactivate`, `/admin/users/:id/reactivate`, `/admin/users/:id/reset-password` require BOTH `@UseGuards` AND `@RequirePermission(...)` but only the latter appears in the matrix.

**Why it matters:** Easy for implementer to attach `@RequirePermission` without `@UseGuards(PermissionGuard)` — NestJS won't instantiate the guard, R4.1 silently fails (every endpoint becomes "allow-all because no guard was wired").

**Recommendation:** Add a leftmost column "Guards" with value `AccessTokenGuard, PermissionGuard` for all `/admin/*` rows. Cross-reference R0-03 step 1.

---

### F-12 — CRITICAL — Audit vocabulary includes grant/revoke but endpoint matrix emits none

**Location:** requirements.md R6.5 vs. design.md §8 Endpoint Matrix

**Issue:** R6.5 defines 12 action codes including `ROLE_PERMISSION_GRANT` / `ROLE_PERMISSION_REVOKE`. Design §8 endpoint matrix has columns `Audit action` with values like `ROLE_UPDATE` but PATCH `/admin/roles/:id` itself only fires `ROLE_UPDATE` — it never emits grant/revoke per `addPermissionIds` / `removePermissionIds`. The grant/revoke actions are dead vocabulary.

**Why it matters:** Either (a) the spec means `ROLE_UPDATE` covers both before/after permission diffs (acceptable, but R6.5 then has ghost codes), or (b) `PATCH /admin/roles/:id` MUST emit one grant/revoke row per added/removed permission (N rows per call, multi-row audit). Spec is silent.

**Recommendation:** Decide one. Either reduce R6.5 vocabulary to 10 codes, OR document in R2.3 + R0-05 that `addPermissionIds` triggers N rows of `ROLE_PERMISSION_GRANT`, one per ID. Pick one explicitly.

---

### F-13 — CRITICAL — R7.9 toast contradicts FE gating directive

**Location:** requirements.md R7.9 vs R7.8; design.md §12 Risk "Frontend nav filter"

**Issue:** R7.8: "menu item AND the route SHALL be inaccessible (client guard + server 403)". R7.9: "When admin navigates to a route they lack permission for, the system SHALL redirect to `/admin` and show a toast." But task-R3-01 step 6 says "render toast + redirect to `/admin`" — toast appears AFTER redirect. UX-wise, the user already lost the URL context (R7.9 says "no permission leak in URL" — not contradicted, but it's a soft mismatch with the toast visibility). More important: redirect happens `useAdminAuth().admin.permissions` doesn't include the missing perm — but the same JWT claim is the source-of-truth for the guard. After permission revocation, current JWT (15-min) still valid; backend 403; FE gets the toast. Acceptable, but if FE never sees the request (because R7.8 client guard hides it), the toast never fires. The spec never reconciles "client-side hide" vs "server-side force redirect".

**Why it matters:** If implementer hides the route entirely (no route rendered → no chance to redirect → user sees nothing), R7.9 is silently failed.

**Recommendation:** Define a NotAuthorized page route `/admin/khong-co-quyen` that always renders + shows toast, regardless of route gating. R7.9 implementation references that page.

---

### F-14 — MAJOR — `task_registry.dependencies` all empty, contradicts task-file "Dependencies" headers

**Location:** spec.json `task_registry` (every entry has `"dependencies": []`)

**Issue:** spec.json shows all 11 tasks with empty dependency arrays. But task files explicitly list dependencies:
- task-R0-02 header: `Dependencies: tasks/task-R0-01-claim-migration.md`
- task-R0-03 header: `Dependencies: tasks/task-R0-01-claim-migration.md`
- task-R0-04 header: `Dependencies: tasks/task-R0-01-claim-migration.md`
- task-R0-05 header: `Dependencies: tasks/task-R0-01-claim-migration.md`
- task-R0-06 header: `Dependencies: tasks/task-R0-01..., task-R0-02...`
- task-R1-01 header: `Dependencies: task-R0-03..., task-R0-04..., task-R0-05...`
- task-R1-02 header: `Dependencies: task-R1-01...`
- task-R2-01 header: `Dependencies: task-R0-03..., task-R0-05..., task-R1-01...`
- task-R2-02 header: `Dependencies: task-R2-01..., task-R1-02...`
- task-R3-01 header: `Dependencies: task-R1-02..., task-R2-02..., task-R0-03...`

This is a state-sync violation (state-sync.md "task_registry disagrees with matching markdown" → gate violation). The orchestrator cannot sequence execution without the correct dependency graph.

**Why it matters:** Without task_registry being right, parallel-task tooling and `TaskList` consumers do not enforce prerequisites. R0-02 might start before R0-01 schema migration finishes.

**Recommendation:** Mirror the `dependencies` arrays from each task-file header into `spec.json.task_registry`. Update via state-sync.md "On Success" path.

---

### F-15 — MAJOR — `permission.guard.spec.ts` placed inside `auth/` while step 5 invokes `pnpm test permission.guard`

**Location:** task-R0-03 step 5

**Issue:** Step 5 says `cd backend && pnpm test permission.guard`. Jest in this repo picks up `*.spec.ts` adjacent to source (per existing patterns). The spec file is named `permission.guard.spec.ts` and will be discovered by Jest at `backend/src/platform/auth/guards/permission.guard.spec.ts`. This is fine, but the claim "Run `pnpm --filter backend test permission.guard`" implies a single-file CLI arg filter — Jest does support `--testPathPattern permission.guard`; `pnpm test permission.guard` does not. Existing `auth.service.spec.ts` is run via `pnpm test auth.service` (jest defaults). Inconsistent invocation.

**Why it matters:** Dev runs the command, gets "no tests found", wastes time debugging. Minor cascade during the Quality Gate.

**Recommendation:** Step 5 should be `pnpm --filter backend test -- permission.guard` (jest's name-filter) OR add a Jest config tweak.

---

### F-16 — MAJOR — Roles DTO has no `tenantId` field but spec claims "force null"

**Location:** task-R1-01 step 3 DTO

**Issue:** DTO: `{ code, name, permissionIds: string[] }` with class-validator. "Force `tenantId: null`" requires either (a) the create call passes `tenantId: null` explicitly (relies on dev discipline, not enforceable) OR (b) a `@Transform` / `@IsNull()` DTO-level rule + service-level injection. No such rule is shown.

**Why it matters:** Tenant endpoint sharing the same `Role` table can intentionally create `Role.tenantId = <their_tenant>` and the admin `RolesController` will pass that through unless the field is destructured-off and service hard-codes `null`. INV-1 enforcement is a service-side obligation not captured in the task.

**Recommendation:** Add to task-R1-01 step 3: "DTO uses `@Exclude()` to forbid `tenantId`. Service hard-codes `tenantId: null` in `prisma.role.create` call."

---

### F-17 — MAJOR — Self-block check is REST-side only; UI doesn't pre-check

**Location:** task-R2-01 step 7-9 + task-R2-02 step 3

**Issue:** Backend blocks deactivation/reset of self (`CANNOT_DEACTIVATE_SELF`, `CANNOT_RESET_OWN_VIA_ADMIN_API`). UI shows the action button (R7.1) and only after click does the API 400. Spec says "Deactivate/reactivate button toggles status" (R7.1 tasks) with no mention of "hide for self row". User clicks → 400 toast → confused UX.

**Why it matters:** Hard rule (CANNOT_DEACTIVATE_SELF) requires symmetric FE + BE enforcement for no-op UX. Spec leaves UI hidden-by-default behavior unspecified.

**Recommendation:** Add R7.x clause: "Action buttons hidden in row where `admin.id === currentUser.id`" + corresponding step in R2-02.

---

### F-18 — MAJOR — `revokeAllForAdmin` needs index not in any migration step

**Location:** task-R2-01 step 1 + R0-01 (missing)

**Issue:** Same as F-09 from API impact: requires per-admin index. R0-01 migration list does NOT include Redis index schema. R2-01 step 1 should pull "this index already exists by R0-01" but the dependency doesn't.

**Why it matters:** R2-01 will run after R0-01, but R0-01 doesn't establish infra. Either R0-01 should grow to include the Redis index step (cross-cutting, bad practice) or R2-01 carries the index-establishment as prereq.

**Recommendation:** Move `revokeAllForAdmin` index setup to R0-01 (foundational) OR add explicit step R2-01 step 0.5 "ensure index exists".

---

### F-19 — MAJOR — R6.2 "all actor_role_code are SUPER_ADMIN" inconsistent with design

**Location:** requirements.md R6.2 vs design.md §8

**Issue:** R6.2: "Where the SUPER_ADMIN is the only role allowed to call these endpoints, all `actor_role_code` audit values SHALL be `"SUPER_ADMIN"`." But design §8 endpoint matrix shows `role:create` is gated by `role:create` permission (not enum=SUPER_ADMIN). A future permission to grant non-SUPER_ADMIN role creation (via role editor) would break R6.2 — the same endpoint now writes audit with a different `actor_role_code`. The spec assumes "SUPER_ADMIN-only" but the implementation pattern doesn't enforce it.

**Why it matters:** Code-reviewers will see R6.2 violation as soon as the first non-SUPER_ADMIN-with-`role:create` permission grant happens. R6.2 either pretends future-proofing is locked out, or the audit `actor_role_code` truly reflects whatever role did the action.

**Recommendation:** R6.2 rewrite: "actor_role_code is the role code that contains the permission used to authorize this action, joined with ',' if multi". Drop "all values are SUPER_ADMIN".

---

### F-20 — MAJOR — R6.5 missing `ROLE_PERMISSION_GRANT` vs `PASSWORD_RESET`

**Location:** requirements.md R6.5

**Issue:** R6.5 list: `...ADMIN_RESET_PASSWORD, ADMIN_ROLE_ASSIGN, ADMIN_ROLE_REVOKE`. But R3.7 expects password reset itself to be audit-logged with what action code? `ADMIN_RESET_PASSWORD` covers the password event; R3.4 PATCH expects `ADMIN_UPDATE`; R3.1 expects `ADMIN_CREATE`. Where does a "role assigned to admin via PATCH /admin/users/:id" emit? `ADMIN_ROLE_ASSIGN` exists in R6.5 but the spec doesn't say PATCH triggers it. Same F-12: vocabulary-vs-implementation mismatch.

**Recommendation:** Add to each endpoint row in design §8 the *full* action code emitted, not abbreviation.

---

### F-21 — MAJOR — `actorId=null` system actor violates R6 contract

**Location:** task-R0-05 step 3

**Issue:** "After creating system roles + permissions, write a `ROLE_CREATE` audit row attributed to a seeded system actor (or `actorId = null` for SYSTEM)." But R6.1 requires `actorId=<caller>`. SYSTEM seeding has no caller. Either (a) make seed use a stable SYSTEM actor UUID seeded in `platform_admin` table (BootstrapAdmin already does), or (b) create a sentinel convention.

**Why it matters:** If implementer picks option (a), they need to ensure the SYSTEM actor survives seed re-runs and the audit writer accepts SYSTEM as valid `actor_role_code`. Current audit_log schema has `actorType` enum including `SYSTEM` (schema.prisma:115-119), so the path is open — but R6.1 spec text needs updating.

**Recommendation:** R6.1: "For SYSTEM-initiated events, `actorId` may be null and `actorType=SYSTEM`."

---

### F-22 — MINOR — Design §13 self-deactivate answer conflicts with R3.5

**Location:** design.md §13 Q4

**Issue:** "Deactivate self UI behavior? Block via R3.5; if user is sole SUPER_ADMIN, also block (prevent lockout) — documented in task R2-01." But R3.5 only says "Self-deactivation SHALL fail with 400 (CANNOT_DEACTIVATE_SELF)." No mention of sole-SUPER_ADMIN. Sole-SUPER_ADMIN check appears in task-R2-01 step 7: "block if last active SUPER_ADMIN (`LAST_SUPER_ADMIN` 409)". So 400 vs 409 are two separate errors for two separate reasons — implementation must distinguish. Not strictly contradictory but unspecified in R3.5.

**Recommendation:** Augment R3.5 to list both error codes (`CANNOT_DEACTIVATE_SELF` 400; `LAST_SUPER_ADMIN` 409).

---

### F-23 — MINOR — Sole-SUPER_ADMIN definition missing

**Location:** task-R2-01 step 7

**Issue:** "Block if last active SUPER_ADMIN (`LAST_SUPER_ADMIN` 409)". Definition ambiguous: is it (a) one admin with `PlatformAdmin.role=SUPER_ADMIN` (enum, old field) AND `status=ACTIVE`, OR (b) one admin with an `AdminRoleAssignment` linking to a role with `code=SUPER_ADMIN` AND `status=ACTIVE`. Phase A the enum is back-fill only — count via enum gives wrong answer after migration if a new SUPER_ADMIN is granted via M:N only.

**Recommendation:** Define: "Last SUPER_ADMIN = exactly one admin with role assignment to `code='SUPER_ADMIN'` role (idempotent on assignment table) and `status=ACTIVE`". Or use a snapshot helper `countActiveSuperAdmins()` returning the unique count.

---

### F-24 — MINOR — Status update scope fragmented across 3 endpoints

**Location:** requirements.md R3.4 vs R3.5 vs R3.6

**Issue:** R3.4: "Email and status NOT updatable here" — PATCH /admin/users/:id cannot update status. R3.5 and R3.6 update status via dedicated endpoints. No shared status-validator helper.

**Why it matters:** Implementation has three code paths to block (PATCH rejects email/status, deactivate sets status=DISABLED, reactivate sets status=ACTIVE). If PATCH DTO uses `@IsOptional()` without `forbidNonWhitelisted`, status still slips through.

**Recommendation:** Add to R3.4 DTO: `@Forbid('email', 'status')` via class-validator. Reference `class-validator` decorator pattern in task.

---

### F-25 — MINOR — Vietnamese-only strings vs English code/role names

**Location:** NFR-7 + R6.5 + design §7 permission codes

**Issue:** NFR-7: "All user-facing strings in Tiếng Việt." But permission codes (`user:view`), role codes (`SUPER_ADMIN`), audit action codes (`ADMIN_DEACTIVATE`) are English. UI displays these via chip labels — broken English in Tiếng Việt UI is jarring.

**Why it matters:** R7.1 says "actions per row: Sửa / Vô hiệu hoá–Kích hoạt / Đặt lại mật khẩu / Gán lại vai trò" (Vietnamese), but each role chip is `SUPER_ADMIN` (English). No localization layer specified.

**Recommendation:** Document that codes remain English and only labels are localized. Add explicit "code vs label" mapping table to design §9 or rules.

---

## 4. Cross-Cutting Observations

- **`task_registry.dependencies` are empty in spec.json for all 11 tasks.** This is a state-sync violation (state-sync.md) and will block automated execution sequencing. See F-14.
- **NFR-4 ("existing 9 admin-authentication tests pass unchanged")** is on the critical path because the previous spec generated a test suite at `backend/src/platform/auth/*.spec.ts`. Of particular concern:
  - `token.service.spec.ts` builds `AdminIdentity` literals expecting `{id, email, role}` — R0-01's contract addition must keep backward compat with these fixtures. F-06 directly threatens NFR-4.
  - `auth.service.spec.ts` mocks `prisma.platformAdmin.findUnique` — R0-02's new `loadAdminPermissions` requires rewriting mocks OR skipping token-service layer in tests. The change radius is wider than R0-06 acknowledges.
- **Permission taxonomy name collision with existing `seed.ts`** (F-01) is unaddressed and risks a runtime naming crisis during Phase B.
- **`audit_log` schema additions** (F-03, F-04) need to land in R0-01's migration, not in a follow-up.

## 5. Open Questions Surfaced

1. Phase B cut-over happens in a follow-up spec — when? Track owner?
2. Sole-SUPER_ADMIN check semantics across phase A/B transition (F-23) — once enum is dropped, count via M:N only?
3. `admin:*` vs no-prefix permission codes — pick one (F-01).
4. Whether `audit_log` and admin-audit-log should be one table (extending vocab) or split (F-04).

---

`Status: DONE`
`Summary: 25 spec-defects identified. 4 BLOCKER (taxonomy mismatch, INV-1 contradiction, audit_log missing columns for actor_role_code, audit action allowlist unenforceable). 9 CRITICAL covering NFR-3 reversibility gap, ACCESS_CLAIMS contract drift, loadAdminPermissions killing SUPER_ADMIN shortcut on first login, R8.2 race, R6.4 same-tx implementation absence, endpoint matrix guard omission, audit vocabulary vs endpoint-matrix mismatch, per-admin Redis revoke index missing, FE/BE route gating contradiction. 7 MAJOR on task_registry drift, FE pre-checks, sole-SUPER_ADMIN semantics. Spec requires corrections before implementation.`
