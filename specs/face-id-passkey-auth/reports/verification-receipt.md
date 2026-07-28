# Verification receipt — face-id-passkey-auth

Ngày: 2026-07-28

Status: PARTIAL — targeted backend/frontend proof PASS; acceptance tổng thể còn pending theo blockers bên dưới.

## Proof mới nhất

- pnpm --dir backend exec jest --runInBand src/platform/auth/passkey.service.spec.ts — PASS, 1 suite / 7 tests.
- pnpm --dir backend exec jest --runInBand src/platform/auth — PASS, 11 suites / 70 tests.
- pnpm --dir backend build — PASS.
- pnpm --dir frontend exec biome lint lib/passkey.ts lib/passkey.test.ts components/auth/passkey-settings.tsx components/auth/login-form.tsx stores/user-auth-store.ts lib/user-auth-api.ts — PASS, không warning mới.
- pnpm --dir frontend exec vitest run lib/passkey.test.ts — PASS, 1 file / 3 tests.
- pnpm --dir frontend build — PASS, TypeScript PASS, 45/45 routes generated; build worker không lỗi.
- git diff --check — PASS.

## Regression evidence

- Session issuance failure sau CAS được audit với session_issuance_failure và rethrow lỗi gốc.
- Cached registration/authentication options có expiresAt = Date.now() + 290000; click stale clear cache và chỉ hiển thị yêu cầu bấm lại, không fetch rồi gọi WebAuthn cùng handler.
- Sau success/failure cache được clear; prefetch mới chạy qua effect ngoài click.

## Proof trước đó còn hiệu lực

- node .opencode/scripts/validate-spec-output.cjs specs/face-id-passkey-auth — PASS.
- node .opencode/scripts/spec-ground.cjs specs/face-id-passkey-auth --root . — PASS, 16 paths.
- pnpm --dir backend exec prisma generate — PASS.

## Blockers / caveats

- pnpm --dir backend exec prisma migrate dev --create-only --name add_passkey_credentials — BLOCKED P1000 vì Postgres credentials môi trường không hợp lệ; migration additive SQL đã tạo tại backend/prisma/migrations/20260728170000_add_passkey_credentials/.
- pnpm --dir frontend lint — BLOCKED bởi baseline unrelated tại components/app/sales/__tests__/order-list.test.tsx và warnings baseline admin/sales; targeted lint file mới PASS.
- Vitest có informational warning về plugin vite-tsconfig-paths; không phải failure.
- Auth suite có WARN hiện hữu AuthService redis op failed: ECONNREFUSED; suite vẫn PASS.
- Chưa có runtime hardware/browser proof cho iOS standalone PWA hoặc Android Chrome; không tuyên bố support production.
- spec.json và task registry vẫn pending cho code/test/review acceptance; trạng thái này trung thực vì còn blockers.
