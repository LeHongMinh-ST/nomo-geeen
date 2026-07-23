# Danh mục nghiệp vụ xương sống NomoGreen

> Tài liệu phân tích chuẩn cho Product, Kho, Nhập hàng, Bán hàng và Sổ tay.
> Phase 1 dùng 5 nhóm kinh doanh cốt lõi. Thủy sản được thiết kế cho giai đoạn sau và
> không xuất hiện trong danh mục lựa chọn của Phase 1.

## 1. Vì sao danh mục này là điểm khác biệt của sản phẩm

NomoGreen không phải phần mềm quản lý kho và bán hàng tổng quát. Cùng là một “sản phẩm”
nhưng mỗi ngành hàng có thực tế vận hành khác nhau:

- thuốc bảo vệ thực vật có hoạt chất, HSD, PHI/REI và rủi ro thu hồi;
- phân bón có công thức dinh dưỡng, thường bán theo bao hoặc kg;
- cây giống là hàng sống, có thể chết trước khi bán;
- thức ăn phụ thuộc loài vật và giai đoạn sinh trưởng, có thể hư hỏng;
- thuốc thú y có liều dùng và thời gian ngưng thuốc;
- con giống là tài sản sống, phải theo dõi con, lô, tuổi, sức khỏe và hao hụt.

Vì vậy hệ thống dùng 3 tầng:

```text
Nhóm kinh doanh
  → Loại sản phẩm kỹ thuật
    → Danh mục riêng của cửa hàng
      → Thuộc tính, chính sách kho, chứng từ và Sổ tay
```

`Business Group` là taxonomy ổn định của hệ thống. `Product Kind` quyết định form, thuộc
tính và nghiệp vụ. `Category` là nhãn riêng của cửa hàng để sắp xếp kệ/báo cáo, không được
thay đổi quy tắc kỹ thuật.

## 2. Năm nhóm kinh doanh Phase 1

| Mã | Tên tiếng Việt | Product Kind | Bản chất vận hành |
|---|---|---|---|
| `CROP_INPUTS` | Thuốc bảo vệ thực vật + Phân bón | `PESTICIDE`, `FERTILIZER` | Bảo vệ và dinh dưỡng cây trồng |
| `CROP_SEEDLINGS` | Cây giống | `SEED`, `SEEDLING` | Hạt giống và cây sống |
| `ANIMAL_FEED` | Thức ăn chăn nuôi | `FEED` | Dinh dưỡng theo loài/giai đoạn |
| `VETERINARY_DRUGS` | Thuốc thú y | `VET_DRUG` | Điều trị theo loài/bệnh/liều/ngưng thuốc |
| `LIVESTOCK` | Con giống | `LIVESTOCK_SEED` | Con sống theo số lượng/lô/tuổi/sức khỏe |

Nhóm đầu tiên là một nhãn kinh doanh chung nhưng có 2 loại kỹ thuật. Không được triển khai
thành một `Product Kind` duy nhất khiến thuốc BVTV và phân bón dùng chung một form.

## 3. Mô hình cửa hàng chuyên biệt và đa nhóm

Tenant có thể bật một hoặc nhiều nhóm qua `enabled_business_groups`.

| Mô hình | Nhóm bật | Trọng tâm vận hành |
|---|---|---|
| Đại lý vật tư tổng hợp | Cả 5 nhóm | Tìm kiếm liên nhóm, bán chung, dashboard theo nhóm |
| Cửa hàng cây trồng | `CROP_INPUTS`, `CROP_SEEDLINGS` | Cây, mùa vụ, diện tích, bệnh, dinh dưỡng |
| Cửa hàng chăn nuôi | `ANIMAL_FEED`, `VETERINARY_DRUGS`, `LIVESTOCK` | Đàn, loài, giai đoạn, sức khỏe, thức ăn |
| Vườn ươm | `CROP_SEEDLINGS` | Lô giống, tuổi cây, tỷ lệ sống, giao cây |
| Cửa hàng cám/thú y | `VETERINARY_DRUGS`, `ANIMAL_FEED` | Bệnh, liều, thời gian ngưng, giai đoạn ăn |

Quy tắc:

- Bật nhóm chỉ thay đổi menu, tìm kiếm và form mặc định; không tạo schema riêng.
- Tắt nhóm chỉ chặn tạo mới hoặc chọn bán theo policy; không xóa sản phẩm, tồn, chứng từ,
  Sổ tay hoặc snapshot lịch sử.
