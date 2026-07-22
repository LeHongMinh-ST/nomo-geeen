#: NomoGreen Retail Platform

> Business Logic - Phase 1 (MVP)

Version: 2.1

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

## Giá trị cốt lõi và nỗi đau phải giải quyết

Phase 1 chỉ được xem là đạt khi giải quyết được ba nỗi đau thực tế của đại lý, không chỉ
có màn hình tương ứng:

1. **Công nợ mua chịu** — ghi nhận đúng theo từng hộ dân, biết số dư và hạn thu; có nhắc
   trong app trước hạn/quá hạn. SMS/Zalo là kênh tích hợp sau, không được coi là đã có nếu
   chỉ có nút sao chép hoặc liên kết Zalo.
2. **HSD và tồn kho** — quản lý theo lô, nhìn thấy hàng sắp hết hạn theo các mốc 6 tháng,
   3 tháng và 30 ngày; không bán hàng đã hết hạn/thu hồi; có danh sách xử lý để xả hàng
   hoặc trả nhà cung cấp.
3. **Tư vấn kỹ thuật tại quầy** — tra bệnh/vấn đề theo cây trồng hoặc vật nuôi, gợi ý
   sản phẩm phù hợp đang còn trong kho của chính Tenant; lưu snapshot tư vấn vào đơn.

Các capability phục vụ ba nỗi đau trên (`debt`, `batch_expiry`, `handbook`) là **core của
gói đại lý và pilot**, không được mặc định coi là add-on làm mất giá trị sản phẩm.

## Nguyên tắc thiết kế Phase 1: Simple First

Đối tượng chính là nông hộ và cửa hàng nhỏ, thường **một người vừa bán vừa quản kho vừa thu tiền**. Vì vậy Phase 1 mặc định chạy ở **Simple Mode**:

- Một kho duy nhất, không chuyển kho.
- Vai trò **Owner > Manager > Staff**; số user theo gói (`max_users` + seat Admin cấp thêm).
- Nhập hàng một bước, không quy trình duyệt nhiều cấp.
- **Bán nhanh là luồng chính** — mở app vào quầy; ≤ 3 chạm bán 1 SP tiền mặt (chi tiết `sales.md`).
- Tax / giá bậc: **tắt hoặc tùy chọn mặc định**, không chặn bán.
- `debt`, `batch_expiry` và `handbook` phải bật trong pilot đại lý; hỏi đáp Sổ tay vẫn
  optional theo từng bệnh/trường, không chặn bán.

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

### Phase 1 và pilot thương mại

- **Bao quát đủ chức năng Simple Mode và ba giá trị cốt lõi trước** — không khóa
  `debt`, `batch_expiry`, `handbook` khỏi pilot đại lý.
- Entity `plan` / `subscription` / `plan_feature` / `tenant_feature_flag` **có sẵn** (xem `database-design.md`).
- Tenant trial/active phải có một plan thực, feature bundle xác định và ngày hết hạn;
  không dùng plan placeholder trong luồng vận hành pilot.
- Mọi capability phải được enforce ở backend bằng `FeatureGuard`/`QuotaGuard`; UI chỉ
  là lớp hiển thị, không phải nguồn kiểm soát quyền.

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

**Core đại lý / pilot (mọi trial đại lý phải có)**

| code | Ai cần |
|---|---|
| `debt` | Bán chịu, hạn thu, số dư và nhắc nợ trong app |
| `batch_expiry` | Lô + HSD + chặn hết hạn + cảnh báo 6/3/1 tháng |
| `recall` | Thu hồi / chặn bán lô |
| `handbook` | Sổ tay bệnh → thuốc theo tồn kho Tenant |
| `handbook_consult` | Hỏi đáp + công thức optional tại quầy |
| `report_debt` | Sổ công nợ chi tiết |

**Add-on có thể upsell sau pilot**

`barcode`, `handbook_fallback`, `pricing_tier`, `pricing_customer`, `tax`, `print_receipt`,
`import_export`, `multi_user`, `roles_manager`, `sales_return`, `report_profit` và các
capability không thuộc ba nỗi đau cốt lõi.

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

## 3.5 Trial và pilot đại lý

Trial là một subscription có lifecycle đầy đủ, không phải cờ giao diện.

- Preset thương mại:
  - `sales_demo`: 7 ngày, dùng cho demo nhanh.
  - `self_serve`: 15 hoặc 30 ngày, dùng cho đăng ký thông thường.
  - `dealer_pilot`: **90 ngày**, dành cho 5–10 đại lý trong một vùng lõi.
- Trial pilot phải bật sẵn `sales_quick`, `product_basic`, `inventory_single`,
  `purchase_simple`, `customer_basic`, `supplier_basic`, `debt`, `batch_expiry`,
  `handbook`, `handbook_consult`, `report_basic`.
- Subscription lưu tối thiểu: `status`, `start_date`, `trial_ends_at`, `end_date` (nếu
  có), `plan_id`, người tạo, lý do/pilot cohort và audit lịch sử thay đổi.
- Trước khi hết hạn: nhắc Owner và Saler ở các mốc 14 ngày, 3 ngày và ngày hết hạn.
- Khi hết hạn: chuyển `EXPIRED`/khóa Tenant theo policy; không xóa dữ liệu; cho phép
  gia hạn hoặc chuyển sang gói trả phí.
