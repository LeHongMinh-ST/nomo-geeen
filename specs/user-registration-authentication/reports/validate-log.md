# Validation Log — Session 1 — 2026-07-19

**Trigger:** Security-critical spec with auth/session, Redis, permissions, browser cookies, and 9 task files.
**Questions asked:** 0 interactive; decisions were resolved from repository evidence, the user's explicit scope, and the accepted red-team fixes.

## Confirmed Decisions

- **Creation mode:** Full pipeline to Tasks + Red Team/Validate, because the user confirmed creation of the new spec and requested the complete implementation plan.
- **Registration boundary:** Public registration creates Tenant + first OWNER through the provisioning-owned transaction contract; no duplicate role-seeding implementation in auth.
- **Session transport:** User realm uses `nomo_user_rt` and separate `user:*` Redis keys; access tokens remain memory-only in the frontend.
- **Shared refresh endpoint:** Realm is selected only from distinct cookie names; ambiguous/missing realm cookies are rejected.
- **Cross-origin cookie safety:** Allowed Origin validation is required for cookie-authenticated refresh/logout paths.
- **Audit scope:** `AuditInput.tenantId` is optional for backward compatibility and persisted for tenant auth rows.
- **Abuse control:** Public registration and failed login share bounded Redis throttle rules.
- **Forced password change:** Enforced centrally for tenant business routes with an explicit session-maintenance allowlist.

## Action Items

- [x] Propagate red-team findings into requirements, design, task steps, task mappings, and related files.
- [x] Correct the final user app entrypoint from `(user)` to the existing `(app)` route group.
- [x] Re-run structural validator and grounding checks after propagation.
- [ ] Implementation must later update `docs/architecture.md`, `docs/project-changelog.md`, and `docs/.sync_hash` after source verification.

## Impact on Tasks

- `task-R0-01`: owns shared tenant audit scope, Origin validation, realm-disambiguation, and user namespace foundation.
- `task-R1-01`: applies registration throttle and provisioning contract.
- `task-R3-01`: applies refresh realm selection and cookie lifecycle.
- `task-R4-01`: applies centralized must-change enforcement.
- `task-R7-01`: verifies the real `frontend/app/(app)/layout.tsx` runtime entrypoint.

## Reconciliation Result

- Accepted findings are physically propagated to implementation-facing artifacts.
- No provider drift, privacy-policy contradiction, or phantom Related Files path remains after grounding.
- Final verdict is blocked until the deterministic validator and grounding commands both pass and `spec.json` state is updated.
