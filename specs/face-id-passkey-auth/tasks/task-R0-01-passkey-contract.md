# Task R0-01: Contract và migration passkey
**Requirement:** R1, R3, R5
**Status:** pending
**Priority:** P0
**Dependencies:** none
**Spec:** specs/face-id-passkey-auth/

## Context
Tenant User có refresh-family auth nhưng chưa có WebAuthn persistence/challenge contract.

## Constraints
- MUST dùng thư viện WebAuthn chuẩn, không tự chế cryptography.
- MUST giữ tenant boundary, refresh HttpOnly và memory-only access token.
- MUST không lưu biometric data/private key; theo DESIGN.md nếu có UI.

## Steps
- Implement đúng contract và test negative paths.
- Kiểm tra reachability từ runtime entrypoint đến persistence/browser.
- Ghi evidence thật, không giảm assertion.

## Requirements
R1, R3, R5

## Related Files
| Path | Action | Description |
|---|---|---|
| backend/package.json | Modify | WebAuthn server dependency |
| frontend/package.json | Modify | WebAuthn browser dependency |
| backend/prisma/schema.prisma | Modify | Credential model |
| backend/prisma/migrations/ | Create | Additive migration |
| backend/.env.example | Modify | RP/origin/feature env |
| backend/src/platform/auth/ | Read | Existing auth contracts |

## Completion Criteria
- Schema có user FK, public key bytes, sign counter, revoke metadata.
- Env thiếu RP ID/origin fail closed khi feature bật.
- Lockfile cập nhật đúng package.

## Evidence
- pnpm --dir backend exec prisma generate — PASS.
- pnpm --dir backend test -- --runInBand src/platform/auth — PASS.
- Runtime reachability verification: entrypoint → auth/UI boundary → service/API → persistence/session.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Migration sai schema | High | Boundary tests, strict configuration, review |
