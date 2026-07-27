# Production checklist

Checklist bắt buộc trước khi mở rộng người dùng. Cập nhật trạng thái bằng bằng chứng triển khai, không chỉ bằng cấu hình mẫu.

## Đã được ràng buộc trong source

- [x] Runtime production dùng Node.js 22.x trong `backend/Dockerfile` và `frontend/Dockerfile`; package engines cũng khóa Node 22.
- [x] Cookie production không được chạy với `AUTH_COOKIE_SECURE=false`.
- [x] JWT access và refresh dùng hai secret riêng; production compose bắt buộc truyền secret qua biến môi trường.
- [x] CORS production bắt buộc `CORS_ORIGIN`; không dùng fallback localhost khi chạy compose production.
- [x] Redis bật AOF persistence trong `docker-compose.prod.yml`.
- [x] PostgreSQL và Redis có volume riêng, healthcheck và restart policy.
- [x] Migration chạy bằng service `migrate` trước backend.

## Bắt buộc xác nhận khi triển khai

- [ ] HTTPS kết thúc tại reverse proxy/load balancer; chỉ cho phép HTTP redirect sang HTTPS.
- [ ] Cookie refresh có `Secure`, `HttpOnly`, `SameSite` phù hợp domain frontend/backend.
- [ ] `CORS_ORIGIN` là đúng domain frontend production, không dùng `*` hoặc domain preview.
- [ ] JWT secrets là giá trị ngẫu nhiên riêng cho môi trường production, không dùng giá trị trong file `.env*.example`.
- [ ] PostgreSQL backup định kỳ có retention, mã hóa, cảnh báo thất bại và một lần restore thử nghiệm đã ghi nhận.
- [ ] Redis persistence/volume được kiểm tra sau restart; xác nhận mất Redis không làm lộ hoặc dùng lại session đã thu hồi.
- [ ] Monitoring và error tracking nhận được lỗi backend/frontend, latency, saturation và database/Redis health.
- [ ] Có endpoint health/readiness riêng; readiness phải kiểm tra dependency cần cho request trước khi nhận traffic.
- [ ] Có rollback procedure: giữ image/commit trước, backup trước migration, migrate deploy, smoke test, rollback image hoặc restore backup khi cần.

## Release gate

Chỉ phát hành khi E2E bắt buộc, build, migration deploy trên staging, backup/restore drill và kiểm tra checklist đều có receipt trong release record.
