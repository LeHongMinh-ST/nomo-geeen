#: NomoGreen Retail Platform

> Business Logic - Phase 1 (MVP)

Version: 1.0

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
- AI
- Marketplace
- Accounting
- CRM Automation

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
- Purchase Amount
- Inventory Value
- Outstanding Receivable
- Outstanding Payable

Biểu đồ

- Revenue
- Purchase
- Best Seller

Cảnh báo

- Low Stock
- Out Of Stock
- Near Expired

---

# 5. Product Management

Quản lý

- Product
- Category
- Brand
- Unit
- Manufacturer

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
- Crop
- Pest
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

Lịch sử

- Orders
- Payments
- Debt

---

# 7. Supplier

Thông tin

- Supplier Code
- Name
- Phone
- Address

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

Advanced Mode (ngoài Phase 1): Multi-Warehouse + Transfer (chuyển kho) + kiểm kê theo từng kho.

---

# 10. Sales

Đây là module chính, dùng hằng ngày. Phase 1 tối ưu cho bán tại quầy.

## Bán nhanh (Quick Sale)

Màn hình một chạm cho nông hộ/cửa hàng nhỏ:

```
Chọn sản phẩm → Nhập SL → Thu tiền → Xong
```

- Không bắt buộc chọn khách (bán vãng lai).
- Không có bước Draft/Confirm — bán xong là hoàn thành, trừ tồn ngay.
- Cho ghi nợ nhanh nếu chọn khách có SĐT.
- Tự áp giá theo bậc số lượng (xem mục 11).

## Sales Order (đơn có quản lý)

Dùng khi cần đơn công nợ, giao sau, hoặc chỉnh sửa trước khi chốt.

Trạng thái (Simple Mode)

- Draft
- Completed
- Cancelled

Thông tin

- Customer
- Products
- Discount
- Tax (nếu bật)
- Total

Kho: mặc định kho duy nhất, không cần chọn (Simple Mode).

Khi Completed

↓

Giảm tồn kho

Ghi chú: trạng thái Confirmed và chọn Warehouse thuộc Advanced Mode.

---

## Sales Return

Khách trả hàng

↓

Tăng tồn kho

↓

Điều chỉnh công nợ

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

Thanh toán

- Cash
- Bank Transfer
- QR

Hỗ trợ thanh toán nhiều lần.

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
