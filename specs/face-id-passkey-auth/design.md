# Thiết kế: tenant passkey/WebAuthn

Dùng @simplewebauthn/server + @simplewebauthn/browser. Redis giữ challenge one-time TTL 5 phút; PostgreSQL giữ credential; password login là bootstrap/fallback.

## API contract
- GET /auth/passkeys/registration/options — Bearer tenant-access
- POST /auth/passkeys/registration/verify — Bearer tenant-access
- POST /auth/passkeys/authentication/options — identifier tùy chọn
- POST /auth/passkeys/authentication/verify — response + challengeId
- GET /auth/passkeys và DELETE /auth/passkeys/:id — Bearer tenant-access

Challenge value gồm type, challenge, userId, tenantId, familyId (registration), createdAt, expiresAt; verify atomic consume trước cryptographic verification. Credential gồm userId, credentialId unique, publicKey bytes, signCount, transports, deviceType, backedUp, aaguid/label nullable, timestamps, revokedAt.

Registration dùng generateRegistrationOptions với attestation none, platform/passkey, userVerification required, exclude credentials; verify dùng expectedOrigin/RP ID. Authentication dùng generateAuthenticationOptions/verifyAuthenticationResponse, strict user verification và sign counter. Success gọi helper TenantAuthService để tạo family mới.

## State machine
PasswordSession -> RegistrationChallenge -> PasskeyReady
AuthenticationChallenge -> PasskeySession hoặc PasswordFallback
PasskeySession -> Revoked khi logout/revoke/reuse

## Bảo mật và rollback
- Chỉ lưu public key/metadata; biometric matching do OS authenticator.
- Không log assertion/challenge/credential bytes/token.
- WEBAUTHN_RP_ID là host deployment; WEBAUTHN_ORIGIN exact allow-list; localhost chỉ dev.
- Migration additive; WEBAUTHN_ENABLED=false tắt UI/API, password flow không đổi.

| Requirement | Thành phần | Proof |
|---|---|---|
| R1 | PasskeyService, Prisma, Redis | unit/integration |
| R2 | AuthController, TenantAuthService | success/failure/replay |
| R3 | RefreshTokenStore, revoke API | lifecycle |
| R4 | user-auth-api, LoginForm, settings | Vitest/build |
| R5 | config/CORS/docs | negative tests/review |
