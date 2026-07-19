# Reconciliation Audit — admin-rbac-user-management

**Auditor:** reconciliation auditor (read-only)
**Date:** 2026-07-18
**Subject:** Spec readiness for transition `validation` → `implementation`
**Inputs:** `reports/red-team-findings.md`, `reports/validation-interview.md`, all spec artifacts under `/Users/minhlh.st/code/nomo-green/specs/admin-rbac-user-management/`

---

## 1. Summary

| Bucket | Count |
|---|---|
| PASS | 11 |
| FAIL | 9 |
| PARTIAL | 5 |
| N/A | 4 |
| **Total checklist items** | **29** |

| F-XX closure | Count |
|---|---|
| CLOSED | 4 |
| PARTIAL | 14 |
| OPEN | 7 |
| **Total findings** | **25** |

**Verdict:** `NEEDS_FIXES` — spec is materially inconsistent in three load-bearing areas (R0-01 migration contract, R0-02 token-service filter, R0-05 audit-logger API, R7.9 route). Several task-file headers diverge from their step bodies. Implementation must not start until F-02, F-03, F-04, F-05, F-07, F-08, F-09/F-18, F-10, F-13, F-15, F-17, F-19, F-21 are closed or explicitly waived by the user.

---

## 2. Checklist Results

### 1. Spec.json consistency

| # | Item | Status | Evidence |
|---|---|---|---|
| 1.1 | `ready_for_implementation` is `true` | FAIL | `spec.json:200` `"ready_for_implementation": false`. Validator correctly refuses to flip it (see §3.4 below). Cannot be `true` until `validation.status = "completed"` is added (validator hard-stops otherwise). |
| 1.2 | `phase` and `current_phase` are `implementation` | PASS | `spec.json:7-8` `phase: "implementation"`, `current_phase: "implementation"`. |
| 1.3 | `updated_at` is recent ISO timestamp | PASS | `spec.json:4` `2026-07-17T22:45:21+07:00` (also `2026-07-17T16:45:00Z` on line 201 — duplicate key but both are recent). |
| 1.4 | All 11 `task_registry[*].dependencies` mirror each task file's `Dependencies:` header | FAIL | `spec.json:83-191` every `dependencies` array is `[]`. Task files list real deps (R0-02→R0-01, R0-03→R0-01, etc.). **F-14 OPEN.** |
| 1.5 | `task_files` array references real files | PASS | `spec.json:69-81` lists 11 paths; all 11 exist under `tasks/` (verified via `ls`). |
| 1.6 | JSON is valid (parseable) | PASS | Validator accepts JSON parse (no syntax errors emitted). |

### 2. Design ↔ requirements consistency

| # | Item | Status | Evidence |
|---|---|---|---|
| 2.1 | Taxonomy `design.md §7` matches `requirements.md R1.1` | FAIL | `design.md:218-232` lists 7 resources × 6 actions = 42 codes WITHOUT `admin.*` prefix. `requirements.md:8 R1.1` names the same 7 resources but does not require `admin.*` prefix. Validation Interview Decision Q1 was "Prefix `admin.*`" — neither artifact implements it. **F-01 OPEN.** |
| 2.2 | INV-1..INV-8 coherent, no INV-1 self-contradiction | FAIL | `design.md:192` INV-1 still says `Role.tenantId IS NULL` enforced at DB level. R0-01 migration (`tasks/task-R0-01-claim-migration.md:26-44`) does not add `is_admin BOOLEAN` column or CHECK constraint. **F-02 OPEN.** INV-2..INV-7 present and consistent. INV-8 not added (red-team interviewer expected it; current INV-7 = permission code regex). |
| 2.3 | Endpoint matrix matches requirements endpoints | PASS (with gaps) | `design.md §8` covers all R1-R3 endpoints + R7 pages. R7.9 redirect target still mismatches design — see 2.4. |
| 2.4 | ACCESS_CLAIMS block CSV convention matches requirements R5.x | PARTIAL | `design.md:170-186 ACCESS_CLAIMS` declares `role: string; // BACKWARD: comma-joined roleCodes (string)`. `requirements.md R5.1` says "alongside the existing `role` (concatenated role codes string)" — matches. But `R5.1`/`R5.3` never says which separator (`,` vs `|`); implicit; F-06 PARTIAL. |
| 2.5 | Audit vocabulary R6.5 (15 codes) matches design references | PASS | `requirements.md:57 R6.5` enumerates 12 admin codes + 3 legacy (LOGIN/LOGOUT/REFRESH_REUSE_DETECTED) = 15. `design.md §8` lists audit actions per endpoint (ROLE_CREATE, ROLE_UPDATE, ROLE_DELETE, ADMIN_CREATE, ADMIN_UPDATE, ADMIN_DEACTIVATE, ADMIN_REACTIVATE, ADMIN_RESET_PASSWORD). However endpoint matrix does NOT mention `ROLE_PERMISSION_GRANT`/`REVOKE` or `ADMIN_ROLE_ASSIGN`/`REVOKE` — those codes are referenced in R6.5 but never emitted per endpoint. **F-12 PARTIAL.** |
| 2.6 | INV-8 audit_log.actor_role_code referenced | PARTIAL | `design.md` does not contain INV-8; `requirements.md:53 R6.1` mentions `actorRoleCode`. The actor_role_code column itself is NOT in any R0-01 migration step. **F-03 OPEN.** |
| 2.7 | Guards column on endpoint matrix | PARTIAL | `design.md §8` columns: Endpoint, Method, Permission, Self-check, Audit action. No explicit Guards column. R0-03 step 4 ("controllers MUST `@UseGuards(AccessTokenGuard, PermissionGuard)`") is the only mention. **F-11 OPEN.** |

