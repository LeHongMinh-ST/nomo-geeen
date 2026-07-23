# Audit Catalog → Codebase — 2026-07-22

> Đối chiếu `docs/core-business-catalog.md` (5 nhóm Phase 1 + AQUACULTURE-future) với codebase hiện tại.
> Ngày: 2026-07-22 · Phạm vi: backend (`prisma/schema.prisma`, `src/platform/**`), frontend (`lib/navigation.ts`, `components/app/**`).

## 1. Tóm tắt một dòng

**Schema có nền tảng chung** (Product/Stock/Sale/Purchase) nhưng **không có taxonomy `BusinessGroup` chuẩn**, `ProductKind` lệch hợp đồng, không validate theo kind ở bất kỳ layer nào, không có báo cáo, không có StockAdjustment, không có audit log nghiệp vụ, Sổ tay mới ở phase `tasks`.

## 2. Trạng thái theo 4 trục

### 2.1 Product + Tenant — 0 ✅ / 3 ⚠️ / 3 ❌

| # | Item | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | 5 BusinessGroup enum (CROP_INPUTS/CROP_SEEDLINGS/ANIMAL_FEED/VETERINARY_DRUGS/LIVESTOCK) | ❌ | Schema dùng `AgriDomain {CROP/LIVESTOCK/AQUACULTURE/GENERAL}` (`backend/prisma/schema.prisma:642-647`) |
| 2 | ProductKind enum (`PESTICIDE,FERTILIZER,SEED,SEEDLING,FEED,VET_DRUG,LIVESTOCK_SEED`) | ⚠️ | Có `PESTICIDE/FERTILIZER/VET_DRUG/LIVESTOCK_SEED`; thiếu `SEED/SEEDLING/FEED`; có legacy `CROP_SEED/ANIMAL_FEED/AGRI_MATERIAL/OTHER/AQUA_*` (`schema.prisma:649-661`) |
| 3 | Tenant `enabled_business_groups` | ❌ | Field không tồn tại; menu FE tĩnh (`frontend/lib/navigation.ts:55-96`); BE không filter |
| 4 | Form Product chọn `product_kind` trước → attrs theo kind + BE re-validate | ❌ | `CreateProductDto` không có `productKind`/`attrs`/`businessGroup` (`products/dto/create-product.dto.ts:12-58`) |
| 5 | Common fields (SKU, barcode, brand, manufacturer, supplier, 3-tier price, lifecycle flags, soft delete) | ⚠️ | Schema đầy đủ, CRUD SKU/tên/barcode/giá cơ bản hoạt động; thiếu API cập nhật `Active/Recalled/attrs`, `nameSearch` không được build, `priceTiers` FE không gửi |
| 6 | Unit + conversion (Base Unit + PURCHASE/SALE/BOTH, không chain) | ⚠️ | Schema + service purchase/sale đúng; FE thiếu nhập `SALE`; Product CRUD không nhận conversion; không enforce rule theo kind |

### 2.2 Kho + Nhập — 3 ✅ / 11 ⚠️ / 22 ❌

| # | Item | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | `stock.qty` per Tenant/Warehouse/Product ở Base Unit | ✅ | `Stock.qty Decimal(18,6)` + `@@unique([warehouseId, productId])` (`schema.prisma:1037-1052`) |
| 2 | Không tồn âm ở sale | ✅ | `stock.updateMany({ qty: { gte: qtyBase }})` (`sales.service.ts:580-584`) |
| 3 | IN/OUT movement append-only trong transaction | ⚠️ | Có PURCHASE_IN, SALE_OUT, SALE_CANCEL; thiếu PURCHASE_RETURN/SALE_RETURN/ADJUSTMENT |
| 4 | Batch = tổng các `ProductBatch.qtyOnHand` | ❌ | `ProductBatch.qtyOnHand` không bao giờ được cập nhật khi nhập |
| 5 | FEFO mặc định khi có HSD | ❌ | View sort `expiresAt`; sale decrement `stock.qty` không chọn batch |
| 6 | `SaleLineBatch`/sale-to-lot traceability | ❌ | Model có, code không ghi |
| 7 | Chặn batch hết hạn/thu hồi/bảo quản sai khi bán | ❌ | Sale chỉ check `Product.isLocked/isRecalled`, không query `ProductBatch` |
| 8 | Per-kind inbound required fields (lô/HSD/dạng thuốc/tuổi cây/số con) | ❌ | DTO generic; `productKind` không được đọc ở purchase service |
| 9 | Cảnh báo 180/90/30 ngày | ❌ | `NotificationType.NEAR_EXPIRED` có enum, không có emitter |
| 10 | StockAdjustment + reason taxonomy per nhóm | ❌ | Model + enum có, không có service/controller |
| 11 | SalesReturn + PurchaseReturn | ❌ | `SalesReturn` model có, không có route; spec sales-order `out_of_scope: "Sales returns"` |