- Trial không tự động thu tiền nếu chưa có payment method và consent rõ ràng.

Acceptance gate cho `dealer_pilot`:

- Tạo Tenant + Owner + plan trial trong một transaction.
- Owner có thể bán, ghi nợ, thu nợ, nhập batch có HSD và tra Sổ tay trong cùng trial.
- Saler xem được ngày hết trial, feature bundle, hoạt động sử dụng và trạng thái chuyển đổi.
- Có thể gia hạn/đổi plan idempotent, có audit, không tạo hai subscription hiệu lực đồng thời.

Hết thời gian: gia hạn, chuyển gói trả phí, hoặc khóa Tenant ở chế độ read-only/expired
theo policy; tuyệt đối không xóa dữ liệu.

---

## 3.6 Billing

Quản lý

- Gói dịch vụ và giá niêm yết
- Chu kỳ thanh toán
- Gia hạn
- Lịch sử thanh toán
- Invoice/payment status tối thiểu cho vận hành SaaS

Không phải kế toán tổng hợp. Billing Phase 1 chỉ cần quản lý subscription, invoice/payment
status và audit; chưa cần sổ kế toán hoặc đối soát phức tạp.

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

### In-app bắt buộc trong Phase 1

- Công nợ sắp đến hạn / đến hạn / quá hạn.
- Hàng sắp hết.
- Hàng gần hết hạn theo 180/90/30 ngày và đã hết hạn.
- Trial sắp hết hạn theo 14/3/0 ngày.

Notification phải tenant-scoped, idempotent theo `(tenant, loại, đối tượng, mốc ngày)`,
có trạng thái đã đọc và không tạo lặp mỗi lần mở app.

### Kênh tích hợp sau khi in-app ổn định

- SMS/Zalo chỉ được đánh dấu **đã hỗ trợ** khi có provider adapter, consent/opt-out,
  retry, rate limit, delivery status và audit nội dung gửi.
- Không gửi thông tin nhạy cảm vượt quá tên khách, số tiền, hạn thu và đường dẫn an toàn.

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

# 5. Quản lý sản phẩm — tóm tắt và nguồn sự thật

> Phân tích chi tiết đã tách sang [`core-business-catalog.md`](./core-business-catalog.md).
> Chương này giữ các quyết định tích hợp chính; mọi thuộc tính, chính sách kho, nghiệp vụ
> theo nhóm và thiết kế Thủy sản tương lai phải đọc theo tài liệu canonical đó.

Năm nhóm dưới đây là **business taxonomy cố định** của NomoGreen, dùng xuyên suốt Product,
Inventory, Purchase, Sales, Reports và Handbook:

1. **Thuốc bảo vệ thực vật + Phân bón** (`CROP_INPUTS`)
2. **Cây giống** (`CROP_SEEDLINGS`)
3. **Thức ăn chăn nuôi** (`ANIMAL_FEED`)
4. **Thuốc thú y** (`VETERINARY_DRUGS`)
5. **Con giống** (`LIVESTOCK`) 

Đây là nhóm kinh doanh, **không phải một product kind duy nhất**. Mỗi nhóm có loại kỹ thuật
riêng, thuộc tính riêng và quy tắc kho riêng.

## 5.1 Ba tầng danh mục

```text
Business Group cố định của hệ thống
  → Product Kind kỹ thuật, quyết định form + validation + nghiệp vụ
    → Category phụ do Tenant tự quản lý, phục vụ lọc/báo cáo nội bộ
```

| Business group | Product kind Phase 1 | Ghi chú |
|---|---|---|
| `CROP_INPUTS` | `PESTICIDE`, `FERTILIZER` | Hiển thị chung nhưng tuyệt đối không dùng chung toàn bộ thuộc tính |
| `CROP_SEEDLINGS` | `SEED`, `SEEDLING` | `SEEDLING` là cây sống; `SEED` là hạt giống |
| `ANIMAL_FEED` | `FEED` | Cám hoàn chỉnh, đậm đặc, premix, thức ăn thô |
| `VETERINARY_DRUGS` | `VET_DRUG` | Thuốc uống, tiêm, bôi, trộn |
| `LIVESTOCK` | `LIVESTOCK_SEED` | Con giống sống theo lô hoặc cá thể |

`Category` tenant-scoped hiện tại vẫn được phép có `parent_id`, nhưng không được đổi mã hoặc
xóa 5 business group chuẩn. Tenant có thể tạo nhóm phụ như “Thuốc trừ sâu”, “Cám heo thịt”,
“Heo cai sữa”, nhưng nhóm phụ phải nằm dưới business group và không được thay đổi nghiệp vụ
do `product_kind` quyết định.

Không dùng Product Category ID làm business group vì category là dữ liệu có thể sửa theo cửa
hàng; nếu liên kết Sổ tay trực tiếp với category tenant, tri thức tư vấn sẽ bị hỏng khi Owner
đổi tên danh mục.

## 5.2 Trường chung của mọi sản phẩm

Mọi Product phải có:

