#: NomoGreen Retail Platform

> Business Logic - Phase 1 (MVP)

Version: 1.2

> Đối chiếu với tài liệu nghiệp vụ của BA (`NomoGreen.md`). Phase 1 giữ nguyên tắc **Simple First**: chỉ nạp các nghiệp vụ đơn giản, khả thi ngay; các hạng mục lớn (AI thật, CRM tự động, tích hợp dữ liệu ngoài) được ghi nhận ở mục 20 để làm sau.

---

# 1. Product Vision

NomoGreen Retail Platform là nền tảng SaaS quản lý bán hàng chuyên biệt cho ngành vật tư nông nghiệp.

Đối tượng khách hàng (Phase 1 ưu tiên nhóm nhỏ lẻ):

- Nông hộ buôn bán vật tư nông nghiệp
- Cửa hàng / đại lý nhỏ lẻ thuốc bảo vệ thực vật
- Đại lý nhỏ lẻ phân bón
- Đại lý nhỏ lẻ thuốc thú y
- Đại lý nhỏ lẻ thức ăn chăn nuôi
- Đại lý nhỏ lẻ giống cây trồng
- Hợp tác xã (dùng ở chế độ mở rộng)

Mục tiêu:

- Quản lý bán hàng
- Quản lý kho (đơn giản, 1 kho)
- Quản lý nhập hàng
- Quản lý công nợ
- Quản lý khách hàng
- Báo cáo kinh doanh

## Nguyên tắc thiết kế Phase 1: Simple First

Đối tượng chính là nông hộ và cửa hàng nhỏ, thường **một người vừa bán vừa quản kho vừa thu tiền**. Vì vậy Phase 1 mặc định chạy ở **Simple Mode**:

- Một kho duy nhất, không chuyển kho.
- Vai trò tối giản (Owner + Staff).
- Nhập hàng một bước, không quy trình duyệt nhiều cấp.
- Có màn hình "Bán nhanh" để bán được ngay.

Các nghiệp vụ nâng cao (đa kho, chuyển kho, RBAC chi tiết, quy trình duyệt) được đóng gói vào **Advanced Mode** và chỉ bật khi Tenant thực sự cần (xem 3.2, 3.9). Chúng **không nằm trong Phase 1**.

Không bao gồm trong Phase 1

- Đa kho / Chuyển kho (Advanced Mode)
- RBAC nhiều vai trò (Advanced Mode)
- Quy trình mua hàng nhiều bước duyệt (Advanced Mode)
- POS đầy đủ
- Mobile App
- AI (gợi ý bằng AI/ảnh chụp — Sổ tay Phase 1 dùng rule-based, xem 21)
- Tích hợp dữ liệu ngoài (thông báo Bộ NN&MT: cảnh báo dịch bệnh khu vực, thời tiết — xem 20)
- Marketplace
- Accounting
- CRM Automation (tích điểm, phân nhóm VIP, chăm sóc tự động — xem 20)

---

# 2. System Architecture

NomoGreen Platform

```
SaaS Platform
│
├── Tenant Management
├── Subscription
├── Authentication
├── Authorization
├── Feature Management
├── Billing
├── Notification
├── Audit Log
├── File Storage
├── System Settings
│
└── Retail Modules
      ├── Dashboard
      ├── Product
      ├── Purchase (1 bước)
      ├── Inventory (1 kho)
      ├── Sales (+ Bán nhanh)
      ├── Customer
      ├── Supplier
      ├── Debt
      ├── Handbook (Sổ tay: bệnh → thuốc gợi ý)
      ├── Reports
      └── Settings
```

Ghi chú Phase 1: các module chạy ở Simple Mode. Đa kho, chuyển kho, quy trình mua hàng nhiều bước và RBAC nâng cao chỉ khả dụng ở Advanced Mode và không thuộc phạm vi Phase 1.

---

# 3. SaaS Platform

## 3.1 Tenant Management

Một khách hàng đăng ký sẽ tạo ra một Tenant.

Ví dụ

```
Đại lý Minh Tâm

↓

Tenant #1001
```

Mỗi Tenant có:

- Dữ liệu riêng
- Người dùng riêng
- Kho riêng (Phase 1: mặc định 1 kho)
- Khách hàng riêng
- Nhà cung cấp riêng
- Cấu hình riêng
- Logo riêng

