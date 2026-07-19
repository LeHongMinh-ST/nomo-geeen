#: NomoGreen Retail Platform

> Business Logic - Phase 1 (MVP)

Version: 1.9

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
- Vai trò **Owner > Manager > Staff**; số user theo gói (`max_users` + seat Admin cấp thêm).
- Nhập hàng một bước, không quy trình duyệt nhiều cấp.
- **Bán nhanh là luồng chính** — mở app vào quầy; ≤ 3 chạm bán 1 SP tiền mặt (chi tiết `sales.md`).
- Tax / giá bậc / hỏi đáp Sổ tay: **tắt hoặc tùy chọn mặc định**, không chặn bán.

Các nghiệp vụ nâng cao (đa kho, chuyển kho, RBAC chi tiết, quy trình duyệt) được đóng gói vào **Advanced Mode** và chỉ bật khi Tenant thực sự cần (xem 3.2, 3.9). Chúng **không nằm trong Phase 1**.

Không bao gồm trong Phase 1

- Đa kho / Chuyển kho (Advanced Mode)
- RBAC chuyên biệt (Warehouse/Cashier/…) — Advanced Mode; Phase 1 đủ 3 bậc Owner/Manager/Staff
- Quy trình mua hàng nhiều bước duyệt (Advanced Mode)
- POS đầy đủ (in nhiệt / Zalo phiếu mỏng vẫn có ở Bán nhanh)
- Mobile App native (Phase 1 = mobile web)
- Offline bán đầy đủ (PWA sau)
- AI (gợi ý bằng AI/ảnh chụp — Sổ tay Phase 1 rule-based tối giản, xem 21)
- Tích hợp dữ liệu ngoài (thông báo Bộ NN&MT — xem 20)
- Marketplace
- Accounting
- CRM Automation (tích điểm, VIP, chăm sóc tự động — xem 20)
- Sales Order Draft trên quầy (chừa concept; quầy dùng Bán nhanh)

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
      ├── Users (Nhân viên cửa hàng)
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
| Simple (Phase 1) | 1 kho, không chuyển kho | **Owner > Manager > Staff** (3 bậc) | 1 bước | **Bán nhanh** |
| Advanced (sau) | Đa kho + chuyển kho | + Warehouse / Sales / Cashier / Viewer | Nhiều bước duyệt | Sales Order đầy đủ |

Phase 1 triển khai Simple Mode + **3 vai trò cửa hàng**. Số user theo gói (`max_users` / seat). Advanced Mode = đa kho + role chuyên biệt thêm (3.9).

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

## 3.4 Subscription & Packaging

### Phase 1 (hiện tại)

- **Bao quát đủ chức năng Simple Mode trước** — chưa khóa module theo gói khi bán.
- Entity `plan` / `subscription` / `plan_feature` / `tenant_feature_flag` **có sẵn** (xem `database-design.md`).
- Mọi Tenant trial/active Phase 1: cùng bộ Simple Mode (Saler vẫn gán plan placeholder).

### Nguyên tắc chia gói (làm khi product ổn — thiết kế từ đầu)

Chia theo **size cửa hàng**, không theo “số màn hình”. Mỗi gói = **Limits (số)** + **Capabilities (bật/tắt)**.

#### 1) Hai trục độc lập

| Trục | Ý nghĩa | Enforce |
|---|---|---|
| **Limits (quota)** | Bao nhiêu được dùng | `plan.max_*` + đếm runtime (user, storage, SP, đơn/tháng…) |
| **Capabilities (feature)** | Được dùng module/hành vi nào | `plan_feature` + override `tenant_feature_flag` + `FeatureGuard` |

**Không** nhét limit vào feature code (`debt_50_customers`). Limit = số; feature = khả năng.

#### 2) Hạt feature (catalog) — ổn định, không đổi tên lung tung

Đặt `feature.code` **ổn định** (snake_case). UI/menu map vào code, không hard-code gói.

**Core (mọi gói trả phí tối thiểu — hộ nhỏ)**