- `business_group` — một trong 5 mã cố định.
- `product_kind` — loại kỹ thuật.
- SKU duy nhất trong Tenant.
- Tên và trường tìm kiếm bỏ dấu.
- Barcode nếu có.
- Danh mục phụ, nhãn hiệu, nhà sản xuất, nhà cung cấp mặc định.
- Base Unit, quy cách đóng gói, khối lượng/thể tích tịnh nếu parse được.
- Giá vốn, giá lẻ, giá sỉ, giá thỏa thuận.
- Trạng thái Active/Inactive, Locked, Recalled.
- `attrs` theo `product_kind`, được validate bởi backend; không nhận JSON tùy ý không kiểm tra.
- Cờ `stock_mode`: hàng đóng gói, hàng rời, cây sống, con sống hoặc cá thể nếu cần.

Một form Product phải chọn `product_kind` trước, sau đó mới hiện block thuộc tính phù hợp.
Không hiển thị PHI/REI cho phân bón, protein cho thuốc thú y, hoặc tỷ lệ nảy mầm cho thuốc.

## 5.3 Nhóm 1 — Thuốc bảo vệ thực vật + Phân bón

Đây là một nhóm điều hướng chung cho đại lý cây trồng, nhưng có hai nghiệp vụ khác nhau.

### 5.3.1 Thuốc bảo vệ thực vật (`PESTICIDE`)

Thuộc tính:

- Hoạt chất, hàm lượng, dạng chế phẩm: EC/WP/SC/SL/GR.
- Tác dụng: trừ sâu, trừ bệnh, trừ cỏ, điều hòa sinh trưởng.
- Cây trồng, sâu/bệnh mục tiêu, nhóm độc.
- Số đăng ký, nhà sản xuất, cảnh báo an toàn.
- PHI — thời gian cách ly trước thu hoạch.
- REI — thời gian được vào lại khu vực phun.
- Liều dùng và ghi chú kỹ thuật.
- Quy cách: chai, gói, lọ, can, ml, lít.

Kho và nhập hàng:

- Bắt buộc ưu tiên quản lý theo lô, số lô, ngày sản xuất, HSD.
- Lô hết hạn, bị thu hồi hoặc bị khóa không được bán.
- Nhập cùng SKU nhưng khác lô phải tạo các tồn lô riêng.
- Xuất theo FEFO: lô gần hết hạn được ưu tiên trước.
- Hỗ trợ cảnh báo 180/90/30 ngày.

Bán hàng và Sổ tay:

- Match theo hoạt chất, cây trồng, sâu/bệnh và thuốc được Owner ghim.
- Sản phẩm hết hạn/thu hồi chỉ được hiển thị ở khu xử lý, không được thêm vào giỏ.
- Khi tư vấn phải có thể hiển thị PHI/REI và liều ghi chú.
- Đơn phát sinh từ bệnh phải lưu disease snapshot và thuốc đã chọn.

### 5.3.2 Phân bón (`FERTILIZER`)

Thuộc tính:

- Loại: NPK, đạm, lân, kali, hữu cơ, vi sinh, trung–vi lượng.
- `%N`, `%P₂O₅`, `%K₂O`.
- Canxi, magie, lưu huỳnh, vi lượng.
- Dạng: hạt, bột, nước, viên.
- Cách dùng: bón gốc, phun lá, tưới.
- Cây trồng/giai đoạn phù hợp.
- Hàm lượng hữu cơ, quy cách bao/chai.

Không dùng các trường PHI, REI, hoạt chất điều trị hoặc bệnh mục tiêu của thuốc BVTV.

Kho và nhập hàng:

- Hỗ trợ bao, kg, tấn, chai, lít; bao 50kg có thể bán theo kg nếu có conversion.
- Có thể quản lý lô để truy xuất chất lượng, ngày sản xuất và HSD nếu nhà sản xuất cung cấp.
- Theo dõi tình trạng ẩm, vón cục, rách bao, giảm chất lượng bằng adjustment/reason.
- Không tự động áp quy tắc thuốc BVTV cho phân bón.

Bán hàng:

- Có thể tư vấn theo cây, diện tích, giai đoạn và số lần bón.
- Số lượng đề xuất chỉ là tham khảo; người bán xác nhận và chỉnh tay.
- Giá có thể theo bao, kg hoặc mức số lượng.

## 5.4 Nhóm 2 — Cây giống (`CROP_SEEDLINGS`)

Nhóm này phải phân biệt hạt giống và cây sống; không được chỉ đổi tên `CROP_SEED` thành
“Cây giống” rồi coi hai loại là một.

### Hạt giống (`SEED`)

Thuộc tính:

- Cây trồng, tên giống/variety, mùa vụ, vùng phù hợp.
- Tỷ lệ nảy mầm, độ thuần, ngày đóng gói.
- Hạn sử dụng hoặc thời hạn gieo khuyến nghị.
- Số hạt/gói hoặc khối lượng/gói.
- Số lô, nhà sản xuất, hướng dẫn bảo quản.

Kho:

- Tồn theo gói, kg hoặc hạt.
- Quản lý lô và chất lượng nảy mầm.
- Hàng ẩm/mốc phải có lý do điều chỉnh riêng.
- Bán gói nguyên hoặc bán theo đơn vị nhỏ chỉ khi conversion được cấu hình.

### Cây con/cây ghép (`SEEDLING`)

Thuộc tính:

- Loài cây, giống, tuổi cây, ngày gieo/ngày ghép.
- Chiều cao, kích thước bầu/chậu/khay, giai đoạn phát triển.
- Tình trạng rễ, tỷ lệ sống, vườn ươm, lô cây.
- Mùa vụ phù hợp và điều kiện vận chuyển.

