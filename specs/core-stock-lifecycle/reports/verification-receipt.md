# Verification Receipt — Core Stock Lifecycle

Checkpoint: 2026-07-23

## Đã hoàn thành trong phiên

- Spec `core-stock-lifecycle` đã được tạo, validate và grounding PASS.
- `PurchasesService` đã bắt đầu ghi `ProductBatch`, tăng `qtyOnHand`, gắn `PurchaseLine.batchId` và `StockMovement.batchId` khi nhận hàng sản phẩm có kiểm soát batch.
- Đã tạo allocator FEFO dùng chung và nối vào quick sale/order completion.
- Backend build PASS.
- Focused purchase/sales tests PASS: 2 suites, 69 tests.

## Tạm dừng tại đây

- Chưa hoàn tất focused tests riêng cho batch receiving và FEFO nhiều batch.
- Chưa hoàn thiện kiểm tra inbound expiry/recall theo policy từng `ProductKind`.
- Chưa chạy migration trên PostgreSQL thật vì database local chưa khả dụng.
- Chưa đánh dấu task `R0-01` hoàn tất; trạng thái vẫn `in_progress`.

## Việc cần làm phiên sau

1. Bổ sung test tạo/reuse batch, batch bắt buộc và tenant isolation.
2. Bổ sung test FEFO: hạn gần trước, loại batch hết hạn/thu hồi, thiếu tồn phải rollback.
3. Chạy build/test/Prisma validate lại, sau đó mới sync `R0-01` và tiếp tục `R1-01`.