| code | Ý nghĩa |
|---|---|
| `sales_quick` | Bán nhanh quầy |
| `product_basic` | SP, danh mục, đơn vị, giá lẻ |
| `inventory_single` | 1 kho, tồn, điều chỉnh |
| `purchase_simple` | Nhập 1 bước |
| `customer_basic` | KH + SĐT |
| `supplier_basic` | NCC |
| `report_basic` | BC doanh thu / tồn cơ bản |
| `unit_conversion` | Quy đổi đơn vị (cốt lõi ngành) |

**Add-on theo nhu cầu (upsell)**

| code | Ai cần |
|---|---|
| `debt` | Bán chịu — hầu hết đại lý nhỏ |
| `batch_expiry` | Lô + HSD + chặn hết hạn |
| `recall` | Thu hồi / chặn bán lô |
| `barcode` | Máy quét |
| `handbook` | Sổ tay bệnh → thuốc |
| `handbook_consult` | Hỏi đáp + công thức (1.1) |
| `handbook_fallback` | Fallback thuốc hết hàng |
| `pricing_tier` | Giá bậc SL |
| `pricing_customer` | Giá thỏa thuận theo KH |
| `tax` | VAT trên chứng từ |
| `print_receipt` | In / phiếu Zalo |
| `import_export` | Excel/CSV |
| `multi_user` | >1 user (cặp `max_users`) |
| `roles_manager` | Bậc **Manager** trong tenant (Owner luôn có; Staff luôn có) |
| `sales_return` | Trả hàng |
| `report_profit` | Lãi gộp / giá vốn sâu |
| `report_debt` | Sổ công nợ chi tiết |

**Advanced / size lớn (Enterprise / HTX)**

| code | Ý nghĩa |
|---|---|
| `advanced_mode` | Master flag (hoặc tách nhỏ bên dưới) |
| `multi_warehouse` | Đa kho |
| `warehouse_transfer` | Chuyển kho |
| `purchase_workflow` | PO + duyệt nhiều bước |
| `rbac_full` | Manager / Warehouse / Sales… |
| `sales_order_draft` | Đơn Draft / giao sau |
| `costing_batch_fifo` | Giá vốn theo lô |

Quy tắc: **1 capability = 1 quyết định bán hàng**. Tránh feature “ôm” cả module nếu upsell lẻ được (vd `handbook` tách `handbook_consult`).

#### 3) Limits gợi ý theo size (số chốt sau — chỉ blueprint)

| Limit | Hộ / Starter | Đại lý nhỏ / Pro | HTX·Phân phối / Ent |
|---|---|---|---|
| `max_users` | 1–2 | 3–5 | không giới hạn / cao |
| `max_warehouses` | 1 | 1 | nhiều |
| `max_products` | tùy | cao hơn | cao |
| `max_customers` | tùy | cao hơn | cao |
| `max_orders_per_month` | soft limit (cảnh báo) | cao | cao |
| `max_storage_bytes` | thấp | vừa | cao |

Soft limit (cảnh báo Saler) vs hard limit (chặn tạo) — cấu hình được per limit.

#### 4) Ma trận gói mẫu (size cửa hàng)

| | **Starter** — nông hộ / quầy 1 người | **Professional** — đại lý nhỏ 2–5 người | **Enterprise** — HTX / nhiều điểm |
|---|---|---|---|
| Core quầy + 1 kho + nhập 1 bước | ✓ | ✓ | ✓ |
| `debt` + `batch_expiry` | ✓ (nên gói sẵn) | ✓ | ✓ |
| `handbook` | trial / add-on | ✓ | ✓ |
| `barcode`, `print_receipt` | ✓ | ✓ | ✓ |
| `pricing_tier`, `report_profit` | — / add-on | ✓ | ✓ |
| `handbook_consult` | — | add-on | ✓ |
| Multi-user + 3 vai trò | max 1 (chỉ Owner) | max 3–5 + Manager | cao + role Advanced |
| `roles_manager` (bậc Quản lý) | — / seat≥2 | ✓ | ✓ |
| `advanced_mode` + đa kho + role chuyên biệt | — | — | ✓ |