### 2.3 Bán + Sổ tay — 4 ✅ / 7 ⚠️ / 21 ❌

| # | Item | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | Customer picker + debt-requires-customer | ✅ | `customer-picker.tsx` + `sales.service.ts:392-462` |
| 2 | Per-kind validation tại checkout (7 nhánh: PESTICIDE/FERTILIZER/SEED/SEEDLING/FEED/VET_DRUG/LIVESTOCK) | ❌ | Sale chỉ check `status/isLocked/isRecalled` chung; PHI/REI/withdrawal không gate. **→ Cập nhật 2026-07-23: xem §8.4 (⚠️ partial hard flags)** |
| 3 | Multi-group order, mỗi dòng validate theo kind | ⚠️ | Multi-line OK; multi-kind validate đều generic |
| 4 | Order Completed immutable | ⚠️ | Không có PUT/PATCH; thiếu test guard version; thiếu return route |
| 5 | Handbook entry: `business_group` / `product_kind` / `câu hỏi` / `metadata match` / `quyền` / `pinnedProducts` UI | ❌ | Schema `Disease` thiếu các field; form FE (`disease-form.tsx`) cắt gọn |
| 6 | 5 handbook domains (cây/sâu bệnh, hạt cây, thức ăn, bệnh vật nuôi, chọn con giống) | ❌ | `suggestProducts` mock trong `frontend/lib/handbook.ts`; không phân nhánh kind |
| 7 | Snapshot handbook trên đơn (diseaseNameSnapshot, consultContext, suggestedQtyMeta) | ❌ | Field schema có, `sales.service.ts` không ghi (`grep` 0 hit) |

### 2.4 Báo cáo + RBAC + Audit — tỉ lệ

| Khu vực | Tỉ lệ |
|---|---|
| Reports module + 8 endpoint | 0% |
| Per-group reports (6 nhóm) | 0% |
| RBAC (tenant resources) | 4/5 = 80% — thiếu `handbook:*` |
| Tenant isolation | 100% ✅ |
| `BusinessGroup` taxonomy + `enabled_business_groups` | 0% |
| Audit infrastructure | 100% ✅ |
| Audit coverage trên sale/purchase/inventory/product/handbook/deny | 0/6 = 0% |
| Audit query + UI admin | 100% ✅ |

## 3. Top 10 gap xếp theo tác động tới Phase 1

