# Task R1-01: Backend WebAuthn và session
**Requirement:** R1, R2, R3, R5
**Status:** pending
**Priority:** P0
**Dependencies:** tasks/task-R0-01-passkey-contract.md
**Spec:** specs/face-id-passkey-auth/

## Context
Implement options/verify endpoints cho tenant user, challenge one-time và cấp refresh family mới.

## Constraints
- MUST dùng thư viện WebAuthn chuẩn, không tự chế cryptography.
- MUST giữ tenant boundary, refresh HttpOnly và memory-only access token.
- MUST không lưu biometric data/private key; theo DESIGN.md nếu có UI.

## Steps
- Implement đúng contract và test negative paths.
- Kiểm tra reachability từ runtime entrypoint đến persistence/browser.
- Ghi evidence thật, không giảm assertion.

## Requirements
R1, R2, R3, R5

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/src/platform/auth/auth.controller.ts | Modify | WebAuthn endpoints |
| backend/src/platform/auth/auth.module.ts | Modify | Provider wiring |
| backend/src/platform/auth/tenant-auth.service.ts | Modify | Shared session issuance |
| backend/src/platform/auth/passkey.service.ts | Create | Orchestration |
| backend/src/platform/auth/passkey.service.spec.ts | Create | Security tests |
| backend/src/platform/auth/dto/ | Create | DTOs |
| backend/src/platform/auth/refresh-token.store.ts | Modify | Challenge consume |
| backend/test/tenant-auth.e2e-spec.ts | Modify | Acceptance |

## Completion Criteria
- Registration chỉ thành công sau password session và valid response.
- Authentication success cấp access + HttpOnly refresh family mới.
- Replay/challenge mismatch/sign counter/origin/RP ID/revoke đều reject.
- Logout/revoke không refresh lại được.

## Evidence
- pnpm --dir backend exec jest --runInBand src/platform/auth/passkey.service.spec.ts — PASS, 1 suite / 7 tests.
- pnpm --dir backend exec jest --runInBand src/platform/auth — PASS, 11 suites / 70 tests.
- pnpm --dir backend test:e2e -- --runInBand tenant-auth — PASS.
- pnpm --dir backend build — PASS.
- Runtime reachability verification: entrypoint → auth/UI boundary → service/API → persistence/session.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Assertion replay/cross-user session | High | Boundary tests, strict configuration, review |