Saler B2C: bán **Starter/Pro** là chính; Ent + Advanced bật khi khách thật sự cần.

#### 5) Resolve quyền runtime (bắt buộc thiết kế sớm)

```
effective = plan_feature
          ⊕ tenant_feature_flag (override Saler/Admin: tặng / khóa / trial module)
          ⊕ tenant.mode (SIMPLE | ADVANCED) khi liên quan kho/RBAC
```

- API: `FeatureGuard` / `QuotaGuard` trên write path.
- FE: ẩn menu theo effective flags; deep-link capability tắt → màn “Nâng cấp gói”.
- Đổi gói / hết trial: **không xóa dữ liệu**; chỉ khóa write hoặc module (read-only tùy policy).

#### 6) Việc code Phase 1 phải làm (dù chưa bán gói)

1. Mọi module/hành vi upsell được gắn `@RequiresFeature('debt')` (vd) — **không** `if (plan === 'pro')`.
2. Tạo user / upload / SP chạm `QuotaGuard` — **đặc biệt `max_users` (seat)** đọc từ plan + `tenant.seat_bonus` (Admin cấp thêm).
3. Seed catalog `feature` + 3 plan; Pro bật `multi_user` + `roles_manager`.
4. Admin Portal: gán plan, **cấp thêm seat**, override flag, tạo/reset user tenant.

**Cấm:** hard-code tên gói trong retail service; feature flag rải string magic không nằm catalog.

#### 7) Add-on vs gói

- **Gói** = bundle limits + capabilities theo size (giá tháng/năm).
- **Add-on** = 1–n `feature` gắn subscription (vd chỉ mua thêm `handbook`) — model sau; catalog feature đã sẵn thì add-on chỉ thêm quan hệ `subscription_addon`.

---

## 3.5 Trial

Cho phép dùng thử (cấu hình được).

- 7 ngày / 15 ngày / 30 ngày (preset)

Hết thời gian:

- Gia hạn
- Hoặc khóa Tenant

---

## 3.6 Billing

Quản lý

- Gói dịch vụ (placeholder Phase 1)
- Chu kỳ thanh toán
- Gia hạn
- Lịch sử thanh toán

Không phải kế toán. Chi tiết gói / giá / hạn mức → sau Phase 1 chức năng.

---

## 3.7 Authentication

### Đăng nhập (Phase 1)

Đăng nhập bằng **một trong các định danh + mật khẩu** (không OTP Phase 1):

- **Username**
- **Phone**
- **Email**

Cùng một user có thể có cả 3; khi login hệ thống resolve identifier → user rồi verify password.

Sau này (ngoài Phase 1 core):

- Google / Apple OAuth
- OTP SMS (nếu cần khôi phục / xác minh SĐT)

### Onboarding user (Phase 1)

Luồng chính **không self-signup** cho end-user cửa hàng. Có 2 kênh tạo TK:

**A. Saler B2C (đi thực địa / bán gói SaaS cho cửa hàng)**

1. Saler đăng nhập **System Admin Portal**.
2. Tạo **Tenant + Owner** (và Staff nếu cần) ngay tại chỗ cho khách.
3. Gán **username / phone / email** + **đặt mật khẩu** (hoặc generate).
4. Saler **được quyền đặt / đổi mật khẩu giúp khách** bất kỳ lúc nào (hỗ trợ tại quầy, quên MK, setup máy).
5. Tùy chọn: bật `must_change_password` để khách tự đổi MK lần đầu — **không bắt buộc** nếu Saler đã set MK cuối cùng cho khách.

**B. Platform Admin (vận hành nội bộ)**

- Cùng quyền tạo Tenant/User như Saler (hoặc rộng hơn: billing, lock tenant, announcement…).
- Cũng được reset / đổi MK giúp user tenant.

**Trong tenant (quản lý nhân viên cửa hàng)**