| # | Gap | Tác động | Cần chạm |
|---|---|---|---|
| **1** | **`BusinessGroup` enum + `enabled_business_groups` không tồn tại** — schema dùng `AgriDomain` (4 mã); `Tenant` không có field | Phase-1 blocker. Mọi menu/form/search/report theo nhóm chạy sai nhóm ngay từ đầu | Thêm enum `BusinessGroup`, cột `enabledBusinessGroups BusinessGroup[]` trên `Tenant` (hoặc `TenantSettings`), policy gate ở controller + FE menu |
| **2** | **`ProductKind` enum sai hợp đồng + CRUD không nhận kind** — `CROP_SEED` thay cho `SEED/SEEDLING`, `ANIMAL_FEED` thay cho `FEED`; `CreateProductDto` không có `productKind`/`businessGroup`/`attrs` | Phase-1 blocker. Mọi rule/form/snapshot theo kind đều generic | Sửa enum (`SEED/SEEDLING/FEED` thay `CROP_SEED/ANIMAL_FEED`); thêm field vào DTO; migration rename nếu đã seed |
| **3** | **`ProductBatch` không được tạo/cập nhật khi nhập + không có FEFO + không có sale-to-lot** | Phase-1 blocker. Traceability lô/HSD/truy xuất thuốc thú y = 0 | `purchase.complete` phải `tx.productBatch.upsert` + `qtyOnHand++`; sale phải FEFO-allocate batch + ghi `SaleLineBatch` |
| **4** | **Per-kind validation tại checkout vắng mặt** — sale chỉ check `status/isLocked/isRecalled`; không có nhánh PESTICIDE/FERTILIZER/SEED/SEEDLING/FEED/VET_DRUG/LIVESTOCK | Giá trị cốt lõi bị phá. Đây là điểm khác biệt sản phẩm mà catalog §1 nhấn mạnh | Thêm helper `assertSaleLineEligible(product, batch?)`; gọi ở `createOrder/quickSale`; trả 422 với mã lỗi per kind. **→ 2026-07-23 §8.4: hard flags + 3 path + re-complete ⚠️ partial** |
| **5** | **Per-group attributes chưa có field/validation** — PHI/REI, withdrawal_meat/milk/egg_days, NPK %, germination %, survival rate, livestock state machine | Sổ tay tư vấn sai liều/HSD; mất compliance | Thêm cột per kind (hoặc dùng `attrs JSON` + JSON Schema validate theo kind); thêm `LivestockBatch`/`LivestockIndividual` với state machine |
| **6** | **`StockAdjustment` + reason taxonomy per nhóm chưa có** — model có, không có service; `StockReason` enum generic | Không điều chỉnh được kho sau Completed; mất compliance audit §13 | Tạo `stock-adjustment` controller + reason vocabulary per kind (ẩm/mốc/vón/chết/bệnh/cách ly/…) |
| **7** | **Báo cáo §13 chưa tồn tại** — 0/8 endpoint, FE có link placeholder `/bao-cao` | Không vận hành được (HSD/công nợ/lãi); không đóng kỳ | Module `reports/` riêng; spec mới theo format EARS |
| **8** | **Audit log miss trên nghiệp vụ tenant** — sale/purchase/inventory/product/handbook + permission denials không ghi audit | Vi phạm compliance §13 ngay từ day-1; mất khả năng truy vết | Thêm `AuditAction` codes (PURCHASE_CREATE/COMPLETE, SALE_CREATE/COMPLETE/CANCEL, PRODUCT_UPDATE, HANDBOOK_UPDATE, PERMISSION_DENIED); wire vào service |
| **9** | **Handbook entry contract cắt gọn + spec `handbook-core-catalog` 0/10 tasks done** — thiếu `business_group/product_kind/câu hỏi/metadata match/quyền/pinnedProducts UI` | Không phân biệt được 5 domain; không pin sản phẩm | Bổ sung schema + FE form; chạy spec 10 task |
| **10** | **Snapshot handbook trên đơn không tồn tại** — `diseaseNameSnapshot/consultContext/suggestedQtyMeta` không ghi | Phá rule bất biến lịch sử §12 | Trong `completeOrder`, snapshot disease + consult answers + selected products + warnings + recipe + lot |

## 4. Khuyến nghị trình tự xây

### Phase A — Nền tảng taxonomy (1–2 tuần)
1. Sửa `BusinessGroup` enum (5 mã) + `enabledBusinessGroups` trên Tenant — gate menu/form/search
2. Sửa `ProductKind` enum (`SEED/SEEDLING/FEED`) + thêm `productKind/businessGroup/attrs` vào `CreateProductDto` + validate attrs per kind
3. Audit-log infrastructure: thêm codes + wire vào purchase/sale/inventory/service

### Phase B — Kho + lô (1–2 tuần)
4. Wire `ProductBatch` vào purchase complete (`tx.productBatch.upsert` + `qtyOnHand`)
5. FEFO allocation trong sale + ghi `SaleLineBatch`
6. Module `stock-adjustment` + reason vocabulary per kind