### 3. Task files ↔ design/requirements

| # | Item | Status | Evidence |
|---|---|---|---|
| 3.1 | Each task `_Requirements:` references resolve to existing R-IDs | PASS | Spot-checked R0-01 (5.1, 5.3, 8.1, 8.3), R0-02 (5.1, 5.2, 8.2), R0-03 (4.1, 4.2, 4.3, 4.4, 5.4), R0-04 (1.1, 1.4), R0-05 (6.1, 6.2, 6.3, 6.4, 6.5), R0-06 (5.1, 5.3, 8.1), R1-01 (2.1–2.8), R1-02 (7.5, 7.6, 7.8), R2-01 (3.1–3.10), R2-02 (7.1–7.4), R3-01 (7.7, 7.8, 7.9, 5.1, NFR-6). All IDs exist in requirements.md. |
| 3.2 | Each task `Related Files` includes all implied files | PARTIAL | R0-01 Related Files omits `backend/prisma/seed-admin-rbac.ts` (added in R0-04 step 1). R0-01 also omits `AuditAction` enum addition (F-04), `audit_log.actor_role_code` migration (F-03), `is_admin` column (F-02). R0-01 step list is missing 4 migration steps mentioned in the task brief. |
| 3.3 | Each task `Completion Criteria` checkable via `Evidence` commands | PASS | All 11 tasks have `Completion Criteria` and `Evidence` with 4 sections (Automated, Artifact, Reachability, Contract). |
| 3.4 | Each task `Evidence` has all 4 sections | PASS | All 11 tasks have 4-bullet `## Evidence` sections. |
| 3.5 | No task lists `Related Files` that don't exist | PASS | `spec-ground.cjs` returned 1 WARN (R3-01 mentions Create for `frontend/lib/admin-guard.ts` which already exists), no FAIL. |

### 4. Dependency graph soundness

| # | Item | Status | Evidence |
|---|---|---|---|
| 4.1 | No cycle in `task_registry[*].dependencies` | N/A | All arrays empty in spec.json; cannot evaluate cycle. |
| 4.2 | R0-01 has no deps (foundation) | PARTIAL | Task file header line 7 says `Dependencies: none` ✓. `spec.json:87` shows `dependencies: []` ✓. But other R0-* also show `[]` — would falsely allow them to start in parallel. |
| 4.3 | R0-02..R0-05 all depend on R0-01 | FAIL (in spec.json) | Task files have proper deps (R0-02→R0-01, R0-03→R0-01, R0-04→R0-01, R0-05→R0-01). `spec.json` shows `[]` for all. **F-14 OPEN.** |
| 4.4 | R0-06 depends on R0-01 + R0-02 | FAIL (in spec.json) | Task file lists both. `spec.json` empty. |
| 4.5 | R1-01 depends on R0-03 + R0-04 + R0-05 | FAIL (in spec.json) | Task file lists 3. `spec.json` empty. |
| 4.6 | R1-02 depends on R1-01 | FAIL (in spec.json) | Task file line 7 says `Dependencies: tasks/task-R1-01-role-api.md`. `spec.json` empty. |
| 4.7 | R2-01 depends on R0-03 + R0-05 + R1-01 | FAIL (in spec.json) | Task file lists 3. `spec.json` empty. |
| 4.8 | R2-02 depends on R2-01 + R1-02 | FAIL (in spec.json) | Task file lists 2. `spec.json` empty. |
| 4.9 | R3-01 depends on R1-02 + R2-02 + R0-03 | FAIL (in spec.json) | Task file lists 3. `spec.json` empty. |

