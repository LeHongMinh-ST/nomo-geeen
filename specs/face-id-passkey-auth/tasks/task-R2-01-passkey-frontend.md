# Task R2-01: UI PWA passkey
**Requirement:** R4
**Status:** pending
**Priority:** P0
**Dependencies:** tasks/task-R1-01-passkey-backend.md
**Spec:** specs/face-id-passkey-auth/

## Context
Login form hiện chỉ password; settings là điểm bật passkey sau login.

## Constraints
- MUST dùng thư viện WebAuthn chuẩn, không tự chế cryptography.
- MUST giữ tenant boundary, refresh HttpOnly và memory-only access token.
- MUST không lưu biometric data/private key; theo DESIGN.md nếu có UI.

## Steps
- Implement đúng contract và test negative paths.
- Kiểm tra reachability từ runtime entrypoint đến persistence/browser.
- Ghi evidence thật, không giảm assertion.

## Requirements
R4

## Related Files
| Path | Action | Description |
|---|---|---|
| frontend/lib/user-auth-api.ts | Modify | API client |
| frontend/lib/passkey.ts | Create | Browser WebAuthn flow |
| frontend/components/auth/login-form.tsx | Modify | Login CTA |
| frontend/components/auth/passkey-button.tsx | Create | Accessible action |
| frontend/app/(app)/thiet-lap/page.tsx | Modify | Enable/revoke UI |
| frontend/components/auth/login-form.test.tsx | Create | UI tests |

## Completion Criteria
- Unsupported browser vẫn password login được.
- Browser API không persist secret.
- Nút/loading/error đạt 48px, tiếng Việt, route reachable.

## Evidence
- pnpm --dir frontend exec vitest run lib/passkey.test.ts — PASS, 1 file / 3 tests.
- pnpm --dir frontend exec biome lint lib/passkey.ts lib/passkey.test.ts components/auth/passkey-settings.tsx components/auth/login-form.tsx stores/user-auth-store.ts lib/user-auth-api.ts — PASS, không warning mới.
- pnpm --dir frontend build — PASS, TypeScript PASS, 45/45 routes generated.
- Runtime reachability verification: entrypoint → auth/UI boundary → service/API → persistence/session.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Gọi WebAuthn ngoài user gesture | High | Boundary tests, strict configuration, review |