Kho:

- Tồn theo cây, bầu, khay hoặc lô; không ép tất cả về kg.
- Không có HSD cứng như thuốc, nhưng có “tuổi xuất bán tối ưu”.
- Phải ghi nhận cây chết, cây loại, hao hụt chăm sóc bằng adjustment có reason.
- Lô cây khác tuổi/chất lượng không được gộp tùy tiện.

Bán hàng:

- Bán theo cây, khay, bầu hoặc lô.
- Có thể tính số cây theo diện tích và mật độ, nhưng luôn cho phép chỉnh tay.
- Sổ tay tập trung vào cây, giống, thời vụ, sâu/bệnh; không coi cây giống là thuốc.

## 5.5 Nhóm 3 — Thức ăn chăn nuôi (`ANIMAL_FEED`)

Thuộc tính:

- Loại: hỗn hợp hoàn chỉnh, đậm đặc, premix, thức ăn thô.
- Loài: heo, gà, vịt, bò, dê…
- Giai đoạn: con non, cai sữa, sinh trưởng, vỗ béo, đẻ trứng, sinh sản.
- Dạng: viên, bột, mảnh.
- Đạm thô, năng lượng, độ ẩm, xơ, ghi chú thành phần.
- Quy cách bao và điều kiện bảo quản.

Không dùng PHI/REI hoặc thuộc tính thuốc điều trị. Nếu sản phẩm có thành phần dược lý,
Owner phải xác định rõ đó là thức ăn bổ sung hay thuốc trước khi tạo Product.

Kho và nhập hàng:

- Tồn theo bao/kg/tấn, có quy đổi bao → kg.
- Quản lý lô và HSD; ưu tiên FEFO vì thức ăn có thể ẩm/mốc/giảm chất lượng.
- Có reason riêng cho bao đã mở, ẩm mốc, vón cục hoặc hao hụt.
- Không trộn lô khi chia nhỏ nếu không thể truy xuất lô gốc.

Bán hàng và Sổ tay:

- Tư vấn theo loài, số con, giai đoạn, cân nặng và số ngày dùng.
- Có thể đề xuất số bao nhưng không tự động coi thức ăn là thuốc.
- Sổ tay có thể ghim thức ăn theo loài/giai đoạn; bệnh cần thuốc phải dẫn sang nhánh thuốc thú y.

## 5.6 Nhóm 4 — Thuốc thú y (`VETERINARY_DRUGS`)

Thuộc tính:

- Hoạt chất, hàm lượng, dạng bào chế: tiêm, uống, bôi, nhỏ, trộn thức ăn.
- Loài vật, chỉ định, bệnh/tình trạng.
- Liều theo kg thể trọng, đường dùng, thời gian điều trị.
- Thời gian ngưng thuốc tách riêng theo thịt, sữa, trứng.
- Số đăng ký, nhà sản xuất, quy cách, điều kiện bảo quản/lạnh.

Không dùng `phi_days`/`rei_hours` của cây trồng. Thuốc thú y phải có nhóm field riêng:
`withdrawal_meat_days`, `withdrawal_milk_days`, `withdrawal_egg_days`.

Kho và nhập hàng:

- Bắt buộc quản lý lô, HSD, thu hồi và trạng thái bảo quản.
- Xuất FEFO.
- Không bán thuốc hết hạn, thu hồi, hoặc không đủ điều kiện bảo quản.
- Có thể truy xuất các đơn đã bán theo lô khi có sự cố.

Bán hàng và Sổ tay:

- Hỏi loài, số con mắc, tổng đàn, cân nặng trung bình, triệu chứng và thuốc đã dùng.
- Gợi ý theo bệnh → loài → hoạt chất → thuốc còn hàng.
- Hiển thị cảnh báo thời gian ngưng thuốc.
- Lưu snapshot tư vấn trên đơn; snapshot không thay đổi khi Sổ tay được sửa sau đó.

## 5.7 Nhóm 5 — Con giống (`LIVESTOCK`)

Con giống là hàng hóa sống, nên tồn kho không chỉ là số lượng bán được.

Thuộc tính:

- Loài, giống, giới tính, ngày sinh/tuổi, cân nặng.
- Lô giống, nguồn giống, ngày nhập.
- Tình trạng sức khỏe, tiêm phòng, cách ly.
- Giai đoạn/kích thước, số con, mã cá thể nếu cần truy xuất.
- Giá theo con, đàn hoặc kg.

Kho:

- Tồn tối thiểu gồm số con thực tế và số con đủ điều kiện bán.
- Trạng thái: AVAILABLE, QUARANTINED, SICK, SOLD, DEAD, REJECTED.
- Nhập lô con giống phải lưu số con, tuổi, tình trạng và nguồn.
- Chết/loại/hao hụt là nghiệp vụ có reason, không phải xóa Product hoặc trừ kho tùy ý.
- Không áp HSD thuốc; thay bằng tuổi/giai đoạn xuất bán và trạng thái sức khỏe.

Bán hàng:

- Bán theo con, đàn hoặc kg tùy loại.
- Không cho bán con đang cách ly/bệnh/loại.
- Phải lưu lô, tuổi, số lượng và tình trạng khi hoàn tất đơn.
- Cho phép tách lô khi bán một phần đàn.