- Cửa hàng có thể bật thêm nhóm sau này mà không phải viết lại dữ liệu cũ.
- Hiển thị nhóm không thay thế quyền. Các quyền `product:*`, `inventory:*`, `purchase:*`,
  `sales:*`, `handbook:*` vẫn phải tenant-scoped và theo vai trò.
- Một đơn có thể có sản phẩm từ nhiều nhóm, nhưng từng dòng phải validate theo `Product Kind`
  và chính sách tồn riêng.

## 4. Hợp đồng chung của Product

### 4.1 Trường chung

Mọi Product có:

- `business_group`, `product_kind`;
- SKU, tên, tên tìm kiếm đã chuẩn hóa, barcode nếu có;
- danh mục phụ, nhãn hiệu, nhà sản xuất, nhà cung cấp mặc định;
- Base Unit, quy cách, khối lượng/thể tích tịnh, quy đổi nhập/bán;
- giá vốn, giá lẻ, giá sỉ, giá riêng theo khách nếu có;
- Active/Inactive, Locked, Recalled, soft delete;
- số đăng ký/chứng nhận nếu loại hàng cần;
- `attrs` được validate theo `product_kind`.

Form Product phải chọn `product_kind` trước rồi mới hiển thị thuộc tính. Backend phải validate
lại; việc ẩn field ở frontend không phải cơ chế bảo vệ dữ liệu.

### 4.2 Đơn vị và quy đổi

Kho lưu theo Base Unit, còn nhập/bán có thể dùng đơn vị khác:

```text
1 Thùng = 12 Chai
1 Bao   = 50 Kg
```

Mỗi dòng phải lưu cả số lượng giao dịch và số lượng sau quy đổi. Conversion có hướng
`PURCHASE`, `SALE` hoặc `BOTH`; không cho phép chuỗi quy đổi nhiều bước khó audit.

| Nhóm | Đơn vị thường gặp | Quy tắc riêng |
|---|---|---|
| Vật tư cây trồng | Chai, gói, bao, kg, lít | Phân bón bán kg; thuốc giữ nguyên quy cách |
| Cây giống | Gói, kg, hạt, cây, bầu, khay | Cây sống không quy đổi sang kg |
| Thức ăn | Bao, kg, tấn | Bao → kg là quy đổi phổ biến |
| Thuốc thú y | Chai, lọ, gói, viên, ml, g | Tách đơn vị liều và đơn vị bán |
| Con giống | Con, đàn, kg | Cân nặng bổ sung, không thay số con |

## 5. Nhóm 1 — Thuốc bảo vệ thực vật + Phân bón

### 5.1 Thuốc bảo vệ thực vật (`PESTICIDE`)

Thuộc tính:

- hoạt chất, hàm lượng, dạng thuốc `EC`, `WP`, `SC`, `SL`, `GR`;
- công dụng: trừ sâu, trừ bệnh, trừ cỏ, điều hòa sinh trưởng;
- cây trồng, sâu/bệnh mục tiêu, nhóm độc, số đăng ký;
- PHI — thời gian cách ly trước thu hoạch;
- REI — thời gian được vào lại khu vực phun;
- liều dùng, quy cách, nhà sản xuất, bảo quản/an toàn.

Kho và nhập hàng:

- Lô, ngày sản xuất, HSD, thu hồi và khóa bán là dữ liệu chính thức.
- Cùng SKU nhưng khác lô phải tồn riêng để truy xuất.
- Mặc định xuất FEFO nếu có hạn sử dụng.
- Lô hết hạn, thu hồi hoặc khóa không được bán.
- Cảnh báo ở mốc 180/90/30 ngày.

Bán hàng và Sổ tay:

- Tìm/gợi ý theo cây, pest tag, hoạt chất và thuốc Owner ghim.
- Hiển thị PHI/REI và ghi chú liều khi có.
- Sổ tay chỉ gợi ý hàng hợp lệ, không tự động thêm vào giỏ.

### 5.2 Phân bón (`FERTILIZER`)

Thuộc tính:

