# Task R3-01: Acceptance và reachability
**Requirement:** R1, R2, R3, R4, R5
**Status:** pending
**Priority:** P0
**Dependencies:** tasks/task-R1-01-passkey-backend.md, tasks/task-R2-01-passkey-frontend.md
**Spec:** specs/face-id-passkey-auth/

## Context
Feature chạm database, Redis, browser WebAuthn và session; cần receipt hợp nhất.

## Constraints
- MUST dùng thư viện WebAuthn chuẩn, không tự chế cryptography.
- MUST giữ tenant boundary, refresh HttpOnly và memory-only access token.
- MUST không lưu biometric data/private key; theo DESIGN.md nếu có UI.

## Steps
- Implement đúng contract và test negative paths.
- Kiểm tra reachability từ runtime entrypoint đến persistence/browser.
- Ghi evidence thật, không giảm assertion.

## Requirements
R1, R2, R3, R4, R5

## Related Files
| Path | Action | Description |
|---|---|---|
| docs/system-architecture.md | Modify | Architecture |
| docs/project-changelog.md | Modify | Verified change |
| docs/.sync_hash | Modify | Current source hash |
| specs/face-id-passkey-auth/reports/verification-receipt.md | Create | Receipt |

## Completion Criteria
- Checks pass hoặc blocker được ghi rõ.
- Docs chỉ mô tả behavior đã verify và support limits.
- git diff --check pass, không đổi file unrelated.

## Evidence
- git diff --check — PASS.
- Backend/frontend commands có output thật.
- Runtime reachability verification: auth routes mounted và frontend routes compiled.
- Runtime reachability verification: entrypoint → auth/UI boundary → service/API → persistence/session.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Claim support vượt proof | High | Boundary tests, strict configuration, review |