- **Owner** (và **Manager** nếu được quyền): màn **Nhân viên** — tạo / sửa / vô hiệu hóa user trong tenant.
- Tạo user chỉ khi còn **seat** (`active_users < effective_max_users`). Hết seat → báo nâng gói / liên hệ Saler.
- Gán 1 trong 3 role: Owner (hạn chế — xem 3.8) / Manager / Staff.
- Đặt MK tạm hoặc generate; tùy chọn `must_change_password`.
- **Không** tự tăng `max_users` — chỉ Platform Admin / Saler cấp seat hoặc đổi gói.

Ghi chú:

- Platform Admin / Saler **tách hẳn** khỏi `user` tenant (portal vận hành riêng).
- Mọi tạo user / đổi MK do Saler|Admin ghi **Audit Log** (ai, tenant, user, thời điểm).
- Self-registration public — sau, không bắt buộc Phase 1.

---

## 3.8 Authorization & Nhân viên cửa hàng

### 3.8.1 Ba bậc vai trò (Phase 1 — mọi tenant Simple)

Phù hợp cửa hàng nhỏ: chủ → người tin cậy → nhân viên quầy.

| Bậc | Code | Tên hiển thị | Ai là |
|---|---|---|---|
| 1 — Toàn quyền | `OWNER` | Chủ cửa hàng | Người chịu trách nhiệm tenant |
| 2 — Quản lý | `MANAGER` | Quản lý | Phó / người nhà được giao |
| 3 — Nhân viên | `STAFF` | Nhân viên | Bán hàng, nhập liệu quầy |

**Ma trận quyền (tóm tắt)**

| Hành vi | Owner | Manager | Staff |
|---|---|---|---|
| Bán nhanh / trả hàng | ✓ | ✓ | ✓ |
| Nhập hàng 1 bước | ✓ | ✓ | ✓ (nếu Owner mở) |
| Xem / thu công nợ KH | ✓ | ✓ | ✓ xem; thu tùy Owner |
| Sửa giá tay trên đơn | ✓ | ✓ | tùy Owner |
| Xem BC doanh thu / tồn | ✓ | ✓ | — / tùy |
| Xem BC **lãi gộp** / giá vốn | ✓ | tùy Owner | — |
| Quản lý SP / NCC / KH master | ✓ | ✓ | xem là chính |
| Sổ tay: dùng gợi ý | ✓ | ✓ | ✓ |
| Sổ tay: sửa bệnh / ghim thuốc | ✓ | ✓ | — |
| **Nhân viên**: tạo / sửa / khóa | ✓ | ✓ (không tạo/sửa Owner; không tự nâng mình) | — |
| Cấu hình cửa hàng / Tax / flag | ✓ | — | — |
| Xóa / sửa chứng từ đã hoàn thành | — (cấm mọi role — §18) | — | — |
| Đổi gói / seat / billing | — (chỉ Admin Portal) | — | — |

Permission kỹ thuật vẫn `resource:action` (`sales:create`, `users:manage`, `report:profit`…) — seed 3 role map sẵn. Owner có thể **nới nhẹ** vài quyền Staff (vd cho Staff xem lãi) qua toggle đơn giản Phase 1; không custom role builder.

### 3.8.2 Quy tắc Owner

- Mỗi tenant **≥ 1 Owner** active. Không xóa / disable Owner cuối cùng.
- Có thể nhiều Owner (hiếm); chỉ Owner khác hoặc **Platform Admin** đổi role Owner.
- Manager **không** đổi user thành Owner; không disable Owner.

### 3.8.3 Seat (số lượng user) — gắn gói + Admin cấp thêm

```
effective_max_users = plan.max_users + tenant.seat_bonus
active_count        = số user tenant status IN (ACTIVE, INVITED)  -- DISABLED / soft-delete không tính
còn seat            ⇔ active_count < effective_max_users
```

| Nguồn | Ai set | Ghi chú |
|---|---|---|
| `plan.max_users` | Gói (Starter/Pro/Ent) | Đổi gói → đổi trần |
| `tenant.seat_bonus` | **Platform Admin / Saler** | Cấp thêm seat ngoài gói (bán lẻ / CSKH) |
| Tạo user trong app | Owner / Manager | Chỉ khi còn seat + có `multi_user` nếu >1 |
| Tạo user Admin Portal | Admin / Saler | Cùng quota; có thể vừa +bonus vừa tạo giúp |