- loại: NPK, đạm, lân, kali, hữu cơ, vi sinh, trung/vi lượng;
- `%N`, `%P₂O₅`, `%K₂O`, Ca/Mg/S và vi lượng;
- dạng hạt, bột, nước, viên;
- cách dùng: bón gốc, phun lá, tưới;
- cây/giai đoạn phù hợp, hàm lượng hữu cơ, quy cách.

Phân bón không dùng PHI/REI hoặc thuộc tính bệnh/hoạt chất điều trị của thuốc BVTV.

Kho và nhập hàng:

- Hỗ trợ bao, kg, tấn, chai, lít; bao 50kg có thể bán theo kg.
- Có thể quản lý lô, ngày sản xuất, HSD nếu nhà sản xuất cung cấp.
- Có lý do riêng cho ẩm, vón cục, rách bao và giảm chất lượng.

Sổ tay phân bón tư vấn theo cây, giai đoạn, diện tích và nhu cầu dinh dưỡng; không trình bày
phân bón như thuốc trị sâu bệnh.

## 6. Nhóm 2 — Cây giống

Phải phân biệt hạt giống và cây sống; không chỉ đổi tên `CROP_SEED` thành Cây giống.

### 6.1 Hạt giống (`SEED`)

Thuộc tính: cây, giống, mùa vụ, vùng, khối lượng/số hạt, lô, ngày đóng gói, tỷ lệ nảy mầm,
độ thuần, hạn/thời hạn gieo và hướng dẫn bảo quản.

Kho lưu theo gói, kg hoặc hạt. Hàng ẩm/mốc có adjustment reason riêng. Chỉ bán tách gói khi
có conversion đáng tin cậy.

### 6.2 Cây con/cây ghép (`SEEDLING`)

Thuộc tính: loài, giống, tuổi, ngày gieo/ghép, chiều cao, bầu/khay, giai đoạn, tình trạng rễ,
tỷ lệ sống, vườn ươm, lô và điều kiện vận chuyển.

Kho lưu theo cây, bầu, khay hoặc lô. Không có HSD cứng như thuốc mà có tuổi xuất bán tối ưu.
Cây chết, cây loại, hao hụt chăm sóc phải là adjustment reason riêng. Không gộp lô khác tuổi
hoặc chất lượng nếu mất truy xuất.

Sổ tay cây giống tư vấn giống, mùa vụ, mật độ, diện tích và số lượng; bệnh phát sinh phải
chuyển sang nhánh thuốc/phân phù hợp.

## 7. Nhóm 3 — Thức ăn chăn nuôi (`ANIMAL_FEED`)

Thuộc tính: thức ăn hoàn chỉnh/đậm đặc/premix/thô; loài; giai đoạn; dạng viên/bột/mảnh; đạm,
năng lượng, ẩm, xơ, thành phần, quy cách và bảo quản.

Kho và nhập hàng:

- Tồn theo bao/kg/tấn, hỗ trợ bao → kg.
- Quản lý lô và HSD, ưu tiên FEFO.
- Có reason cho ẩm, mốc, vón, bao mở và hao hụt.
- Bao đã chia nhỏ phải giữ lô gốc.

Bán hàng và Sổ tay:

- Tư vấn theo loài, số con, giai đoạn, cân nặng và số ngày dùng.
- Số bao đề xuất chỉ là tham khảo và được chỉnh tay.
- Nếu khách mô tả bệnh, chuyển sang Sổ tay thuốc thú y; không coi thức ăn là thuốc.

## 8. Nhóm 4 — Thuốc thú y (`VETERINARY_DRUGS`)

Thuộc tính: hoạt chất, hàm lượng, dạng tiêm/uống/bôi/nhỏ/trộn, loài, chỉ định, bệnh, liều/kg,
đường dùng, thời gian điều trị, số đăng ký, bảo quản và quy cách.

Thời gian ngưng phải tách riêng:

- `withdrawal_meat_days`;
- `withdrawal_milk_days`;
- `withdrawal_egg_days`.

Không dùng PHI/REI của cây trồng cho thuốc thú y.

Kho cần lô, HSD, thu hồi, bảo quản và FEFO. Thuốc hết hạn, thu hồi hoặc bảo quản sai không
được bán. Sale-to-lot traceability phục vụ xử lý sự cố.

Sổ tay hỏi loài, số con mắc, tổng đàn, cân nặng, triệu chứng và thuốc đã dùng; gợi ý theo
bệnh → loài → hoạt chất → thuốc hợp lệ; hiển thị liều và thời gian ngưng.

