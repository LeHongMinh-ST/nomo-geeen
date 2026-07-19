# Red Team Report — admin-tenant-management

**Date:** 2026-07-18
**Mode:** Red Team (4 reviewers, 8 task files)
**Reviewers:** Security Adversary, Failure Mode Analyst, Assumption Destroyer, Scope & Complexity Critic
**Validator gate:** `node .opencode/scripts/validate-spec-output.cjs` PASS (pre-fix); `node .opencode/scripts/spec-ground.cjs` PASS (38 paths)

## Findings Summary

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | Status transitions not atomic under concurrency | Critical | Accept | R1-02, design.md |
| 2 | Export row-cap TOCTOU + unbounded memory | Critical | Accept | R1-03 |
| 3 | AuditLogger transaction-scoped API unverified | Critical | Accept | R0-01, R1-02, R1-03 |
| 4 | AuditAction enum migration path missing | Critical | Accept | R0-01, design.md |
| 5 | Permission foundation proves seed, not runtime authz | Critical | Accept | R0-01, R3-01 |
| 6 | task_registry dependencies empty (execution graph false) | Critical | Accept | spec.json |
| 7 | Concurrent profile edits → lost update + false audit | High | Accept | R1-02 |
| 8 | Stale JWT claims: revocation semantics undefined | High | Accept (scoped) | design.md, R3-01 |
| 9 | CSV formula injection via tenant name/slug | High | Accept | R1-03 |
| 10 | logoUrl XSS/SSRF — no scheme/host validation | High | Accept | R1-02, design.md |
| 11 | Permission grant role-matrix unspecified | High | Accept | R0-01, R3-01 |
| 12 | Lifecycle status has no downstream behavior contract | High | Accept (scoped) | design.md, R1-02 |
| 13 | Detail aggregate counts: schema relations + "open" predicate unverified | High | Accept | R0-02, R1-01 |
| 14 | R0-02 duplicate response mapping + tenant-contracts.ts premature abstraction | High | Accept | R0-02, R1-01 |
| 15 | List pagination unstable under ties/inserts | High | Accept | R1-01 |

**Folded (Medium, applied via related findings above):**
- Soft-delete race during mutation → folded into #1, #7 (mutation predicate must include `deletedAt IS NULL`).
- Export audit atomicity / client-disconnect → folded into #2 (audit commit before response body; partial delivery still audited).
- Unbounded `q` DoS → applied as Medium addition to R0-02/R1-01 (maxLength + indexed search).
- Audit metadata injection (`reason`, UA, IP) → applied as Medium addition to R1-02/R1-03 (length/charset limits, CRLF handling).
- Error leaks tenant existence via status code → applied as Medium addition to R1-01 (uniform 404 for unauthorized object routes).
- Performance benchmark over-specified → R3-01 step 4 narrowed to query-plan inspection + bounded smoke timing.
- R3-01 privacy audit scope creep → narrowed to tenant-feature fixtures only.
- R2-02 claim-refresh scope creep → removed from risk mitigation.
- CSV streaming gold-plating → R1-03 simplified to bounded buffered implementation.

## Finding Detail

### Finding 1: Status transitions not atomic under concurrency
- **Severity:** Critical
- **Location:** Task R1-02, section "Steps", step 2; `design.md` section "Status transition"
- **Flaw:** The transition rule validates a previously-read status then updates without optimistic locking or a `WHERE status = expectedCurrentStatus` predicate.
- **Failure scenario:** Two admins read `ACTIVE`. Admin A transitions to `LOCKED`; Admin B transitions to `SUSPENDED` using the stale `ACTIVE` snapshot. Both pass validation; final state becomes `SUSPENDED`, bypassing the intended decision and producing misleading audit history.
- **Evidence:** "allow only the five transitions"; "return HTTP 409 for unsupported or no-op requests"; no expected-current-status predicate, version, or serialization strategy specified.
- **Suggested fix:** Atomic conditional update `UPDATE ... WHERE id=? AND status=? AND deletedAt IS NULL` inside a Prisma transaction; check `affected_rows === 1`, else HTTP 409; audit the DB-confirmed transition in the same transaction.
- **Disposition:** Accept
- **Rationale:** Application-level validation cannot enforce lifecycle integrity under concurrent requests.