**Starter mẫu:** `max_users = 1` (chỉ Owner) → không màn thêm NV (hoặc hiện upsell).  
**Pro mẫu:** `max_users = 5` + `roles_manager` ON.  
**Ent:** `max_users` cao / null.

Hết seat: chặn API tạo user; UI “Đã đủ số tài khoản gói. Liên hệ hỗ trợ / nâng gói”.  
Giảm gói mà `active_count > max` mới: **không xóa user** — chặn login user thừa theo policy (ưu tiên giữ Owner, khóa Staff gần login nhất) **hoặc** read-only + buộc Admin xử lý; Phase 1 chọn **chặn tạo mới + cảnh báo Admin**, không auto-xóa.

### 3.8.4 Màn Nhân viên (trong app cửa hàng)

- Danh sách: tên, username/SĐT, role, trạng thái, lần đăng nhập cuối.
- Thêm: Tên + (username|phone|email) + role + MK.
- Sửa role (trong phạm vi), reset MK (Owner/Manager), **Vô hiệu hóa** (không xóa cứng — soft / DISABLED để trả seat).
- Vô hiệu hóa → `active_count` giảm → seat trống.
- Audit Log mọi tạo / đổi role / reset MK / disable.

### 3.8.5 Feature gắn gói

| Feature / limit | Ý nghĩa |
|---|---|
| `max_users` | Trần seat từ gói |
| `seat_bonus` | Cột tenant — Admin cộng thêm |
| `multi_user` | Cho phép >1 user active (Starter off nếu max=1) |
| `roles_manager` | Cho phép gán role Manager; tắt → chỉ Owner + Staff |

### 3.8.6 Advanced Mode (ngoài Phase 1 core)

Thêm role chuyên biệt khi đa điểm / chuyên môn hóa:

- Warehouse, Sales, Cashier, Viewer  
- Permission Approve / phân kho  

Vẫn dùng cùng bảng `role` / `permission` — chỉ seed thêm + `advanced_mode`.

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

### Loại vật tư (`product_kind`) + thuộc tính theo loại

Một form phẳng PHI/REI **không đủ** cho cả BVTV / phân bón / thức ăn / thú y. Mỗi SP có:

- **product_kind** — PESTICIDE | FERTILIZER | VET_DRUG | ANIMAL_FEED | AQUA_* | SEED | … (chi tiết `database-design-retail.md` §5.4)
- **Trường chung:** SKU, tên, đơn vị, quy cách đóng gói, số ĐK/GCN (nếu có), giá, HSD/lô
- **Trường chuyên ngành** (optional, theo kind):

| Loại | Trường đặc thù (Phase 1) |
|---|---|
| **Thuốc BVTV** | Hoạt chất, hàm lượng, dạng chế phẩm (EC/WP…), đối tượng cây, sâu/bệnh, **PHI**, **REI**, nhóm độc (tùy) |
| **Phân bón** | Loại (NPK/đạm/hữu cơ…), **%N %P %K**, trung–vi lượng, dạng, cách bón — *không dùng PHI/REI* |
| **Thuốc thú y** | Hoạt chất, hàm lượng, dạng (tiêm/uống/trộn), loài vật, **thời gian ngưng thuốc** (withdrawal ≠ PHI), liều gợi ý |
| **Thức ăn chăn nuôi** | Loài, giai đoạn, dạng (viên/bột), **% đạm**, năng lượng, ẩm/xơ — *không PHI/REI* |
| **Thủy sản** | Tương tự thuốc/TACN theo loài tôm–cá |
| **Giống** | Giống/variety, (tùy) tỷ lệ nảy mầm / độ thuần |

Sổ tay (handbook) ưu tiên match **hoạt chất + pest_tags** trên BVTV / thú y / thuốc TS. Phân bón & TACN chủ yếu ghim thủ công / tìm theo tên.