Không Tenant nào được truy cập dữ liệu Tenant khác.

---

## 3.2 Tenant Type

Hệ thống hỗ trợ nhiều loại khách hàng.

- Household — nông hộ (mặc định Simple Mode)
- Retail Dealer — cửa hàng / đại lý nhỏ lẻ (mặc định Simple Mode)
- Cooperative — hợp tác xã (Advanced Mode)
- Distributor — nhà phân phối (Advanced Mode, ngoài Phase 1)
- Farm — trang trại (Advanced Mode, ngoài Phase 1)

Mỗi Tenant Type gắn với một **Mode** quyết định preset bật/tắt module:

| Mode | Kho | Vai trò | Nhập hàng | Bán hàng |
|---|---|---|---|---|
| Simple (Phase 1) | 1 kho, không chuyển kho | Owner + Staff | 1 bước | Bán nhanh + Sales Order rút gọn |
| Advanced (sau) | Đa kho + chuyển kho | RBAC đầy đủ | Nhiều bước duyệt | Sales Order đầy đủ |

Phase 1 chỉ triển khai Simple Mode. Việc bật Advanced Mode dùng Feature Flag (3.9) và không thuộc phạm vi Phase 1.

---

## 3.3 Workspace

Mỗi Tenant có Workspace riêng.

Ví dụ

```
https://app.argonext.vn/minhtam
```

Hoặc

```
https://minhtam.argonext.vn
```

---

## 3.4 Subscription

Quản lý gói dịch vụ.

Ví dụ

Starter

Professional

Enterprise

Mỗi gói giới hạn

- User
- Warehouse
- Storage
- Feature

---

## 3.5 Trial

Cho phép dùng thử.

- 7 ngày
- 15 ngày
- 30 ngày

Hết thời gian sẽ:

- Gia hạn
- Hoặc khóa Tenant

---

## 3.6 Billing

Quản lý

- Gói dịch vụ
- Chu kỳ thanh toán
- Gia hạn
- Lịch sử thanh toán

Không phải kế toán.

---

## 3.7 Authentication

Đăng nhập bằng

- Email
- Phone

Sau này hỗ trợ

- Google
- Apple

---

## 3.8 Authorization

Phase 1 (Simple Mode) dùng vai trò tối giản, phù hợp cửa hàng 1–3 người:

- **Owner** — chủ cửa hàng, toàn quyền.
- **Staff** — nhân viên bán hàng, được bán hàng, nhập hàng, xem khách/công nợ; không được sửa cấu hình, không xóa chứng từ đã hoàn thành, không xem báo cáo lợi nhuận (tùy chọn Owner mở).

Advanced Mode (ngoài Phase 1) mở rộng thành RBAC đầy đủ:

Role

- Owner
- Manager
- Warehouse
- Sales
- Cashier
- Viewer

Permission

- View
- Create
- Edit
- Delete
- Approve
- Export

---

## 3.9 Feature Flag

Mỗi Tenant có thể bật/tắt Module.

Ví dụ

```
Inventory

ON

Debt

OFF

Batch

OFF
```

Không cần deploy lại hệ thống.

---

## 3.10 File Storage

Upload

- Logo
- Product Image
- Attachment

---

## 3.11 Notification

Thông báo

- Công nợ đến hạn
- Hàng sắp hết
- Hàng sắp hết hạn

---

## 3.12 Audit Log

Theo dõi

- Login
- Logout
- Create
- Update
- Delete
- Approval

---

# 4. Dashboard

Hiển thị

- Revenue Today
- Revenue This Month
- Gross Profit (lợi nhuận)
- Orders Today (đơn hàng hôm nay)
- New Customers (khách hàng mới)
- Pending Orders (đơn chờ xử lý)
- Purchase Amount
- Inventory Value
- Outstanding Receivable
- Outstanding Payable

Biểu đồ

- Revenue
- Purchase
- Best Seller
- Top Customer
- Top Supplier

Cảnh báo

- Low Stock
- Out Of Stock
- Near Expired
- Recall (thuốc sắp/bị thu hồi)

---

# 5. Product Management

Quản lý

- Product
- Category
- Brand
- Unit
- Manufacturer