### Phase C — Nghiệp vụ chuyên ngành (2–3 tuần)
7. Per-kind validation ở checkout (PESTICIDE PHI/REI, VET_DRUG withdrawal, LIVESTOCK state machine, …)
8. Per-group attrs: PHI/REI/withdrawal/NPK/germination/survival + Livestock entity
9. SalesReturn/PurchaseReturn module (đang `out_of_scope` trong spec sales-order)

### Phase D — Sổ tay + Báo cáo (2 tuần)
10. Hoàn thiện `handbook-core-catalog` (10 task pending)
11. Snapshot handbook trên đơn Completed
12. Module `reports` + per-group reports

## 5. Câu hỏi chưa chốt

1. **`BusinessGroup` mới vs `AgriDomain` cũ** — thay enum + migrate data cũ, hay giữ `AgriDomain` và map sang `BusinessGroup` ở service layer? Có data `seed-demo` đang dùng `AgriDomain` chưa?
2. **`ProductKind` rename** — `CROP_SEED/ANIMAL_FEED` đã có data chưa? Nếu rồi → cần migration script + backfill; nếu chưa → rename sạch.
3. **`enabled_business_groups` drive bằng cột mới trên `Tenant` hay dùng `TenantFeatureFlag` đã có sẵn?**
4. **FEFO + sale-to-lot có cần chạy trong transaction sale (lock contention) hay làm background job?**
5. **`SalesReturn` + `StockAdjustment` mở spec mới, hay extend `tenant-sales-order-management` đang `out_of_scope`?**
6. **`handbook-core-catalog` spec 0/10 tasks** — chạy lại toàn bộ spec hay pick 3–4 task trọng tâm (entry contract + 2 domains + snapshot)?
7. **Module `reports` §13** — viết spec mới theo EARS (giống `admin-system-activity-audit`) hay implement trực tiếp từ catalog?
8. **Phase 1 chấp nhận scope hiện tại (generic stock + read-only batch view) theo scope_lock của `tenant-purchase-management`, hay bắt buộc đạt 100% catalog trước khi GA?**

## 6. Trạng thái spec liên quan

| Spec | Trạng thái | `out_of_scope` chính |
|---|---|---|
| `handbook-core-catalog` | 0/10 tasks done | (chưa chạy) |
| `tenant-product-management` | đã chạy | stock movement, purchase, sales, **batch**, inventory adjustment |
| `tenant-purchase-management` | đã chạy | multi-warehouse, FIFO |
| `tenant-sales-order-management` | đã chạy | sales returns |

→ Nhiều gap ở trên nằm trong `out_of_scope` hiện tại. Cần quyết định: **mở rộng scope các spec trên**, **mở spec mới** (Reports, StockAdjustment, Returns, Handbook core), hay **chấp nhận Phase 1 = generic**.

## 7. Phụ lục — Trạng thái per-nhóm Phase 1 (cross-reference catalog)

### Nhóm 1 — Thuốc BVTV + Phân bón (`CROP_INPUTS`)
- Schema: `PESTICIDE`, `FERTILIZER` có (✅ enum).
- Validate: ❌ chung.
- Thuộc tính đặc thù: ❌ PHI/REI (PESTICIDE), ❌ %N/P₂O₅/K₂O (FERTILIZER).
- Lô/HSD: ❌ batch không cập nhật khi nhập.
- Cảnh báo 180/90/30 ngày: ❌.

### Nhóm 2 — Cây giống (`CROP_SEEDLINGS`)
- Schema: ❌ `SEED`, `SEEDLING` không có; `CROP_SEED` thay thế.
- Validate: ❌ chung.
- Thuộc tính đặc thù: ❌ germination rate (SEED), survival rate/tuổi xuất bán (SEEDLING).
- Lô khác tuổi/chất lượng không gộp: ❌ (vì batch không cập nhật).

### Nhóm 3 — Thức ăn chăn nuôi (`ANIMAL_FEED`)
- Schema: ❌ `FEED` không có; `ANIMAL_FEED` thay thế.
- Validate: ❌ chung.
- Bao → kg: ✅ generic conversion.
- Lô + HSD + FEFO: ❌.
- Reason ẩm/mốc/vón/bao mở/hao hụt: ❌.