Chi tiết cột DB + Json `attrs`: `docs/database-design-retail.md` §5.4.

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

> Chi tiết: `docs/sales.md`.

Phase 1 tóm tắt — **một màn Bán nhanh, hai luồng**:

| Luồng | Khách | Hệ thống |
|---|---|---|
| **A. Biết thuốc** | Gọi tên / mang vỏ | Ghim, top, quét, gõ SP → thu |
| **B. Kể bệnh** | Nói bệnh/triệu chứng | Gõ bệnh trên ô bán → bệnh + thuốc (+ tuỳ diện tích/số con/đàn → gợi ý SL) → thu |

- Hỏi đáp **optional**; thu 1 chạm; ghi nợ SĐT; in/Zalo phiếu.
- **Sales Return** có; **Sales Order Draft** không bắt buộc UI Phase 1.

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

Cho phép cấu hình (mặc định Phase 1 nghiêng về quầy nông thôn):

| Flag | Mặc định Phase 1 |
|---|---|
| Tax Enabled | **OFF** |
| Debt Enabled | **ON** |
| Batch Enabled | **ON** (HSD / recall quan trọng) |
| Barcode Enabled | **ON** (tắt được nếu không dùng máy quét) |
| Quantity Tier Pricing | **OFF** (bật khi cần; vẫn sửa giá tay) |
| Handbook (bệnh → thuốc trên Bán nhanh) | **ON** nếu gói có `handbook` |
| Handbook hỏi diện tích/số con + gợi ý SL | **ON** luồng B; từng field optional / Owner tắt được |
| Handbook fallback 2 lớp | **OFF** mặc định (Phase 1.1) |
| Multi-user / Manager role | theo gói (`multi_user`, `roles_manager`) |
| Advanced Mode | **OFF** — ngoài Phase 1 |

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

Portal dành cho đơn vị vận hành SaaS (Platform Admin + **Saler** đi bán B2C).

## 19.1 Vai trò portal

| Role | Mục đích Phase 1 |
|---|---|
| **SUPER_ADMIN** | Toàn quyền vận hành |
| **SALER** | B2C: tạo Tenant/Owner/Staff, đặt/đổi MK, **cấp seat_bonus**, gán plan |
| **SUPPORT** | Ticket, reset MK, hỗ trợ |
| **BILLING** | Gói, hóa đơn, thanh toán, điều chỉnh seat theo hợp đồng |

Saler là kênh onboard chính ngoài thực địa — không phụ thuộc khách tự đăng ký.

## 19.2 Quản lý

- Tenant (tạo / khóa / trial)
- **Seat & gói**: gán plan, set `seat_bonus` (cấp thêm tài khoản ngoài gói), xem `active_count / effective_max`
- User tenant: tạo Owner/Manager/Staff, đặt & đổi MK giúp khách
- Subscription / Packages / Features
- Storage, Payment
- System Announcement
- Audit (tạo TK, đổi MK, đổi seat, đổi role)
- Support Ticket

## 19.3 Dashboard

- Total Tenant / Active / Expired
- Monthly Revenue (placeholder nếu chưa chia gói)
- New Registration (kể cả do Saler tạo)
- System Health
- Theo Saler: số tenant/user Saler đã mở (hỗ trợ theo dõi B2C)

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
- **Sổ tay nâng cao**: AI / ảnh chụp; chia sẻ Sổ tay; nhắc lịch phun. Phase 1 = bệnh → ghim thuốc. **21.7 / 21.8 / context đầy đủ §22 = Phase 1.1 (flag)** — xem `handbook.md`.

---

# 21. Handbook & Context tư vấn

> Nội dung đã tách sang `docs/handbook.md`. Tham khảo `handbook.md` để biết: Sổ tay bệnh → thuốc (mục 21), schema hỏi đáp theo lĩnh vực + công thức tính lượng thuốc sơ bộ (21.7), fallback thuốc khi hết hàng theo 2 lớp (21.8), và context tư vấn trên đơn bán (mục 22).