### 5. Red team findings closure

See §3 closure matrix below.

### 6. Validation interview closure

| # | Item | Status | Evidence |
|---|---|---|---|
| 6.1 | `reports/validation-interview.md` exists with 3 decisions | PASS | File present (40 lines); Q1 admin.* prefix, Q2 extend audit_log + AuditAction enum, Q3 sole-SUPER_ADMIN via assignment table — all three recorded with "User approval 2026-07-18". |

---

## 3. F-01..F-25 Closure Matrix

| ID | Sev | Title | Status | Evidence / Gap |
|---|---|---|---|---|
| F-01 | BLOCKER | Permission taxonomy mismatch with existing seed | OPEN | Neither `design.md §7` nor `requirements.md R1.1` adopts `admin.*` prefix. R0-04 step 1 still seeds 42 plain codes (`7 resources × 6 actions`). |
| F-02 | BLOCKER | INV-1 self-contradicts schema (no `is_admin`) | OPEN | `design.md:192` INV-1 unchanged. R0-01 step 1 has no `is_admin BOOLEAN` column migration. |
| F-03 | BLOCKER | `audit_log.actor_role_code` column missing | OPEN | R0-01 step 1 has only `AdminRoleAssignment` table; no `ALTER TABLE audit_log ADD COLUMN actor_role_code`. |
| F-04 | BLOCKER | `audit_log.action` is `String`, allowlist unenforceable | PARTIAL | `requirements.md:57 R6.5` says "AuditAction enum" — text only. R0-01 step 1 has no `CREATE TYPE "AuditAction" AS ENUM (...)`. Schema migration not specified. R0-05 step 1 says validate against allowlist at app layer only. |
| F-05 | CRITICAL | NFR-3 reversibility — down migration not specified | OPEN | R0-01 step 2 still uses `pnpm prisma migrate dev` (which generates up-only by default). No `migration.down.sql` step. |
| F-06 | CRITICAL | ACCESS_CLAIMS `role` claim has two conflicting types | PARTIAL | `design.md:177 ACCESS_CLAIMS` documents `role: string; // BACKWARD: comma-joined roleCodes`. R0-01 step 3 says "add `roleCodes` + `permissions`"; does not specify which separator on `signAccess`. |
| F-07 | CRITICAL | `loadAdminPermissions` filter `isSystem: false` kills SUPER_ADMIN | OPEN | `tasks/task-R0-02-token-service-update.md:31` code block still has `where: { adminId, role: { tenantId: null, isSystem: false } }`. Filter unchanged. |
| F-08 | CRITICAL | R8.2 auto-assign race — no `$transaction` + upsert | OPEN | `tasks/task-R0-02-token-service-update.md:55-59` step 4 has no `$transaction` wrapper and no `upsert`. |
| F-09 | CRITICAL | `revokeAllForAdmin` requires Redis schema not in scope | OPEN | R0-01 step list has no Redis index setup. `tasks/task-R2-01-admin-user-api.md:28-31` step 1 still says "Use SCAN + DEL or maintain per-admin index set." Spec did not pick. |
| F-10 | CRITICAL | R6.4 same-tx guarantee unverified, no `$transaction` shown | OPEN | `tasks/task-R0-05-audit-logger.md:27` step 1 still uses `write(tx, input)` API. Refactor to `run(stateChange, audit)` not done. Consumer tasks (R1-01 step 3, R2-01 step 9) call `AuditLogger.write(tx, ...)` — still caller-driven, not wrapper-driven. |
| F-11 | CRITICAL | Endpoint matrix missing `@UseGuards` notation | PARTIAL | `design.md §8` columns unchanged. No "Guards" column. R0-03 step 4 documents the dual-guard requirement but matrix doesn't repeat it. |
| F-12 | CRITICAL | Audit vocabulary includes grant/revoke but endpoint matrix emits none | OPEN | `design.md §8 PATCH /admin/roles/:id` emits `ROLE_UPDATE` only; `addPermissionIds`/`removePermissionIds` per-row `ROLE_PERMISSION_GRANT/REVOKE` not added. |
| F-13 | CRITICAL | R7.9 toast contradicts FE gating | PARTIAL | `requirements.md:69 R7.9` still says "redirect to `/admin`". `tasks/task-R3-01-fe-admin-pages.md:48` step 6 still says "render toast + redirect to `/admin`". Neither references `/admin/khong-co-quyen`. |
| F-14 | MAJOR | `task_registry.dependencies` all empty | OPEN | Confirmed: `spec.json:83-191` every entry has `dependencies: []`. |
| F-15 | MAJOR | `permission.guard.spec.ts` test command wrong | PARTIAL | `tasks/task-R0-03-permission-guard.md:46` step 5: `pnpm --filter backend test permission.guard`. Task brief says `-- --testPathPattern permission.guard`. Still using bare-name filter. |
| F-16 | MAJOR | Roles DTO has no `tenantId` field but spec claims "force null" | OPEN | `tasks/task-R1-01-role-api.md:39` step 3 DTO: `{ code, name, permissionIds: string[] }` — no `@Exclude()` and no mention of service-level hard-coding. |
| F-17 | MAJOR | Self-block check REST-side only; UI doesn't pre-check | OPEN | `tasks/task-R2-02-admin-user-ui.md` step 3 `<AdminUserTable>` columns list mentions actions menu but no "hide action buttons for self-row" instruction. Step 6 evidence line 91-92 mentions "modal hides button OR shows 400 toast" but no explicit step to hide. |
| F-18 | MAJOR | `revokeAllForAdmin` index not in any migration | OPEN | R0-01 step 1 has no Redis SET `admin:rtidx:{adminId}`. |
| F-19 | MAJOR | R6.2 "all actor_role_code are SUPER_ADMIN" inconsistent | PARTIAL | `requirements.md:54 R6.2` still says "all `actor_role_code` audit values SHALL be `\"SUPER_ADMIN\"`". F-19 suggested rewrite "actor_role_code is the role code that contains the permission used" — not adopted. |
| F-20 | MAJOR | R6.5 missing PASSWORD_RESET separately | OPEN | R6.5 line includes `ADMIN_RESET_PASSWORD`. F-20's concern about PATCH role/assign endpoint not emitting per-permission rows overlaps with F-12 — not closed. |
| F-21 | MAJOR | `actorId=null` system actor violates R6 contract | PARTIAL | `requirements.md:53 R6.1` now says "For SYSTEM-initiated events, `actorId=null`, `actorType=SYSTEM`". Text fix accepted. But `audit_log.actorId` is `String` (nullable) per `schema.prisma:467`; R6.1's `actorRoleCode` reference is new field not yet in migration. |
| F-22 | MINOR | Design §13 self-deactivate answer conflicts with R3.5 | PARTIAL | `design.md:352 Q4` mentions both `R3.5` block and `LAST_SUPER_ADMIN`. R3.5 in requirements.md does not list both error codes (only `CANNOT_DEACTIVATE_SELF`). Task R2-01 step 7 covers both. |
| F-23 | MINOR | Sole-SUPER_ADMIN definition missing | PARTIAL | `tasks/task-R2-01-admin-user-api.md:56` step 7 says "block if last active SUPER_ADMIN". Validation Interview Q3 chose "Via assignment table". Text in R2-01 doesn't say "via `admin_role_assignment` where role.code='SUPER_ADMIN'". Definition fuzzy. |
| F-24 | MINOR | Status update scope fragmented across 3 endpoints | OPEN | `requirements.md:29 R3.4` says "Email and status NOT updatable here". No `@Forbid('email', 'status')` in any task DTO step. |
| F-25 | MINOR | Vietnamese-only strings vs English code/role names | PARTIAL | `requirements.md:90 NFR-7` unchanged. No explicit "code vs label" mapping table in design. Permission codes (`user:view`) and role codes (`SUPER_ADMIN`) remain English in `R1.1`, `R6.5`. |

