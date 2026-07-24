# Tenant Business Audit Coverage — Research

## Summary
- Feature: tenant-business-audit-coverage
- Discovery Scope: Critical-path cross-module security/compliance integration with Prisma enum migration.
- Key findings: AuditLogger.run/writeInTx already support same-transaction writes; AuditLog already stores tenant/actor/resource/before/after/request metadata; target services use transactions but lack consistent AuditModule wiring; TenantPermissionGuard currently denies without audit.

## Evidence Summary
- Codebase Scout: Required. Exact paths: backend/prisma/schema.prisma; backend/src/platform/audit; products; purchases; sales; stock-adjustments; handbook; auth/guards/tenant-permission.guard.ts. Existing patterns are service-owned transactions, verified request.user identity, AuditLogger.run/writeInTx, and colocated Jest specs.
- External / Current Research: Required. OWASP Logging guidance requires audit of additions/modifications/deletions, when/where/who/what context, sensitive-data masking, access control, and logging-failure tests. NIST audit guidance requires selected auditable events and accountable record content.
- Selected Decision: Add stable actions through additive migration; wire AuditLogger at existing service transaction boundaries; use a recursion-safe denial writer for TenantPermissionGuard.
- Rejected Alternatives: Global interceptor cannot see transaction-local commit/replay state; async queue loses same-transaction guarantee and adds infrastructure.
- Remaining Gaps: Retention, tamper evidence, UI, reports, SIEM, and exact route-label source are out of scope; some service signatures need verified context without client audit fields.
- Downstream Task and Test Implications: Foundation first, then domain wiring, then guard denial, then cross-domain receipt; each path needs success/rollback/isolation/redaction/replay proof.

## Codebase Scout
| Area | Finding | Evidence / Path | Implication |
|---|---|---|---|
| Project | pnpm monorepo, Next.js frontend, NestJS/Prisma backend | README.md; docs/codebase-summary.md | Backend-only scope |
| Logger | run wraps state callback plus audit insert; writeInTx uses caller transaction | backend/src/platform/audit/audit-logger.service.ts | Reuse existing boundary |
| Persistence | AuditAction enum and AuditLog model already exist | backend/prisma/schema.prisma | Additive migration |
| Product | Transactional create/update/remove/group update; no AuditModule import | backend/src/platform/products/products.service.ts; products.module.ts | Wire four mutation categories |
| Purchase | Create/update/complete/cancel, batch, Serializable paths | backend/src/platform/purchases/purchases.service.ts | Audit committed transitions |
| Sales | Order/quick-sale eligibility, FEFO, retry/replay paths | backend/src/platform/sales/sales.service.ts | No duplicate replay events |
| Stock | Draft/complete and reason policy are transactional | backend/src/platform/stock-adjustments/stock-adjustments.service.ts | Add bounded adjustment events |
| Handbook | Tenant-scoped create/update transactions | backend/src/platform/handbook/handbook.service.ts | Add category metadata events |
| Guard | Current DB grants loaded; missing grant throws 403 | backend/src/platform/auth/guards/tenant-permission.guard.ts | Add recursion-safe denial |
| Tests | Colocated Jest specs for every target | backend/src/platform/**/*.spec.ts | Extend focused suites |
| Staleness | docs/development-rules.md missing; remaining code docs match source | docs/codebase-summary.md; docs/code-standards.md | Record gap |

## External / Current Research
| Question | Source | Finding | Decision Impact |
|---|---|---|---|
| Event content/safety | https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html | Record business/security changes with when/where/who/what; mask sensitive data; test failure/access. | Requirements include context, bounds, redaction, failure tests. |
| Application checklist | https://devguide.owasp.org/en/04-design/02-web-app-checklist/09-logging-monitoring/ | Include identity, timestamp, outcome, event description; consider integrity. | Structured events; integrity/retention deferred. |
| Accountability baseline | https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final | Select auditable event types and accountable record content. | Stable action vocabulary is foundation. |

## Architecture Pattern Evaluation
| Option | Strengths | Risks | Decision |
|---|---|---|---|
| Service-owned transactional audit | Existing pattern; same-tx domain state | Explicit wiring | Selected |
| Global interceptor | Broad coverage | No domain commit state; recursion/noise | Rejected |
| Async queue | Decoupled | Loses same-tx guarantee; new infra | Rejected |

## Design Decisions
### Additive action vocabulary
Add stable tenant actions through an additive migration; preserve legacy values/rows. Accepted because the existing query contract consumes AuditAction.

### Transaction-coupled success events
Use run/writeInTx for success and a bounded standalone path only for denial without a mutation. Accepted for atomicity and retry compatibility.

## Risks and Mitigations
- Enum drift — additive migration, Prisma validate, generated-client check.
- Payload leakage — allow-list snapshot mapper and sensitive-key tests.
- Replay duplicates — first-commit-only assertions.
- Guard recursion — denial writer bypasses TenantPermissionGuard.

## References
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OWASP Logging and Monitoring: https://devguide.owasp.org/en/04-design/02-web-app-checklist/09-logging-monitoring/
- NIST SP 800-53 Rev. 5: https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