### Finding 2: Export row-cap TOCTOU + unbounded memory
- **Severity:** Critical
- **Location:** Task R1-03, section "Steps", step 2
- **Flaw:** Spec requires a pre-count cap check but no snapshot, atomic count-and-fetch, or `LIMIT 10001` strategy.
- **Failure scenario:** Count returns 9,999; concurrent inserts make the filtered set 10,001 before retrieval → export exceeds cap. Alternatively, buffering to determine overflow can exhaust memory before 413 is returned.
- **Evidence:** "if count exceeds 10,000, return HTTP 413"; "hard 10,000-row precheck before generating CSV".
- **Suggested fix:** Query `findMany({ take: 10001 })` under repeatable-read transaction; if 10,001 rows returned, return 413 with no body; otherwise buffer the bounded 10,000 and stream-emit CSV.
- **Disposition:** Accept
- **Rationale:** Count-then-fetch is not an enforcement boundary under concurrent writes.

### Finding 3: AuditLogger transaction-scoped API unverified
- **Severity:** Critical
- **Location:** Task R0-01, section "Related Files"; Task R1-02, section "Steps", step 3
- **Flaw:** Spec assumes `AuditLogger` participates in the same Prisma transaction, but only instructs implementers to read it. No method signature, transaction-client contract, or failure semantics defined.
- **Failure scenario:** `AuditLogger` opens its own transaction; tenant mutation commits, audit insertion fails, API returns error despite a mutation without an audit trail.
- **Evidence:** R0-01 lists `audit-logger.service.ts` as a Read; R1-02 requires "same transaction" without specifying how.
- **Suggested fix:** Verify the runtime API supports `auditLogger.record({ tx, ... })` (transaction-scoped client). Add a contract note in `design.md` Canonical Contracts: "Audit rows MUST be written via the same `PrismaService.$transaction` client as the tenant mutation." Add failure-injection test.
- **Disposition:** Accept
- **Rationale:** "Use one Prisma transaction" is not implementable evidence without a compatible logger boundary.

### Finding 4: AuditAction enum migration path missing
- **Severity:** Critical
- **Location:** `design.md`, section "Data Contracts & Integration"; Task R0-01, sections "Steps" and "Evidence"
- **Flaw:** Design permits adding strict `AuditAction` enum values, but the task runs only `prisma generate` and `tsc`. No migration artifact, deployment ordering, conflict ownership, or rollback procedure.
- **Failure scenario:** Application code containing `TENANT_UPDATE` deploys before the DB enum migration → every audited mutation fails at runtime; or migration conflicts with the parallel RBAC branch.
- **Evidence:** `design.md:221-225` says "add them through a migration task"; R0-01 lists only schema modification + `prisma generate`/`tsc`.
- **Suggested fix:** Add an explicit R0-01 step: `prisma migrate dev --name add_tenant_audit_actions` (or equivalent supabase migration file); verify generated migration artifact in CI; document deployment ordering relative to RBAC branch.
- **Disposition:** Accept
- **Rationale:** Compile-time enum availability does not make the deployed DB compatible.

### Finding 5: Permission foundation proves seed, not runtime authz
- **Severity:** Critical
- **Location:** Task R0-01, section "Evidence"; Task R3-01, section "Steps"
- **Flaw:** Verification checks seed output, Prisma generation, and TypeScript compilation, but does not prove `PermissionGuard` reads permission claims correctly, handles missing metadata fail-closed, or applies SUPER_ADMIN bypass correctly.
- **Failure scenario:** The four rows exist in Postgres, but JWT claims use a different field or stale format. `PermissionGuard` denies valid admins, or a missing decorator silently permits access. R0 passes while endpoints are insecure or unusable.
- **Evidence:** R0-01 requires `prisma generate` and `tsc` only; R3-01 postpones runtime claim testing to final integration.
- **Suggested fix:** Add an R0-01 prerequisite acceptance test that exercises the completed RBAC foundation against a real token: missing permission → 403, valid permission → pass, missing decorator metadata → 403 fail-closed, SUPER_ADMIN role → pass with audit, role-removal mid-session → documented behavior. Block R1/R2 until this passes.
- **Disposition:** Accept
- **Rationale:** DB seed presence cannot establish runtime authorization correctness.