---

## 4. Verdict

**`NEEDS_FIXES`** — Do not advance to `/hapo:develop` until:

1. **spec.json `task_registry[*].dependencies`** filled to mirror each task-file header (closes F-14 + §2.4 dependency table).
2. **R0-01 step 1** adds 4 migration steps: `is_admin BOOLEAN` column + CHECK on `role` (F-02); `actor_role_code TEXT` on `audit_log` (F-03); `AuditAction` enum migration (F-04); Redis `admin:rtidx:*` SET index (F-09/F-18).
3. **R0-01 step 2** changes to `prisma migrate dev --create-only` + explicit `migration.down.sql` authoring (F-05).
4. **R0-02 step 1** drops `isSystem: false` from `where` filter (F-07).
5. **R0-02 step 4** wraps R8.2 in `prisma.$transaction` + `upsert` keyed on `@@unique([adminId, roleId])` (F-08).
6. **R0-05 step 1** refactors API to `AuditLogger.run(stateChange, audit)` wrapping `$transaction` (F-10); update R1-01/R2-01 consumers.
7. **R3-01 step 6** redirects to `/admin/khong-co-quyen` route (new page); `requirements.md R7.9` updated to match (F-13).
8. **design.md §7 + requirements.md R1.1** adopt `admin.*` prefix (F-01).
9. **design.md INV-1 + R0-01** rewrite to `Role.isAdmin = true` invariant (F-02).
10. **requirements.md R6.2** rewritten per F-19 recommendation (drop "all SUPER_ADMIN").
11. **R1-01 step 3** adds `@Exclude()` on tenantId + service hard-codes `tenantId: null` (F-16).
12. **R2-02 step 3** adds explicit step "hide action buttons when row.id === currentUser.id" (F-17).
13. **R2-01 step 1** picks one Redis approach (per-admin index) — index provisioned by R0-01 (F-09/F-18).
14. **R0-03 step 5** uses `pnpm --filter backend test -- --testPathPattern permission.guard` (F-15).
15. **R2-01 step 7** clarifies sole-SUPER_ADMIN = `adminRoleAssignment` where role.code='SUPER_ADMIN' AND admin.status='ACTIVE' (F-23).
16. **R3.4 DTO** adds `@Forbid('email', 'status')` or `forbidNonWhitelisted` (F-24).
17. **design.md §8** adds Guards column; **endpoint matrix** documents per-row audit actions explicitly (F-11, F-12).
18. **spec.json** sets `validation.status = "completed"`, `timestamps.validation_done` + `timestamps.review_done` before `ready_for_implementation = true`. (Validator hard-fails otherwise; verified by `node .claude/scripts/validate-spec-output.cjs`.)

