# Yêu cầu: đăng nhập PWA bằng passkey

## R1 — Đăng ký credential
- R1.1 Khi user đã đăng nhập mật khẩu và có tenant JWT hợp lệ, server cấp registration options với challenge ngẫu nhiên, TTL ≤5 phút, user/tenant/session binding, RP ID và origin cấu hình.
- R1.2 Verify thành công lưu credentialId, publicKey, signCount, transports và metadata thiết bị; không lưu private key, ảnh hoặc template.
- R1.3 Challenge hết hạn/đã dùng/sai binding/origin hoặc credential trùng phải bị từ chối.

## R2 — Đăng nhập passkey
- R2.1 Server cấp authentication options one-time, TTL ≤5 phút, allowCredentials theo identifier nếu có.
- R2.2 Assertion hợp lệ đúng challenge, origin, RP ID, user verification phải cập nhật signCount và cấp access memory-only + refresh HttpOnly family mới.
- R2.3 Sai chữ ký/challenge/origin/RP ID/replay/signCount phải 401, không cấp session và có audit.

## R3 — Session và revoke
- R3.1 Passkey login dùng refresh rotation/TTL/Redis family hiện có, không token bền vững browser.
- R3.2 Logout blacklist access và revoke family; credential vẫn dùng được cho lần sau.
- R3.3 User được list/revoke credential của chính mình, tenant-isolated.

## R4 — Frontend PWA
- R4.1 Sau password login có nút “Bật đăng nhập bằng Face ID”; WebAuthn chạy trong click gesture.
- R4.2 /dang-nhap có nút passkey, feature detection và fallback password.
- R4.3 UI tiếng Việt, mobile-first, touch target ≥48px; không lưu secret vào local/sessionStorage.

## R5 — Vận hành và bảo mật
- R5.1 Thiếu WEBAUTHN_RP_ID/WEBAUTHN_ORIGIN, hoặc Redis challenge unavailable, phải fail closed.
- R5.2 CORS/cookie/origin hỗ trợ HTTPS; chỉ tuyên bố iOS standalone/Android Chrome khi có proof.
- R5.3 Tests bao phủ challenge one-time/TTL/binding, success/failure, replay/sign counter, logout/revoke và reachability.