### Finding 6: task_registry dependencies empty (execution graph false)
- **Severity:** Critical
- **Location:** `spec.json`, sections `"task_registry"` and `"dependencies"`
- **Flaw:** Every registry entry declares `"dependencies": []`, contradicting dependency declarations in task files and the global RBAC blocker.
- **Failure scenario:** R1/R2/R3 tasks execute before R0 contracts, RBAC, or audit enums exist, producing broken imports or rework.
- **Evidence:** `spec.json:85-153` lists empty dependency arrays; `task-R1-02...md:7` requires `R0-01, R0-02, R1-01`; `spec.json:156` says implementation must wait for `admin-rbac-user-management`.
- **Suggested fix:** Populate each registry entry's `dependencies` array with relative task paths matching the task files' `Dependencies:` field.
- **Disposition:** Accept
- **Rationale:** The execution graph is structurally false; scope control cannot work when ordering metadata is missing.

### Finding 7: Concurrent profile edits → lost update + false audit
- **Severity:** High
- **Location:** Task R1-02, section "Steps", step 1; `requirements.md` R2.3–R2.5
- **Flaw:** Profile PATCH has no optimistic concurrency token, `If-Match`, version, or `updatedAt` precondition. Audit captures before/after snapshots that may not represent serialized order.
- **Failure scenario:** Two admins load the same tenant. A edits `name`; B submits an older `mode`. B overwrites A; audit trail records a valid-looking change without detecting the lost update.
- **Evidence:** R1-02 requires transactional audit capture but no version/precondition field; update contract has only editable fields.
- **Suggested fix:** Require `If-Match: <updatedAt>` (or equivalent version field) on PATCH; reject stale writes with HTTP 409; capture before/after from the same transaction row.
- **Disposition:** Accept
- **Rationale:** Transactionality prevents partial writes, not stale-write corruption.

### Finding 8: Stale JWT claims: revocation semantics undefined
- **Severity:** High
- **Location:** `design.md` Canonical Contracts, row "Auth / session"; `research.md` Risks & Mitigations
- **Flaw:** Authorization trusts permission claims embedded in JWTs without specifying revocation, TTL, introspection, or claim-version invalidation. Mitigation deferred to RBAC foundation but not testable here.
- **Failure scenario:** Admin's `admin.tenant:export` grant removed; existing token still carries the claim. Admin continues exporting until natural expiry.
- **Evidence:** "RBAC foundation adds permission claims"; "SUPER_ADMIN bypass follows RBAC foundation"; "require re-login/refresh claim behavior from RBAC foundation".
- **Suggested fix:** Document as explicit cross-spec dependency: revocation/TTL policy is owned by `admin-rbac-user-management`. Add an R3-01 negative test: token issued before role removal must be denied by either short TTL, claim-version check, or per-request permission lookup for high-impact operations (export, status). If RBAC foundation does not ship revocation, record explicit user-accepted risk.
- **Disposition:** Accept (scoped)
- **Rationale:** The mitigation is deferred to another spec but must be testable; otherwise high-impact operations are not safely revocable.

### Finding 9: CSV formula injection via tenant name/slug
- **Severity:** High
- **Location:** Task R1-03, section "Steps", step 2
- **Flaw:** CSV fields are emitted without spreadsheet-formula neutralization.
- **Failure scenario:** Attacker-controlled tenant `name`/`slug` begins with `=`, `+`, `-`, or `@`. Admin opens export in Excel/LibreOffice; cell executes a formula or external-link payload.
- **Evidence:** "emit only `id,slug,name,tenantType,mode,status,createdAt,updatedAt`".
- **Suggested fix:** Escape CSV values per RFC 4180; prefix any value beginning with `=`, `+`, `-`, or `@` with a single quote `'`; test payloads with CRLF and delimiter injection.
- **Disposition:** Accept
- **Rationale:** Permission and row limits do not prevent code execution when exported tenant metadata is attacker-controlled.