Nhóm sản phẩm (phủ đủ 3 lĩnh vực — Trồng trọt / Chăn nuôi / Thủy sản)

- Trồng trọt: Giống cây trồng, Thuốc bảo vệ thực vật, Phân bón / Vật tư nông nghiệp
- Chăn nuôi: Con giống, Thuốc thú y, Thức ăn chăn nuôi
- Thủy sản: Giống thủy sản, Thuốc thủy sản, Thức ăn thủy sản

Tùy Tenant chỉ kinh doanh một hoặc nhiều lĩnh vực; danh mục nhóm cấu hình được theo lĩnh vực đang bật.

Thông tin

- SKU
- Barcode
- Name
- Unit
- Brand
- Supplier
- Cost Price
- Sale Price
- Wholesale Price

Thông tin chuyên ngành

- Active Ingredient
- Concentration
- Đối tượng áp dụng (Cây trồng / Vật nuôi / Thủy sản)
- Pest / Bệnh (sâu bệnh cây trồng, dịch bệnh vật nuôi, bệnh thủy sản)
- PHI
- REI

## 5.1 Đơn vị quy đổi (Unit Conversion)

Rất phổ biến trong ngành: nhập theo đơn vị lớn, bán lẻ theo đơn vị nhỏ.

Ví dụ

```
1 Thùng = 12 Chai
1 Bao   = 50 Kg
```

Mỗi sản phẩm có:

- **Base Unit** — đơn vị tồn kho gốc (Chai, Kg, Gói).
- **Purchase Unit** — đơn vị nhập (Thùng, Bao) + hệ số quy đổi ra Base Unit.
- **Sale Unit** — đơn vị bán (mặc định Base Unit, có thể bán theo đơn vị lớn).

Tồn kho luôn lưu theo Base Unit. Khi nhập/bán theo đơn vị khác, hệ thống tự quy đổi.

---

# 6. Customer

Loại

- Retail Customer
- Farmer
- Farm
- Agent

Thông tin

- Name
- Phone (dùng làm định danh chính — nông dân thường không có mã KH)
- Address

Ghi chú: khách vãng lai có thể bán không cần tạo hồ sơ; khi cần ghi nợ mới yêu cầu tối thiểu Tên + SĐT.

Hồ sơ sản xuất (tùy chọn, phục vụ tư vấn tại quầy)

- Trồng trọt: loại cây trồng, giống, diện tích canh tác, mùa vụ.
- Chăn nuôi: loại vật nuôi, giống, quy mô đàn.
- Thủy sản: loại thủy sản, giống, diện tích ao nuôi.

Một khách có thể khai nhiều lĩnh vực. Hồ sơ này giúp Sổ tay (mục 21) gợi ý sát hơn ở lần mua sau.

Lịch sử

- Orders
- Payments
- Debt
- Lịch sử tư vấn (đối tượng, bệnh, sản phẩm đã tư vấn — liên kết Sổ tay)

---

# 7. Supplier

Thông tin

- Supplier Code
- Name
- Supplier Type (nhà sản xuất / nhà phân phối / đại lý cấp trên...)
- Người liên hệ + chức vụ
- Phone
- Address
- Tax Code (mã số thuế — nếu có)

Chính sách hợp tác (tùy chọn)

- Chiết khấu (%)
- Hạn mức công nợ
- Thời hạn / hình thức thanh toán

Lịch sử

- Purchase
- Outstanding Payable

---

# 8. Purchase

Phase 1 (Simple Mode): nhập hàng **một bước**. Chủ cửa hàng chọn NCC, thêm sản phẩm, lưu là tồn kho tăng ngay.

Quy trình

```
Nhập hàng (Draft) → Hoàn thành
```

- Lưu nháp (Draft) để nhập dở, hoàn thành thì cộng tồn.
- Không có bước Confirmed / Receiving riêng (đó là Advanced Mode).

Chức năng

- Phiếu nhập hàng (Goods Receipt)
- Trả hàng nhà cung cấp (Purchase Return)

Cho phép

- Nhập theo đơn vị lớn (tự quy đổi ra Base Unit — xem 5.1)
- Batch
- Expiration Date
- Chiết khấu, VAT, chi phí vận chuyển trên phiếu (nếu bật Tax — xem 15)
- Ghi công nợ NCC nếu chưa trả đủ

