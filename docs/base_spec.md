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

## Gợi ý thuốc theo bệnh (tích hợp Sổ tay)

Trên màn Bán nhanh và Tạo đơn bán hàng, cạnh ô tìm sản phẩm có lối vào **"Tra bệnh → gợi ý thuốc"** (dữ liệu từ module Sổ tay — mục 21).

```
Chọn/nhập bệnh → Xem thuốc gợi ý → Thêm vào đơn
```

- Người bán gõ tên bệnh/sâu hại/dịch bệnh (vd "rầy nâu", "đạo ôn", "dịch tả lợn", "đốm trắng tôm") hoặc chọn từ Sổ tay đã ghim.
- Hệ thống trả về danh sách sản phẩm gợi ý (còn hàng ưu tiên lên đầu), kèm hoạt chất và đối tượng nuôi trồng phù hợp.
- Chạm một sản phẩm gợi ý là **thêm thẳng vào đơn** như chọn tay (giá bậc tự áp, trừ tồn khi hoàn tất).
- Chỉ gợi ý, **không tự thêm** — người bán luôn là người quyết định.
- Không bán sản phẩm hết hàng / bị khóa / đã hết hạn (theo Business Rules mục 18).


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
- **Sổ tay nâng cao**: liều lượng tự động theo diện tích, lịch phun theo mùa vụ, chia sẻ Sổ tay giữa các cửa hàng.

---

# 21. Handbook — Sổ tay bệnh → thuốc

Module tri thức nghiệp vụ giúp người bán (thường không phải kỹ sư nông học) **tra nhanh: đối tượng nuôi trồng (cây/vật nuôi/thủy sản) đang bị bệnh/dịch gì thì bán thuốc nào**. Đây là điểm khác biệt của NomoGreen so với phần mềm bán hàng thường: biến kinh nghiệm bán vật tư thành dữ liệu tra cứu tại quầy.

## 21.1 Mục tiêu

- Người bán nhập/chọn một **bệnh** (hoặc sâu hại / dịch bệnh) → hệ thống **gợi ý danh sách thuốc** phù hợp đang có trong kho.
- Rút ngắn tư vấn tại quầy: không cần nhớ hoạt chất, chỉ cần biết "lúa bị đạo ôn", "lợn bị dịch tả", "tôm bị đốm trắng" là ra thuốc.
- Tận dụng dữ liệu chuyên ngành đã có ở Product (mục 5): `Active Ingredient`, `Đối tượng áp dụng`, `Pest / Bệnh`.

## 21.2 Thực thể

**Disease (Bệnh / Sâu hại / Dịch bệnh)** — một mục trong Sổ tay:

- Name — tên thường gọi (Đạo ôn, Rầy nâu, Dịch tả lợn, Đốm trắng tôm...).
- Aliases — tên gọi khác / từ khóa tìm (để gõ kiểu gì cũng ra).
- Đối tượng — lĩnh vực & đối tượng liên quan (Trồng trọt: Lúa, Bắp, Rau màu...; Chăn nuôi: Lợn, Gà, Bò...; Thủy sản: Tôm, Cá...).
- Type — Bệnh (nấm/vi khuẩn/virus/ký sinh), Sâu hại (côn trùng), Cỏ dại, hoặc Dịch bệnh vật nuôi/thủy sản.
- Symptom — mô tả triệu chứng ngắn, ngôn ngữ đời thường.
- Recommended Active Ingredients — các hoạt chất khuyến nghị trị bệnh này.
- Note — ghi chú của chủ cửa hàng (liều, thời điểm dùng, kinh nghiệm xử lý).

Sổ tay là dữ liệu **theo tenant** (mỗi cửa hàng tự bồi đắp kinh nghiệm riêng), có seed sẵn bộ bệnh phổ biến cho cả 3 lĩnh vực để dùng được ngay.

## 21.3 Cơ chế gợi ý thuốc (kết hợp Auto + Manual)

Thứ tự ưu tiên khi tra một bệnh:

1. **Ghim thủ công (Manual pin)** — sản phẩm chủ cửa hàng đã gắn trực tiếp cho bệnh này lên đầu. Chính xác theo kinh nghiệm thực tế.
2. **Khớp tự động theo hoạt chất** — sản phẩm có `Active Ingredient` nằm trong danh sách hoạt chất khuyến nghị của bệnh.
3. **Khớp theo tag sâu/bệnh** — sản phẩm có trường `Pest` chứa tên bệnh/alias.

Quy tắc:

- Chủ cửa hàng **ghim** (thêm) hoặc **loại** (ẩn) từng sản phẩm cho mỗi bệnh — đè lên kết quả tự động khi kinh nghiệm khác với match máy.
- Kết quả gợi ý **lọc theo tồn kho**: còn hàng ưu tiên lên đầu; hết hàng / bị khóa / hết hạn không gợi ý bán (Business Rules mục 18).
- Không tự thêm vào đơn — chỉ gợi ý, người bán quyết định.

## 21.4 Tích hợp Bán hàng

- Từ Bán nhanh / Tạo đơn: mở "Tra bệnh → gợi ý thuốc" (mục 10), chọn bệnh, chạm thuốc gợi ý để thêm vào đơn.
- Từ chi tiết một bệnh trong Sổ tay: xem danh sách thuốc gợi ý, thêm thẳng vào đơn đang bán.
- Áp giá bậc số lượng và trừ tồn giống hệt chọn sản phẩm bằng tay (mục 10, 11).

## 21.5 Phân quyền & Feature Flag

- **Owner**: xem, thêm/sửa/xóa bệnh, ghim/loại thuốc gợi ý.
- **Staff**: xem và dùng gợi ý khi bán; không sửa nội dung Sổ tay (trừ khi Owner mở).
- Là module bật/tắt qua Feature Flag (`handbook`) như Inventory/Debt (mục 3.9). Tắt thì ẩn menu và lối vào ở Bán hàng.
- Quyền dạng `resource:action` với resource `handbook` (view/create/edit/delete) — thống nhất RBAC hiện có.

## 21.6 Ngoài phạm vi Phase 1

- Gợi ý bằng AI / ảnh chụp lá cây (để giai đoạn sau — thuộc AI Assistant, mục 20).
- Liều lượng tự động theo diện tích, lịch phun theo mùa vụ.
- Chia sẻ Sổ tay giữa các cửa hàng / kho tri thức tập trung.