### Finding 10: logoUrl XSS/SSRF — no scheme/host validation
- **Severity:** High
- **Location:** Task R1-02, section "Steps", step 1; `design.md` contract `TenantDetail`
- **Flaw:** `logoUrl` is editable but has no scheme, host, length, content-type, redirect, or rendering policy.
- **Failure scenario:** Operator saves `javascript:`/`data:` content, an internal URL, or a malicious remote URL. Admin UI renders it unsafely → stored XSS, credential phishing, or SSRF via image proxying.
- **Evidence:** "whitelist `name`, `tenantType`, `mode`, and `logoUrl`"; contract permits `"logoUrl": "string|null"`.
- **Suggested fix:** Accept only HTTPS URLs from an allowlisted host or controlled object storage; validate server-side; render through a safe image component; reject dangerous schemes and redirects. Add validation unit tests.
- **Disposition:** Accept
- **Rationale:** Field whitelisting limits property names, not payload impact.

### Finding 11: Permission grant role-matrix unspecified
- **Severity:** High
- **Location:** Task R0-01, section "Steps", item 1; Task R3-01, section "Steps", item 2
- **Flaw:** Spec requires permission codes but never defines which roles receive them or whether existing roles are modified.
- **Failure scenario:** Codes seeded with no grants → support admins receive 403 for intended operations. Or a broad default grant gives every admin export or status approval capability.
- **Evidence:** R0-01 says "document expected grants" but defines no grant matrix; R3-01 says to test combinations without specifying expected role outcomes.
- **Suggested fix:** Add an explicit role-permission matrix in `design.md` (e.g. `SUPER_ADMIN` → all four; `SUPPORT` → view only; custom → per business). Update seed script to apply the matrix idempotently; R3-01 asserts the matrix.
- **Disposition:** Accept
- **Rationale:** Least privilege cannot be tested against an undefined authorization policy.

### Finding 12: Lifecycle status has no downstream behavior contract
- **Severity:** High
- **Location:** `design.md`, sections "Architecture Integration" and "Status transition"; Task R1-02, section "Steps", item 2
- **Flaw:** Status changes update only `Tenant.status`; spec never defines how suspended/locked tenants affect auth, active sessions, API access, Redis, subscriptions, or downstream services.
- **Failure scenario:** Admin locks a tenant, audit row succeeds, but existing tenant users retain valid sessions and continue API access because auth middleware never reads or invalidates the new status.
- **Evidence:** `design.md:114-123` defines only the state graph; R1-02 says update status but specifies no side effects; `spec.json:43` names real Redis/auth integration without a status behavior contract.
- **Suggested fix:** Explicitly scope this feature to **metadata-only status**: this spec does NOT enforce session/API/Redis invalidation. Downstream effects are owned by a future `tenant-status-enforcement` spec. Add the scope note to `design.md` Non-Goals and `scope_lock.out_of_scope`.
- **Disposition:** Accept (scoped)
- **Rationale:** The central lifecycle operation must have defined system meaning. Metadata-only is a valid scope; implicit enforcement is not.

### Finding 13: Detail aggregate counts: schema relations + "open" predicate unverified
- **Severity:** High
- **Location:** Task R0-02, section "Steps", item 1; Task R1-01, section "Steps", item 3
- **Flaw:** Contract requires `users`, `subscriptions`, and `openTickets` counts but does not cite Prisma relation names, ticket status predicate, soft-delete handling, or subscription state filter.
- **Failure scenario:** Schema relation is named differently → `_count` does not compile. Or `_count.tickets` returns all tickets, labeling closed tickets as "open."
- **Evidence:** R0-02 says "map ... with `users`, `subscriptions`, and `openTickets` counts"; R1-01 says use `_count` for "open support tickets" without a predicate.
- **Suggested fix:** Run targeted inspect on `backend/prisma/schema.prisma` Tenant relations. Cite exact relation field names in R0-02 and define count predicates (e.g. `tickets` where `status IN ('OPEN','PENDING')` and `deletedAt IS NULL`). Add fixture-backed test.
- **Disposition:** Accept
- **Rationale:** The response contract is not grounded in an executable data query.