Advanced Mode (ngoài Phase 1) mở rộng quy trình:

```
Draft → Confirmed → Receiving → Completed
```

kèm Purchase Order và nhập nhiều lần trên một đơn.

---

# 9. Inventory

Phase 1 (Simple Mode): **một kho duy nhất**, không chuyển kho.

Quản lý

- Stock (tồn theo Base Unit)
- Batch
- Expiration

Nghiệp vụ

- Stock In (từ nhập hàng / trả hàng bán)
- Stock Out (từ bán hàng / trả hàng NCC)
- Adjustment (điều chỉnh khi lệch thực tế)

Kiểm kê

- Chỉnh số lượng thực tế trực tiếp theo sản phẩm; chênh lệch ghi vào Adjustment + Audit Log.

Cảnh báo

- Sắp hết / hết hàng
- Sắp hết hạn / đã hết hạn
- Recall — đánh dấu lô/sản phẩm bị thu hồi để chặn bán (Business Rules mục 18).

Advanced Mode (ngoài Phase 1): Multi-Warehouse + Transfer (chuyển kho) + kiểm kê theo từng kho.

---

# 10. Sales

> Nội dung đã tách sang `docs/sales.md`. Tham khảo `sales.md` để biết: Bán nhanh, 3 đường tìm sản phẩm (Sổ tay / Thuốc / Khách), Gợi ý thuốc theo bệnh, Sales Order, Sales Return.

---

# 11. Pricing

Hỗ trợ

- Retail Price (giá lẻ)
- Wholesale Price (giá sỉ)
- Custom Price (giá thỏa thuận theo khách)

Giá theo bậc số lượng (tùy chọn từng sản phẩm)

```
1 – 9 chai   : giá lẻ
10 – 49 chai : giá sỉ
≥ 50 chai    : giá thùng
```

Khi bán, hệ thống tự chọn bậc giá theo số lượng; người bán vẫn được sửa tay.

Chiết khấu

- %
- Amount

Thứ tự ưu tiên áp giá: Custom Price (theo khách) → Giá theo bậc số lượng → Retail Price.

---

# 12. Debt Management

Không phải kế toán.

Theo dõi

Khách hàng

- Opening Balance
- Sales
- Payment
- Outstanding

Nhà cung cấp

- Purchase
- Payment
- Outstanding

Chứng từ thu/chi

- Phiếu thu (thu tiền khách trả nợ)
- Phiếu chi (chi tiền trả nợ NCC)
- Mỗi lần thu/chi ghi vào lịch sử thanh toán và giảm công nợ tương ứng.

Thanh toán

- Cash
- Bank Transfer
- QR / Ví điện tử

Hỗ trợ thanh toán nhiều lần. Xuất/in sổ chi tiết công nợ theo từng khách hàng/NCC.

---

# 13. Reports

Sales Report

Purchase Report

Inventory Report

Debt Report

Customer Report

Supplier Report

Best Selling

Low Stock

Near Expired

Inventory Valuation

Gross Profit

Phương pháp giá vốn (Phase 1)

- Tồn kho định giá theo **giá vốn bình quân gia quyền** (moving average) trên Base Unit — đơn giản, dễ hiểu với chủ cửa hàng.
- Khi bán, giá vốn lấy theo bình quân hiện tại để tính lãi gộp.
- Batch dùng để theo dõi hạn sử dụng và xuất theo FIFO (hàng gần hết hạn bán trước), không dùng để tách giá vốn riêng từng batch ở Phase 1.

---

# 14. Company Settings

Thông tin doanh nghiệp

- Company Name
- Address
- Phone
- Email
- Logo

Cấu hình

- Currency
- Timezone
- Language

---

# 15. System Settings

Cho phép cấu hình

- Tax Enabled
- Debt Enabled
- Batch Enabled
- Barcode Enabled
- Quantity Tier Pricing Enabled (giá theo bậc số lượng)
- Advanced Mode (mở đa kho, chuyển kho, RBAC đầy đủ, quy trình mua hàng nhiều bước — ngoài Phase 1)

---

# 16. Import / Export

Import

- Product
- Customer
- Supplier

Export

- Excel
- CSV
- PDF

---

# 17. Soft Delete

Dữ liệu xóa sẽ vào Trash.