Sổ tay:

- Tập trung vào loài, giống, bệnh, triệu chứng, vaccine/thuốc liên quan và chăm sóc.
- Không dùng logic “hoạt chất thuốc BVTV” cho con giống.
- Nếu gợi ý thuốc, phải chuyển sang danh mục Thuốc thú y và giữ rõ quan hệ bệnh → thuốc.

## 5.8 Cửa hàng đa nhóm và cửa hàng chuyên biệt

Tenant không bị ép phải bán đủ 5 nhóm. Cấu hình cửa hàng gồm tập `enabled_business_groups`:

| Mô hình | Ví dụ | Hành vi |
|---|---|---|
| Đa nhóm | Đại lý bán thuốc, phân, giống, cám, thú y | Hiển thị nhiều nhóm; Dashboard và search có bộ lọc nhóm |
| Chuyên cây trồng | Cửa hàng BVTV + phân bón + cây giống | Ẩn nhóm chăn nuôi khỏi menu; không xóa dữ liệu cũ |
| Chuyên chăn nuôi | Cám + thuốc thú y + con giống | Ưu tiên đàn, loài, bệnh vật nuôi |
| Chuyên một loại | Vườn ươm hoặc trại giống | Form, đơn vị, báo cáo và Sổ tay tối giản theo nhóm |

Quy tắc:

- Tắt nhóm chỉ chặn tạo mới/bán mới theo policy; không xóa Product, Stock, Sale, Purchase hoặc Handbook history.
- Owner có thể bật thêm nhóm mà không migration lại dữ liệu cũ.
- Search toàn cục chỉ trả nhóm đang bật ở màn bán; màn quản trị có thể cho Owner xem dữ liệu đã tắt.
- Quyền `product:*`, `purchase:*`, `inventory:*`, `handbook:*` vẫn tenant-scoped; group visibility không thay thế permission.
- Dashboard tự chọn KPI theo nhóm đang bật, nhưng báo cáo tổng hợp phải giữ cùng mã business group.

## 5.9 Đơn vị quy đổi (Unit Conversion)

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

Quy tắc theo nhóm:

- Thuốc BVTV: chai/gói/lọ/can ↔ ml/lít/gói cơ sở.
- Phân bón: bao ↔ kg; không được làm tròn mất phần lẻ khi bán theo kg.
- Hạt giống: gói ↔ kg/hạt nếu nhà sản xuất cung cấp định lượng đáng tin cậy.
- Cây con: cây ↔ khay/bầu; không quy đổi sang kg.
- Thức ăn: bao ↔ kg/tấn.
- Thuốc thú y: chai/lọ/gói/viên ↔ ml/g/viên.
- Con giống: con ↔ đàn; cân nặng là thuộc tính/định lượng bổ sung, không thay thế số con.

Conversion phải có `kind` PURCHASE, SALE hoặc BOTH. Không cho phép quy đổi chồng nhiều bước
không kiểm soát; mọi dòng nhập/bán phải lưu cả `qty` theo đơn vị giao dịch và `qty_base` sau
quy đổi để audit.

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
- Thông tin thủy sản chỉ giữ ở dạng future extension/legacy profile; không thuộc 5 business
  group xương sống Phase 1 và không được xuất hiện như một nhóm Product/Handbook selectable.

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

- Nhập theo đơn vị lớn (tự quy đổi ra Base Unit — xem 5.9)
- Batch
- Expiration Date
- Chiết khấu, VAT, chi phí vận chuyển trên phiếu (nếu bật Tax — xem 15)
- Ghi công nợ NCC nếu chưa trả đủ

### Validation và chứng từ theo 5 nhóm

Một phiếu nhập có thể chứa nhiều nhóm nếu cùng nhà cung cấp và cùng kho, nhưng mỗi dòng
phải validate theo `product_kind`:

| Nhóm | Dữ liệu nhập tối thiểu | Kết quả kho |
|---|---|---|
| Thuốc BVTV | lô, HSD, đơn vị, quy cách; số đăng ký nếu có | Tăng tồn lô, FEFO, cảnh báo HSD |
| Phân bón | đơn vị/quy cách; lô nếu có | Tăng tồn bao/kg/lít, theo dõi chất lượng |
| Cây giống | loại hạt/cây, lô, số gói/cây/khay, tuổi nếu là cây sống | Tăng tồn vật tư hoặc tồn cây sống |
| Thức ăn | lô, HSD, loài/giai đoạn, bao/kg | Tăng tồn lô, FEFO, cảnh báo ẩm/mốc |
| Thuốc thú y | lô, HSD, dạng thuốc, điều kiện bảo quản | Tăng tồn lô, FEFO, thu hồi |
| Con giống | lô, số con, tuổi/cân nặng, sức khỏe/tiêm phòng | Tăng tồn đàn/lô, không gộp sai trạng thái |

Nhập hàng hoàn tất phải ghi `purchase_line` theo đơn vị giao dịch, `qty_base`, lô và giá
vốn. Không được hoàn tất dòng con giống thiếu số con hoặc dòng thuốc thiếu thông tin lô/HSD
khi feature batch đang bật.

### Điều chỉnh và trả nhà cung cấp