### Finding 14: R0-02 duplicate response mapping + tenant-contracts.ts premature abstraction
- **Severity:** High
- **Location:** Task R0-02, sections "Steps" and "Related Files"; Task R1-01, "Steps 2–3"
- **Flaw:** R0-02 creates `dto/` validation contracts AND a separate `tenant-contracts.ts` response-mapping type layer, while R1-01 independently implements list/detail queries and payload mapping. Two competing mapping sites.
- **Failure scenario:** DTOs, `tenant-contracts.ts`, and frontend types diverge on fields such as `logoUrl`, timestamps, or count names; every API change requires synchronizing multiple sources.
- **Evidence:** R0-02 defines DTOs and response mapping; explicitly creates `tenant-contracts.ts`; R1-01 says the service returns those payloads.
- **Suggested fix:** Remove `tenant-contracts.ts`. Keep R0-02 limited to request DTOs + transition constants. Move response mapping into R1-01 service layer as a single canonical mapping derived from the design.md contract.
- **Disposition:** Accept
- **Rationale:** A single-feature contract registry is premature abstraction with no demonstrated cross-module consumer.

### Finding 15: List pagination unstable under ties/inserts
- **Severity:** High
- **Location:** Task R1-01, section "Steps", step 2
- **Flaw:** Ordering only by `createdAt DESC` does not provide stable pagination when timestamps tie or rows are inserted between requests.
- **Failure scenario:** Tenants sharing the same `createdAt` move between pages across requests, causing duplicates or omissions. New tenant inserted at the front shifts every later offset page.
- **Evidence:** "order by `createdAt` desc"; "preserve stable sort order"; no unique tie-breaker.
- **Suggested fix:** Order by `createdAt DESC, id DESC`; prefer cursor pagination in design.md. Define consistency expectations for concurrent inserts.
- **Disposition:** Accept
- **Rationale:** The implementation instruction contradicts its stable-order requirement.

## Folded Medium findings (applied via related Critical/High fixes)

- **Soft-delete race during mutation** → Applied via #1, #7: mutation `WHERE` must include `deletedAt IS NULL`; return 404 on zero rows.
- **Export audit atomicity / client disconnect** → Applied via #2: audit row committed before response body is sent; partial delivery is still audited as a successful export.
- **Unbounded `q` DoS** → Applied as Medium addition to R0-02/R1-01: `q.maxLength(100)`, trim/normalize, indexed `contains` mode; no leading wildcard.
- **Audit metadata injection (`reason`, UA, IP)** → Applied as Medium addition to R1-02/R1-03: `reason.maxLength(500)`, strip CRLF, UA maxLength, structured audit fields only.
- **Error leaks tenant existence via status code** → Applied as Medium addition to R1-01: unauthorized callers receive uniform 404 for object routes (existence protection); authorized-but-missing → 404; authorized-but-soft-deleted → 404.
- **Performance benchmark over-specified** → R3-01 step 4 narrowed: replace local p95 mandate with `EXPLAIN` query-plan inspection verifying `status`/`deletedAt` index usage + one bounded smoke timing run.
- **R3-01 privacy audit scope creep** → R3-01 step 4 narrowed: scan only tenant-feature fixtures and tenant endpoint test logs; no repo-wide remediation.
- **R2-02 claim-refresh scope creep** → Removed "refresh admin permission claims on route entry" from R2-02 risk mitigation; rely on backend denial per design.
- **CSV streaming gold-plating** → R1-03 simplified to bounded buffered implementation only (10k rows max); remove "Stream or buffer" choice.

## Reviewer Roster

| Reviewer | Lens | Findings (pre-dedup) |
|---|---|---|
| Security Adversary | Attacker mindset | 8 |
| Failure Mode Analyst | Murphy's Law | 7 |
| Assumption Destroyer | Skeptic | 8 |
| Scope & Complexity Critic | YAGNI enforcer | 8 |

Total pre-dedup: 31. Post-dedup: 15 Critical/High + 9 folded Medium = 24.