### Nhóm 4 — Thuốc thú y (`VETERINARY_DRUGS`)
- Schema: ✅ `VET_DRUG` có.
- Validate: ❌ chung.
- Thuộc tính đặc thù: ❌ withdrawal_meat/milk/egg_days tách riêng (catalog §8 yêu cầu tách, KHÔNG dùng PHI/REI).
- Lô + HSD + FEFO + sale-to-lot: ❌.

### Nhóm 5 — Con giống (`LIVESTOCK`)
- Schema: ✅ `LIVESTOCK_SEED` có.
- Validate: ❌ chung.
- State machine sống (AVAILABLE/QUARANTINED/HEALTHY/SELLABLE/SICK/DEAD/REJECTED): ❌ không có entity.
- Số con đủ điều kiện bán: ❌.
- Bán một phần đàn giữ nguồn/tuổi/sức khỏe: ❌.

### Nhóm 6 — Thủy sản (`AQUACULTURE`, future)
- Catalog mô tả, ngoài scope Phase 1.
- Schema: enum `AQUA_*` có nhưng là legacy, không theo cấu trúc `AQUA_DRUG/AQUA_FEED/AQUA_SEED`.
- Đánh dấu: `out_of_scope` cho Phase 1.

## 8. Re-audit sau khi chot BA — 2026-07-23

> Phan nay cap nhat ket qua audit 2026-07-22 sau khi chot lai gia tri cot loi. Cac ket luan ben tren la baseline lich su; khong dung cac dong ❌ cu de danh gia code hien tai.

### 8.1 Da cap nhat

| Hang muc | Trang thai moi | Bang chung |
|---|---|---|
| BusinessGroup | ✅ | Schema va contract da co `CROP_INPUTS` cung cac nhom mo rong; 6 loai crop-input map ve `CROP_INPUTS`. |
| 6 loai san pham crop-input theo BA | ✅ | `PESTICIDE`, `FERTILIZER`, `BIOLOGICAL_PRODUCT`, `GROWTH_REGULATOR`, `SOIL_AMENDMENT`, `AGRI_MATERIAL`. |
| Product CRUD nhan kind/group/attrs | ✅ | DTO va `product-contract.ts` da validate kind/group va attr bat buoc theo kind. |
| Migration catalog | ✅ | `backend/prisma/migrations/20260723150000_add_crop_input_product_kinds/migration.sql`. |
| Supplier/purchase/stock/sales/customer/dashboard fields | ⚠️ | Da ghi vao `docs/core-business-catalog.md` lam contract nghiep vu; UI/API/report chi la pham vi spec tiep theo. |

### 8.2 Con thieu, khong duoc danh dau da hoan tat

- Chua co day du form UI dong theo `productKind` cho cac truong BVTV/phan bon.
- Chua co report/dashboard aggregation theo top sau benh, cay trong, hoat chat, thuoc va phan bon.
- Chua co day du lich su tu van AI trong sale/customer.
- Cac gap kho, FEFO, audit nghiep vu va StockAdjustment van can danh gia theo code hien tai/spec rieng; khong xoa ket luan baseline neu chua co bang chung moi.
- Checkout: **chua** 7 nhanh hard-rule rieng theo kind (PESTICIDE/FERTILIZER/SEED/…), **chua** PHI/REI/withdrawal hard theo harvest/event date, **chua** livestock state machine, **chua** FE hien PHI, **chua** audit log deny sale (xem §8.4).

### 8.3 Verification (catalog foundation)

- `pnpm --dir backend exec prisma validate`: PASS.
- `pnpm --dir backend build`: PASS.
- `pnpm --dir backend test -- --runInBand src/platform/products/product-contract.spec.ts`: PASS, 6/6.
- `docs/.sync_hash` da chot: `a6bbd840956a8c2c759b8aef42fd8aa77afee799`.

### 8.4 Re-audit checkout sale gates — 2026-07-23 (gap #4 / Phase C item 7)