- Thuốc/phân/thức ăn/thuốc thú y: trả theo lô và lý do; không làm mất lịch sử lô.
- Hạt giống: trả theo gói/lô; giữ thông tin tỷ lệ nảy mầm.
- Cây con: hao hụt chết/loại phải là adjustment reason riêng, không ghi là “mất hàng”.
- Con giống: chết, bệnh, loại, cách ly và trả nguồn giống là các reason riêng; phải lưu số con trước/sau.
- Mọi adjustment hoặc return hoàn tất tạo movement trong cùng transaction với chứng từ.

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

### Chính sách tồn theo nhóm

| Nhóm | Đơn vị tồn | Lô/HSD | Cách xuất ưu tiên | Hao hụt/trạng thái |
|---|---|---|---|---|
| Thuốc BVTV | base unit của chai/gói/lít | Bắt buộc khi batch ON | FEFO, chặn hết hạn/thu hồi | Không tự ý giảm tồn |
| Phân bón | kg/bao/lít | Lô khuyến nghị; HSD nếu có | FIFO hoặc FEFO khi có HSD | Ẩm, vón, rách bao |
| Cây giống | gói/kg hoặc cây/bầu/khay | Lô + tuổi cây | Theo lô đủ chất lượng | Chết, loại, giảm tỷ lệ sống |
| Thức ăn chăn nuôi | kg/bao/tấn | Lô + HSD | FEFO | Ẩm, mốc, bao mở |
| Thuốc thú y | chai/lọ/gói/viên | Bắt buộc HSD/thu hồi | FEFO | Hỏng bảo quản, thu hồi |
| Con giống | con/đàn + cân nặng bổ sung | Lô; không HSD cứng | Lô đủ điều kiện bán | Chết, bệnh, cách ly, loại |

### Invariant kho

- `stock.qty` là tổng tồn theo Base Unit của Product trong Warehouse.
- Khi batch bật, `stock.qty = SUM(product_batch.qty_on_hand)` cho cùng product/warehouse.
- Với cây/con sống, trạng thái và số lượng đủ điều kiện bán phải không vượt số lượng thực tế.
- Mọi IN/OUT/adjustment/return phải tạo `stock_movement` trong cùng transaction.
- Không cho tồn âm; không dùng frontend làm nguồn quyết định tồn.
- Không được gộp lô khác HSD, tuổi, chất lượng hoặc trạng thái sống nếu mất khả năng truy xuất.

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

### Kiểm tra bán theo nhóm

- **Thuốc BVTV:** kiểm tra tồn lô, HSD, recall, khóa bán; hiển thị PHI/REI khi có.
- **Phân bón:** kiểm tra tồn và quy đổi bao/kg; không hiển thị cảnh báo PHI/REI.
- **Cây giống:** kiểm tra số cây/gói/khay còn đủ điều kiện; không bán cây ở trạng thái loại/chết.
- **Thức ăn chăn nuôi:** kiểm tra lô/HSD và điều kiện bán; ưu tiên bao/lô gần hạn.
- **Thuốc thú y:** kiểm tra HSD/thu hồi/bảo quản; hiển thị thời gian ngưng thuốc theo loài.
- **Con giống:** kiểm tra số con, lô, sức khỏe/cách ly; bán theo con/đàn/kg tùy cấu hình.

Một dòng bán luôn lưu `product_id`, `product_name_snapshot`, `unit_id`, `qty`, `qty_base`,
`unit_price`, `unit_cost` và phân bổ lô nếu có. Đơn Completed không sửa dòng, lô xuất,
giá vốn hoặc context Sổ tay.

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

### Công nợ mua chịu theo hộ dân

- Mỗi khách hàng có số dư, hạn mức và `payment_due_date`/chính sách hạn thu riêng.
- Khi hoàn tất đơn có ghi nợ, hệ thống tạo ledger và lịch nhắc theo ngày đến hạn.
- Mặc định nhắc Owner trong app trước hạn 7 ngày, 1 ngày và khi quá hạn; Owner có thể
  tắt từng mốc nhưng không được mất lịch sử ledger.
- Nhắc khách qua SMS/Zalo là capability tích hợp riêng, chỉ chạy khi có consent và
  provider cấu hình hợp lệ.
- Không gửi nhắc dựa trên số dư frontend; số tiền và trạng thái phải lấy từ server.

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
| Handbook (bệnh → thuốc trên Bán nhanh) | **ON** trong dealer pilot; theo gói sau pilot |
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
- **Business group là mã cố định**, không phụ thuộc tên Category do Tenant đặt.
- **Product kind quyết định validation**: không dùng thuộc tính hoặc quy tắc của nhóm khác khi tạo/sửa sản phẩm.
- **Tắt business group không xóa dữ liệu**: chỉ chặn tạo/bán mới theo policy; lịch sử, tồn, chứng từ và Sổ tay vẫn truy xuất được.
- **Thuốc BVTV/thuốc thú y** phải tách HSD, lô, recall và quy tắc cảnh báo; PHI/REI không được dùng thay cho thời gian ngưng thuốc.
- **Cây giống/con giống** có hao hụt sinh học riêng; chết/loại/cách ly phải có adjustment reason và audit.
- **Thức ăn/phân bón** có quy tắc chất lượng/lô riêng; không suy diễn là thuốc chỉ vì được tư vấn trong cùng một màn hình.
- **Sổ tay theo domain** phải liên kết đúng loài/cây/bệnh/sản phẩm; gợi ý chỉ là đề xuất, người bán xác nhận trước khi thêm vào đơn.

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