Có thể Restore.

---

# 18. Business Rules

- SKU phải duy nhất.
- Barcode nên duy nhất.
- SĐT là định danh khách hàng khi ghi nợ.
- Tồn kho lưu theo Base Unit; nhập/bán theo đơn vị khác phải quy đổi.
- Không cho phép tồn kho âm.
- Không bán hàng đã hết hạn.
- Không bán lô/sản phẩm bị đánh dấu thu hồi (recall).
- Ưu tiên xuất bán batch gần hết hạn trước (FIFO theo hạn dùng).
- Không bán sản phẩm bị khóa.
- Nhập kho làm tăng tồn.
- Xuất bán làm giảm tồn.
- Trả hàng làm tăng tồn.
- Trả NCC làm giảm tồn.
- Giá vốn tính theo bình quân gia quyền.
- Không xóa chứng từ đã hoàn thành.
- Không sửa chứng từ đã khóa.
- Mỗi chứng từ có số duy nhất.
- Mọi thay đổi đều ghi Audit Log.
- **Fallback thuốc chỉ là gợi ý**, người bán xác nhận trước khi thêm vào đơn — không tự ý thay thuốc chính bằng thuốc thay thế.
- **Context tư vấn trên đơn là snapshot** tại thời điểm bán; đơn đã Completed không được sửa context, kể cả khi schema Sổ tay thay đổi.
- **Trường hỏi đáp của bệnh** lưu theo `{ field_key: value }`: trường bị Owner xóa trong Sổ tay không xóa giá trị đã lưu trên đơn cũ (giữ lại để tra cứu lịch sử).

---

# 19. System Admin Portal

Portal dành cho đơn vị vận hành SaaS.

Quản lý

- Tenant
- Subscription
- Packages
- Features
- Users
- Storage
- Payment
- System Announcement
- Audit
- Support Ticket

Dashboard

- Total Tenant
- Active Tenant
- Expired Tenant
- Monthly Revenue
- New Registration
- System Health

---

# 20. Future Modules

Không nằm trong Phase 1

Advanced Mode (bật sau khi Tenant cần)

- Multi-Warehouse
- Warehouse Transfer (chuyển kho)
- RBAC đầy đủ (Manager / Warehouse / Sales / Cashier / Viewer)
- Quy trình mua hàng nhiều bước (Purchase Order + duyệt)
- Giá vốn theo batch (FIFO tách giá)

Giai đoạn sau

- POS
- Mobile App
- AI Assistant
- Marketplace
- CRM
- Promotion Engine
- Loyalty
- Electronic Invoice
- Accounting
- Public API

Hạng mục lớn từ tài liệu BA (`NomoGreen.md`) — vượt Simple First, làm sau Phase 1

- **Thông báo từ Bộ NN&MT** (dạng news): cảnh báo dịch bệnh khu vực, cảnh báo thời tiết — cần tích hợp nguồn dữ liệu ngoài.
- **AI hỗ trợ tư vấn bán hàng**: gợi ý thuốc/thức ăn/vật tư đi kèm bằng AI, chẩn đoán qua ảnh chụp lá cây (Phase 1 dùng Sổ tay rule-based — xem 21).
- **CRM mở rộng**: điểm tích lũy, nhóm khách VIP/Thân thiết/Mới, nguồn khách hàng, nhân viên phụ trách, nhắc sinh nhật, tần suất mua.
- **Sổ tay nâng cao**: AI / ảnh chụp lá cây (chuyển sang AI Assistant), chia sẻ Sổ tay giữa các cửa hàng, nhắc lịch phun tự động. **Schema hỏi đáp theo lĩnh vực + tính lượng thuốc sơ bộ + fallback thuốc hết hàng + lưu context tư vấn trên đơn ĐÃ CÓ trong Phase 1 — xem mục 21.7, 21.8, 22**.

---

# 21. Handbook & Context tư vấn

> Nội dung đã tách sang `docs/handbook.md`. Tham khảo `handbook.md` để biết: Sổ tay bệnh → thuốc (mục 21), schema hỏi đáp theo lĩnh vực + công thức tính lượng thuốc sơ bộ (21.7), fallback thuốc khi hết hàng theo 2 lớp (21.8), và context tư vấn trên đơn bán (mục 22).