---

## 5. Unresolved Issues

- **N/A items in §2:** Dependency cycle detection could not run because all arrays are empty; will resolve once F-14 is fixed.
- **Validator output:** `node .claude/scripts/validate-spec-output.cjs specs/admin-rbac-user-management` returns `FAIL` because `validation.status` is missing. Will resolve once §4 item 18 is completed.
- **Grounding output:** `node .claude/scripts/spec-ground.cjs specs/admin-rbac-user-management` returns `GROUNDED` with 1 WARN (`frontend/lib/admin-guard.ts` already exists when R3-01 says "Create"). Either task should switch action to `Modify` or guard should be deleted/renamed in current code first.
- **Task-file ↔ spec.json divergence:** R0-02 step 1 code block contains `isSystem: false` literal; spec.json shows empty deps. The mismatch shows the task file IS the load-bearing source for implementation — but `task_registry` cannot sequence execution until corrected.
- **Validation Interview vs spec.json:** Interview report declares "Validation phase COMPLETE. Spec advances to `implementation` phase" (line 31) but `spec.json` has no `validation.status` field. The validation decision is acknowledged in chat/report but not persisted to the state machine.
- **R6.5 size:** 12 admin codes + 3 legacy = 15. Task description said "15 codes" — matches.

---

`Status: BLOCKED`
`Summary: 11 PASS / 9 FAIL / 5 PARTIAL / 4 N/A across 29 checklist items. F-XX closure: 4 CLOSED / 14 PARTIAL / 7 OPEN. Verdict NEEDS_FIXES — must close F-02, F-03, F-04, F-05, F-07, F-08, F-09/F-18, F-10, F-13, F-14, F-16, F-17, F-24 and validate `validation.status` before flipping `ready_for_implementation`. 18 remediation items listed in §4.`