> Cap nhat sau spec `specs/sale-checkout-kind-gates/` (R0-01 + R1-01 + R1-02 done).
> Baseline §2.3 #2 va Top10 #4 (❌ «chi check status/isLocked/isRecalled chung») la **lich su 2026-07-22**. Danh gia hien tai dung bang duoi, khong dung ❌ cu de claim «van 0 gate».

#### Trang thai moi (doi chieu business catalog §4.1 lifecycle + §11.3 ban)

| Hang muc (audit gap #4) | Trang thai | Bang chung |
|---|---|---|
| Pure sale eligibility policy (hard flags) | ✅ | `backend/src/platform/sales/sale-eligibility-policy.ts` — `assertProductSaleEligible`, reasons `PRODUCT_UNSELLABLE` / `PRODUCT_LOCKED` / `PRODUCT_RECALLED` / `PRODUCT_INACTIVE` |
| Wire `createOrder` truoc persist line | ✅ | `sales.service.ts` goi policy trong product loop |
| Wire `createQuickSale` truoc tru ton | ✅ | cung service, truoc stock mutation |
| Re-check tren `complete` (khong tin DRAFT-only) | ✅ | `completeInTransaction` select `status/isLocked/isRecalled/productKind/attrs` + assert truoc FEFO/stock |
| 422 structured (`reason` + `field` + optional `productKind`) | ✅ | `UnprocessableEntityException` body; unit + service deny tests |
| Khong bypass FEFO / `resolveSaleAllocations` | ✅ | Order: eligibility → FEFO → stock (giu Phase B) |
| Multi-line: moi dong assert | ✅ | map/for line |
| Tenant-scoped product load | ✅ | `product.findMany({ where: { tenantId, … }})` |
| PHI/REI/withdrawal **advisory extract** (attrs) | ⚠️ | `extractSaleAdvisories` + unit tests; **khong** bat buoc HTTP DTO / FE POS (dung non-goal slice) |
| PHI/REI hard theo ngay thu hoach | ❌ | `out_of_scope` (can harvest/event date) — catalog display-first |
| 7 nhanh hard-rule rieng theo ProductKind | ❌ | Design: hard = flags; kind khong invent hard reject them (livestock SM / kind-only rules deferred) |
| Livestock: khong ban con benh/cach ly/loai | ❌ | State machine van gap Top10 #5 / § nhom 5 |
| FE map full reason codes | ⚠️ | Runtime throw LOCKED/RECALLED/INACTIVE; `QuickSaleApiErrorReason` DTO van chu yeu legacy `PRODUCT_UNSELLABLE` |
| Tenant audit log SALE_DENY / COMPLETE | ❌ | `out_of_scope` feature; Top10 #8 van mo |

#### Tom tat business

- **Da dong:** lo an toan **hard flags** tren 3 path ban (order create / complete / quick) — khong ban inactive/locked/recalled; complete re-load flags (risk mid-DRAFT recall).
- **Chua dong (Phase C con lai):** 7 nhanh kind day du, PHI calendar hard, livestock SM, FE PHI UI, audit log deny, returns.

#### Mapping baseline → hien tai

| Baseline (2026-07-22) | Sau 2026-07-23 |
|---|---|
| §2.3 #2 Per-kind validation checkout ❌ | **⚠️ partial** — hard flags + 3 path + re-complete ✅; kind-branch + PHI hard ❌ |
| Top10 #4 Per-kind validation checkout ❌ | **⚠️ partial** (cung pham vi) |
| Phase C #7 «Per-kind validation o checkout» | **mot phan** — flags gate ship; kind/PHI deep van open |

#### Verification (sale-checkout-kind-gates)

```bash
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sale-eligibility-policy.spec.ts
pnpm --dir backend test --runInBand --runTestsByPath src/platform/sales/sales.service.spec.ts
pnpm --dir backend build
```

- Policy: 12/12 PASS · Service: 71/71 PASS · build: exit 0.
- Receipt: `specs/sale-checkout-kind-gates/reports/verification-receipt.md`.
- Spec tasks R0-01 / R1-01 / R1-02: `done`.