## 9. Nhóm 5 — Con giống (`LIVESTOCK`)

Thuộc tính: loài, giống, giới tính, tuổi/ngày sinh, cân nặng, nguồn/lô, ngày nhập, sức khỏe,
tiêm phòng, cách ly, giai đoạn, số con và mã cá thể khi cần.

Trạng thái sống:

```text
AVAILABLE → QUARANTINED → HEALTHY/SELLABLE
          ↘ SICK / DEAD / REJECTED
```

Kho phải theo dõi số con thực tế và số con được phép bán. Chết, bệnh, loại, cách ly và trả
nguồn giống là reason riêng. Không dùng HSD thuốc; thay bằng tuổi, giai đoạn, sức khỏe và
điều kiện xuất bán.

Bán theo con, đàn hoặc kg. Không bán con đang cách ly, bệnh hoặc bị loại. Bán một phần đàn
phải tách lô nhưng giữ nguồn, tuổi và dữ liệu sức khỏe.

Sổ tay tập trung vào giống, tuổi, tiêu chuẩn, tiêm phòng, bệnh thường gặp và liên kết sang
thuốc thú y/thức ăn. Không dùng logic hoạt chất BVTV.

## 10. Nhóm 6 — Thủy sản, làm sau (`AQUACULTURE`)

Thủy sản là một business group độc lập trong tương lai, không gộp vào Thuốc thú y, Thức ăn
chăn nuôi hoặc Con giống. Ba Product Kind dự kiến:

| Mã | Ý nghĩa |
|---|---|
| `AQUA_DRUG` | Thuốc hoặc chế phẩm xử lý cho tôm/cá |
| `AQUA_FEED` | Thức ăn theo loài, cỡ, giai đoạn và điều kiện nước |
| `AQUA_SEED` | Giống tôm/cá theo loài, cỡ, tuổi và lô |

### 10.1 Thuốc/chế phẩm thủy sản

Thuộc tính dự kiến: hoạt chất, hàm lượng, loài, bệnh/tác nhân, liều theo thể tích ao/sinh
khối/nước, thời gian xử lý, độ mặn, pH, nhiệt độ, lô, HSD, thu hồi và bảo quản.

Sổ tay:

```text
Tôm/cá + triệu chứng ao + điều kiện nước
  → bệnh/tác nhân
  → chế phẩm phù hợp
  → liều theo ao/sinh khối
  → kiểm tra tồn, lô, HSD
```

Không lấy liều thuốc thú y trên cạn áp cho thủy sản.

### 10.2 Thức ăn thủy sản

Thuộc tính dự kiến: loài, cỡ, giai đoạn, kích thước viên, protein/năng lượng, độ bền trong
nước, tỷ lệ cho ăn, nhiệt độ/độ mặn, bao, lô và HSD.

Sổ tay dùng loài, sinh khối, diện tích/thể tích ao, giai đoạn ăn và điều kiện nước. Báo cáo
không gộp với thức ăn chăn nuôi trên cạn vì đơn vị tiêu thụ và kinh tế khác nhau.

### 10.3 Giống thủy sản

Thuộc tính dự kiến: loài, dòng, tuổi, cỡ, số lượng, trại giống, lô, tình trạng thuần nước,
ngưỡng nhiệt độ/độ mặn, tỷ lệ sống và mật độ thả.

Kho cần theo dõi số lượng, bao/bể nếu có, tỷ lệ sống, hao hụt, phân cỡ và điều kiện thuần.
Nhập giống, thuần nước, chết, phân cỡ và xuất thả là các nghiệp vụ riêng.

### 10.4 Cửa hàng thủy sản

Có thể là cửa hàng chuyên thủy sản hoặc cửa hàng hỗn hợp. Khi bật `AQUACULTURE`, hệ thống
thêm form, đơn vị, báo cáo và Sổ tay thủy sản nhưng không thay đổi 5 nhóm Phase 1. Quản lý
ao, telemetry chất lượng nước và sản xuất nông trại là phạm vi mở rộng riêng.

## 11. Kho, nhập hàng và bán hàng

### 11.1 Quy tắc kho chung

