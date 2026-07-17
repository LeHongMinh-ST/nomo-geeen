# Sales — Bán hàng

> Module chính, dùng hằng ngày. Phase 1 tối ưu cho bán tại quầy tại nông thôn. Tài liệu này tách ra từ mục 10 của `base_spec.md`.

## Bán nhanh (Quick Sale)

Màn hình một chạm cho nông hộ/cửa hàng nhỏ:

```
Chọn sản phẩm → Nhập SL → Thu tiền → Xong
```

- Không bắt buộc chọn khách (bán vãng lai).
- Không có bước Draft/Confirm — bán xong là hoàn thành, trừ tồn ngay.
- Cho ghi nợ nhanh nếu chọn khách có SĐT.
- Tự áp giá theo bậc số lượng (xem mục 11 trong `base_spec.md`).

## Tìm sản phẩm khi bán — 3 đường

Màn hình Bán nhanh và Tạo đơn đều có ô tìm chung. Khi gõ vào ô, hệ thống tìm song song 3 nguồn, gom kết quả để người bán chọn nhanh nhất:

1. **Theo Sổ tay (bệnh / sâu hại / dịch bệnh)** — gõ tên bệnh hoặc triệu chứng (vd "đạo ôn", "rầy nâu", "tiêu chảy lợn"). Kết quả: danh sách bệnh phù hợp → chạm vào bệnh → chạy tiếp gợi ý thuốc (xem `handbook.md` mục 21).
2. **Theo thuốc / sản phẩm** — gõ tên thuốc, tên hoạt chất, SKU, barcode. Kết quả: danh sách sản phẩm khớp → chạm để thêm vào đơn.
3. **Theo tên khách / SĐT** — gõ tên hoặc một phần SĐT. Kết quả: danh sách khách khớp → chạm để gắn khách vào đơn (hỗ trợ ghi nợ nhanh). Nếu không khớp: hiện nút "+ Tạo khách nhanh" chỉ yêu cầu Tên + SĐT.

Thứ tự hiển thị gợi ý trong dropdown: **Sổ tay (bệnh) > Thuốc > Khách** vì đường Sổ tay là giá trị cốt lõi của NomoGreen. Người bán vẫn dùng phím tắt / tab để chuyển nhanh giữa 3 nhóm.

Ghi chú: khi đã chọn bệnh từ nhóm 1, hệ thống vẫn hiển thị tiếp nhóm 2 và 3 trong cùng dropdown để bổ sung sản phẩm / chọn khách nếu cần.

## Gợi ý thuốc theo bệnh (tích hợp Sổ tay)

Trên màn Bán nhanh và Tạo đơn bán hàng, cạnh ô tìm sản phẩm có lối vào **"Tra bệnh → gợi ý thuốc"** (dữ liệu từ module Sổ tay — xem `handbook.md` mục 21).

```
Chọn/nhập bệnh → Trả lời câu hỏi tư vấn (nếu có) → Xem thuốc gợi ý → Thêm vào đơn
```

- Người bán gõ tên bệnh/sâu hại/dịch bệnh (vd "rầy nâu", "đạo ôn", "dịch tả lợn", "đốm trắng tôm") hoặc chọn từ Sổ tay đã ghim.
- Nếu bệnh đã bật schema hỏi đáp (`handbook.md` 21.7) → hiện các câu hỏi đặc thù (diện tích / số con / diện tích ao / ...) trước khi ra gợi ý.
- Hệ thống trả về danh sách sản phẩm gợi ý (còn hàng ưu tiên lên đầu), kèm hoạt chất và đối tượng nuôi trồng phù hợp; kèm số lượng đề xuất tính từ câu trả lời.
- Nếu thuốc chính hết hàng, chuyển sang fallback (`handbook.md` 21.8): thuốc mapping thủ công → thuốc cùng hoạt chất. Mỗi loại có nhãn rõ.
- Chạm một sản phẩm gợi ý là **thêm thẳng vào đơn** như chọn tay (giá bậc tự áp, trừ tồn khi hoàn tất).
- Chỉ gợi ý, **không tự thêm** — người bán luôn là người quyết định.
- Không bán sản phẩm hết hàng / bị khóa / đã hết hạn (theo Business Rules mục 18 `base_spec.md`).
- Context tư vấn (bệnh + các trường hỏi đáp + SĐT khách) **được lưu trên đơn** sau khi Completed (xem `handbook.md` mục 22).

## Sales Order (đơn có quản lý)

Dùng khi cần đơn công nợ, giao sau, hoặc chỉnh sửa trước khi chốt.

Trạng thái (Simple Mode)

- **Draft**
- **Completed**
- **Cancelled**

Thông tin

- **Customer** — khách hàng (kèm SĐT, tên snapshot).
- **Products** — danh sách sản phẩm + số lượng + đơn giá.
- **Discount** — chiết khấu (% hoặc số tiền).
- **Tax** — thuế (nếu bật).
- **Total** — tổng cộng.
- **Context tư vấn** — bệnh, đối tượng, các trường hỏi đáp theo lĩnh vực (xem `handbook.md` 22.1) — lưu snapshot, không sửa sau khi Completed.

Kho: mặc định kho duy nhất, không cần chọn (Simple Mode).

Khi Completed:

```
Giảm tồn kho
Ghi nhận context tư vấn trên đơn (snapshot)
Ghi Audit Log
```

Ghi chú: trạng thái Confirmed và chọn Warehouse thuộc Advanced Mode.

## Sales Return

Khách trả hàng

↓

Tăng tồn kho

↓

Điều chỉnh công nợ

## Ghi chú cho người dùng nông thôn

- Mọi trường context (bệnh, diện tích, số con...) đều **tùy chọn** — nếu khách vãng lai mua 1 chai thuốc đã biết, có thể bỏ qua hoàn toàn bước tư vấn.
- Bàn phím số hiển thị riêng cho trường số; nút to, chữ to, một câu một màn hình trên Bán nhanh.
- Giá trị mặc định theo vùng miền (vd "1 sào" cho lúa miền Bắc) để người bán chỉ cần sửa nhanh.