## 20.1 Thủy sản — future business group

Thủy sản không thuộc 5 business group selectable của Phase 1. Thiết kế dự kiến là một nhóm
độc lập `AQUACULTURE`, gồm `AQUA_DRUG`, `AQUA_FEED` và `AQUA_SEED`; không gộp vào Thuốc thú
y, Thức ăn chăn nuôi hoặc Con giống. Chi tiết thuộc tính, tồn theo lô/số lượng/biomass,
hao hụt, điều kiện nước và Sổ tay thủy sản xem `docs/core-business-catalog.md` §10.

Mở rộng này sẽ làm sau khi 5 nhóm Phase 1 ổn định; multi-warehouse, quản lý ao và telemetry
chất lượng nước không nằm trong phạm vi hiện tại.

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
- **Sổ tay nâng cao**: AI / ảnh chụp; chia sẻ Sổ tay; nhắc lịch phun. Phase 1 pilot đã
  phải có bệnh → thuốc, tồn kho thật và snapshot tư vấn; fallback 2 lớp là Phase 1.1 —
  xem `handbook.md`.

### Kết nối nhà sản xuất và nền tảng Farm (ngoài pilot)

- Chỉ triển khai sau khi có consent, data governance và tenant opt-in.
- Dữ liệu chia sẻ phải aggregate/ẩn danh, có ngưỡng tối thiểu theo vùng để tránh suy ra
  một đại lý hoặc hộ dân.
- Cổng nhà sản xuất ưu tiên báo cáo sell-through theo SKU/nhóm hàng/vùng, tồn kho tổng
  hợp và xu hướng bệnh; không bán dữ liệu giao dịch thô.
- Farm marketplace chỉ gợi ý đại lý gần vị trí nông dân khi đại lý opt-in và cho phép
  hiển thị tồn kho; không coi đây là capability của trial.

---

# 21. Sổ tay và Context tư vấn — tóm tắt và nguồn sự thật

> Ma trận Sổ tay theo cây, bệnh, vật nuôi, thức ăn, thuốc thú y, con giống và Thủy sản tương
> lai đã tách sang [`core-business-catalog.md`](./core-business-catalog.md). `docs/handbook.md`
> tiếp tục giữ chi tiết luồng tư vấn bệnh → sản phẩm và context snapshot.

Sổ tay là lớp tri thức khác biệt của NomoGreen. Nó không chỉ là danh sách bệnh, mà là cầu
nối giữa **đối tượng thực tế → vấn đề/bệnh → sản phẩm phù hợp → tồn kho → tư vấn tại quầy**.
Chi tiết nền hiện có ở `docs/handbook.md`; các quy tắc dưới đây là contract bắt buộc khi mở
rộng theo 5 nhóm xương sống.

## 21.1 Mô hình chung

Mỗi entry Sổ tay có:

- Business group và product kind áp dụng.
- Đối tượng: cây, giống cây, loài vật, giống vật, giai đoạn.
- Tên vấn đề/bệnh, alias, triệu chứng đời thường.
- Điều kiện nhận biết và câu hỏi tư vấn tùy chọn.
- Sản phẩm ghim thủ công.
- Hoạt chất/tag match tự động nếu có.
- Ghi chú Owner và cảnh báo an toàn.
- Lịch sử cập nhật, tenant scope và quyền chỉnh sửa.

Sổ tay không được tự động thêm hàng vào giỏ. Hệ thống chỉ gợi ý; người bán phải xác nhận.

## 21.2 Sổ tay cho Thuốc BVTV + Phân bón

### BVTV

```text
Cây trồng → sâu/bệnh/triệu chứng
  → hoạt chất hoặc thuốc được ghim
  → thuốc BVTV còn hàng, chưa hết hạn/thu hồi
  → PHI/REI + liều ghi chú
```

Trường hỏi có thể gồm cây, giai đoạn, diện tích, số lần phun, lượng nước. Kết quả chỉ trả
`PESTICIDE`, không trả phân bón như thuốc điều trị.

### Phân bón

```text
Cây trồng → giai đoạn/triệu chứng dinh dưỡng → diện tích
  → nhóm NPK/vi lượng/cách bón
  → phân bón phù hợp đang còn hàng
```

Sổ tay có thể gợi ý phân bón theo cây/giai đoạn/diện tích, nhưng phải phân biệt “gợi ý dinh
dưỡng” với “thuốc trị sâu bệnh”. Không dùng hoạt chất/PHI/REI cho entry phân bón.

## 21.3 Sổ tay cho Cây giống

Entry có thể theo:

- Cây trồng và giống.
- Mùa vụ, vùng, thời điểm xuống giống.
- Hạt giống hoặc cây con/cây ghép.
- Tuổi cây, kích thước bầu, tiêu chuẩn cây đạt.
- Tỷ lệ nảy mầm hoặc tỷ lệ sống.
- Mật độ và diện tích để tính số lượng tham khảo.
- Cách bảo quản/vận chuyển.

Luồng tư vấn:

```text
Loại cây/giống → mùa vụ/diện tích → hạt hay cây con
  → số lượng tham khảo → tồn lô phù hợp → người bán xác nhận
```