- `stock.qty` là tồn Base Unit theo Tenant/Warehouse/Product.
- Khi bật batch, tồn tổng bằng tổng tồn các batch.
- Mọi IN/OUT/trả hàng/điều chỉnh tạo movement append-only trong cùng transaction.
- Không cho tồn âm.
- Không gộp lô khi mất truy xuất HSD, tuổi, sức khỏe, chất lượng hoặc nguồn.
- Chứng từ Completed bất biến; sửa sai bằng return hoặc adjustment.

### 11.2 Dữ liệu nhập tối thiểu

| Nhóm | Dữ liệu bắt buộc/quan trọng | Kết quả |
|---|---|---|
| Vật tư cây trồng | đơn vị, số lượng, giá; lô/HSD với thuốc | tồn lô và giá vốn |
| Cây giống | lô hạt/cây, số gói/cây/khay, tuổi nếu cây sống | tồn vật tư hoặc tồn sống |
| Thức ăn | loài/giai đoạn, bao/kg, lô/HSD | tồn feed theo lô |
| Thuốc thú y | dạng thuốc, lô/HSD, bảo quản | tồn thuốc theo lô |
| Con giống | số con, lô, tuổi/cân nặng, sức khỏe/nguồn | tồn lô sống |
| Thủy sản sau này | loài, lô/trại, số lượng/sinh khối, khả năng sống | tồn aqua theo lô |

### 11.3 Kiểm tra khi bán

- BVTV: chặn hết hạn/thu hồi/khóa; hiển thị PHI/REI.
- Phân bón: kiểm tra conversion bao/kg và thuộc tính dinh dưỡng.
- Hạt/cây giống: kiểm tra tồn và điều kiện chất lượng.
- Thức ăn: kiểm tra lô/HSD và loài/giai đoạn nếu đã cấu hình.
- Thuốc thú y: kiểm tra lô/HSD/bảo quản và hiển thị withdrawal.
- Con giống: kiểm tra số con đủ điều kiện, không bán con bệnh/cách ly/loại.
- Thủy sản sau này: kiểm tra loài, ao và điều kiện nước, không mượn rule trên cạn.

## 12. Hợp đồng Sổ tay

Mỗi entry Sổ tay có business group, product kind, đối tượng, bệnh/vấn đề, alias, triệu chứng,
câu hỏi, sản phẩm ghim, metadata match, ghi chú Owner, quyền và tenant scope.

| Domain Sổ tay | Gợi ý trực tiếp | Context cần có |
|---|---|---|
| Cây/sâu/bệnh | `PESTICIDE`; `FERTILIZER` khi là dinh dưỡng | cây, giai đoạn, diện tích, triệu chứng |
| Hạt/cây con | `SEED`, `SEEDLING` | cây, giống, mùa vụ, diện tích |
| Thức ăn | `FEED` | loài, giai đoạn, số con, cân nặng |
| Bệnh vật nuôi | `VET_DRUG` | loài, triệu chứng, số con, cân nặng |
| Chọn con giống | `LIVESTOCK_SEED` và liên kết feed/thuốc | giống, tuổi, sức khỏe, lô |
| Thủy sản sau này | `AQUA_DRUG`, `AQUA_FEED`, `AQUA_SEED` | loài, ao, sinh khối, nước |

Sổ tay chỉ gợi ý, không tự thêm vào giỏ. Đơn Completed lưu snapshot nhóm, kind, đối tượng,
bệnh/vấn đề, câu trả lời, sản phẩm chọn, cảnh báo, công thức và lô xuất. Thay đổi Product hoặc
Sổ tay về sau không được sửa lịch sử đơn.

## 13. Báo cáo và kiểm soát

Báo cáo chung: bán hàng, nhập hàng, tồn, giá vốn, lãi, hàng sắp hết, HSD và công nợ; tất cả
phải lọc được theo business group và product kind.

Báo cáo riêng:

- BVTV: HSD/thu hồi, hoạt chất, cảnh báo PHI/REI.
- Phân bón: doanh số theo công thức dinh dưỡng, bao/kg, điều chỉnh chất lượng.
- Hạt/cây giống: lô, nảy mầm, tỷ lệ sống, hao hụt, tuổi cây.
- Thức ăn: bán theo loài/giai đoạn, HSD, tiêu thụ bao/kg.
- Thuốc thú y: truy xuất lô, HSD/thu hồi, withdrawal.
- Con giống: số con, chết, cách ly, đủ điều kiện bán, nguồn lô.
- Thủy sản sau này: tỷ lệ sống, sinh khối, loài/ao và điều kiện nước.

Mọi điều chỉnh theo nhóm phải có reason và Audit Log. Bộ lọc nhóm, profile cửa hàng và
trạng thái bật/tắt không được vượt qua tenant isolation hoặc permission.

## 14. Phạm vi và điểm cần chốt

Phase 1 triển khai 5 nhóm cốt lõi. Thủy sản là thiết kế tương lai, không phải scope triển khai
hiện tại. Trước khi xây nghiệp vụ hàng sống cần chốt: Con giống theo lô hay cá thể; Cây giống
bao gồm hạt, cây con hay cả hai; và Thủy sản có cần quản lý theo sinh khối ngay ở phase mở rộng
đầu tiên hay không.


## 4.0 Giá trị lõi theo BA (2026-07-23)

Trong cửa hàng vật tư cây trồng, `productKind` là **Loại sản phẩm** kỹ thuật; không dùng `category` hoặc “Nhóm sản phẩm” để thay thế. Sáu giá trị chuẩn:

| Mã | Nhãn hiển thị | Nhóm nghiệp vụ |
|---|---|---|
| `PESTICIDE` | Thuốc bảo vệ thực vật | `CROP_INPUTS` |
| `FERTILIZER` | Phân bón | `CROP_INPUTS` |
| `BIOLOGICAL_PRODUCT` | Chế phẩm sinh học | `CROP_INPUTS` |
| `GROWTH_REGULATOR` | Chất điều hòa sinh trưởng | `CROP_INPUTS` |
| `SOIL_AMENDMENT` | Chất cải tạo đất | `CROP_INPUTS` |
| `AGRI_MATERIAL` | Vật tư nông nghiệp | `CROP_INPUTS` |

`category` chỉ là nhãn sắp xếp riêng của cửa hàng. Backend kiểm tra `productKind` và `attrs`; frontend hiển thị form tương ứng. Các ProductKind chăn nuôi, cây giống và thủy sản là phạm vi mở rộng, không đưa vào lựa chọn mặc định của cửa hàng crop-inputs.

Thuộc tính chuyên ngành: thuốc BVTV gồm hoạt chất, hàm lượng, dạng thuốc, đối tượng phòng trừ, cây trồng, nhóm độc, PHI và số đăng ký; phân bón gồm loại, thành phần dinh dưỡng, N-P-K, hữu cơ, cây trồng và giai đoạn.

## 14.1 Các trường vận hành đã chốt theo BA

- **Nhà cung cấp:** mã, tên, loại (thuốc BVTV, phân bón hoặc cả hai), người liên hệ, điện thoại, email, địa chỉ, tỉnh/thành phố, công nợ hiện tại, trạng thái.
- **Nhập hàng:** mã phiếu, ngày nhập, nhà cung cấp, số mặt hàng, tổng giá trị, thanh toán, công nợ, trạng thái; từng dòng lưu sản phẩm, lô, ngày sản xuất, hạn dùng, số lượng, giá nhập và thành tiền.
- **Tồn kho:** mã/tên thương mại, loại sản phẩm, nhà sản xuất, kho, tồn, đơn vị, giá vốn, giá bán, lô, hạn gần nhất, trạng thái; cảnh báo sắp hết, sắp hết hạn, hết hạn, thu hồi và ngừng lưu hành.
- **Bán hàng tư vấn:** dùng `crop` (cây trồng) và `symptom` (triệu chứng), sau đó gợi ý thuốc BVTV/phân bón, liều lượng, thời điểm phun và thời gian cách ly. Không dùng nhãn “Đối tượng” cho cây trồng.
- **Khách hàng:** `productionProfile` gồm cây trồng, giống, diện tích, địa phương, mùa vụ; lịch sử tư vấn lưu ngày, cây, triệu chứng, thuốc và phân bón đã bán.
- **Dashboard:** top sâu bệnh được tư vấn, cây trồng được tư vấn, thuốc BVTV bán chạy, phân bón bán chạy, hoạt chất bán nhiều và thương hiệu bán chạy.

Các trường trên là hợp đồng nghiệp vụ cần được triển khai theo spec từng bounded context; không suy diễn thành một JSON tự do duy nhất khi xây UI/API.