Không dùng Sổ tay cây giống để gợi ý thuốc nếu người dùng chưa chuyển sang vấn đề/bệnh.

## 21.4 Sổ tay cho Thức ăn chăn nuôi

Entry có thể theo:

- Loài vật, giống hoặc nhóm vật nuôi.
- Giai đoạn: con non, cai sữa, sinh trưởng, vỗ béo, sinh sản, đẻ trứng.
- Số con, cân nặng trung bình, số ngày dùng.
- Mục tiêu dinh dưỡng hoặc tình trạng đàn.
- Loại cám, đạm, năng lượng, dạng viên/bột.

Luồng tư vấn:

```text
Loài + giai đoạn + quy mô đàn
  → nhu cầu thức ăn tham khảo
  → sản phẩm FEED đang còn hàng
  → số bao tham khảo, người bán chỉnh tay
```

Nếu người dùng mô tả bệnh, Sổ tay phải chuyển sang nhánh thuốc thú y thay vì coi thức ăn
là thuốc.

## 21.5 Sổ tay cho Thuốc thú y

Entry có thể theo:

- Loài vật, giống và giai đoạn.
- Bệnh/tình trạng, triệu chứng, mức độ.
- Số con mắc, tổng đàn, cân nặng trung bình.
- Thuốc đã dùng, chống chỉ định hoặc lưu ý.
- Hoạt chất, liều/kg, đường dùng, số ngày.
- Thời gian ngưng thịt/sữa/trứng.

Luồng tư vấn:

```text
Loài + triệu chứng/bệnh + số con/cân nặng
  → thuốc thú y phù hợp
  → kiểm tra tồn/HSD/recall
  → hiển thị liều và withdrawal
  → người bán xác nhận và lưu snapshot
```

Sổ tay không thay thế chẩn đoán thú y chuyên môn. Nội dung Owner nhập phải được hiển thị như
ghi chú tư vấn, không trình bày như chứng nhận pháp lý hoặc chỉ định tuyệt đối.

## 21.6 Sổ tay cho Con giống

Entry có thể theo:

- Loài/giống, tuổi, giới tính, kích thước.
- Tiêu chuẩn con giống đạt.
- Lịch tiêm phòng, tình trạng sức khỏe, cách ly.
- Nguồn giống và lô.
- Quy mô đàn, điều kiện chuồng trại, thức ăn khởi đầu.
- Bệnh thường gặp và liên kết sang thuốc thú y.

Luồng tư vấn:

```text
Loài/giống + quy mô nuôi + mục đích
  → chọn lô con giống đủ điều kiện
  → kiểm tra số con và tình trạng
  → gợi ý thức ăn/thuốc liên quan nếu có
  → bán và lưu snapshot lô/tuổi/tình trạng
```

Con giống không có HSD như thuốc. Sổ tay phải dựa trên tuổi, chất lượng, sức khỏe và điều
kiện xuất bán.

## 21.7 Ma trận Handbook và sản phẩm

| Domain Sổ tay | Được gợi ý trực tiếp | Không được gợi ý nhầm |
|---|---|---|
| Cây/sâu/bệnh | `PESTICIDE`, `FERTILIZER` khi là vấn đề dinh dưỡng | Thuốc thú y, cám |
| Hạt/cây con | `SEED`, `SEEDLING` | Thuốc như sản phẩm giống |
| Đàn/giai đoạn/dinh dưỡng | `FEED` | Thuốc điều trị nếu chưa có bệnh |
| Bệnh vật nuôi | `VET_DRUG` | BVTV, phân bón |
| Chọn con giống | `LIVESTOCK_SEED` | Sản phẩm đã chết/cách ly/loại |

## 21.8 Context tư vấn trên đơn

Context phải lưu snapshot tại thời điểm bán:

- Business group/product kind.
- Đối tượng và bệnh/vấn đề.
- Các câu trả lời đã nhập.
- Sản phẩm được gợi ý và sản phẩm người bán thực sự chọn.
- Công thức/số lượng tham khảo nếu có.
- Cảnh báo đã hiển thị: PHI/REI/withdrawal/HSD.
- Lô xuất nếu feature batch bật.

Đơn Completed không sửa context. Nếu Sổ tay hoặc sản phẩm thay đổi về sau, lịch sử đơn vẫn
phải đọc được theo dữ liệu snapshot cũ.

---

# 22. Definition of Done cho pilot đại lý

Một release chỉ được đưa cho pilot khi có bằng chứng tối thiểu:

- Không còn dữ liệu mock trên luồng Product, Inventory, Debt và Handbook chính.
- Mỗi luồng có API tenant-scoped, permission/feature enforcement, audit phù hợp và test
  happy path + cross-tenant denial.
- Công nợ: tạo đơn ghi nợ → xem số dư → tạo phiếu thu → tạo/đọc notification đến hạn.
- HSD: nhập hai batch khác hạn → cảnh báo 180/90/30 ngày → chặn bán batch hết hạn/recall.
- Sổ tay: tạo/sửa bệnh → ghim thuốc → lọc theo tồn kho thật → hoàn tất đơn có snapshot
  bệnh/context.
- Trial: tạo 90 ngày → nhắc trước hạn → hết hạn → read-only/renew → không mất dữ liệu.
- Có receipt kiểm thử, số liệu sử dụng pilot và người chịu trách nhiệm hỗ trợ từng Tenant.
