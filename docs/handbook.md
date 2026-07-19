# Handbook — Sổ tay bệnh → thuốc & Context tư vấn

> Module tri thức nghiệp vụ giúp người bán (thường không phải kỹ sư nông học) **tra nhanh: đối tượng nuôi trồng (cây/vật nuôi/thủy sản) đang bị bệnh/dịch gì thì bán thuốc nào**. Đây là điểm khác biệt của NomoGreen so với phần mềm bán hàng thường: biến kinh nghiệm bán vật tư thành dữ liệu tra cứu tại quầy.

Tài liệu này là phần tách ra từ `base_spec.md` (mục 21 + 22). Xem `base_spec.md` để biết ngữ cảnh sản phẩm tổng thể.

---

# 21. Handbook — Sổ tay bệnh → thuốc

## 21.1 Mục tiêu

- Người bán nhập/chọn một **bệnh** (hoặc sâu hại / dịch bệnh) → hệ thống **gợi ý danh sách thuốc** phù hợp đang có trong kho.
- Rút gọn tư vấn tại quầy: không cần nhớ hoạt chất, chỉ cần biết "lúa bị đạo ôn", "lợn bị dịch tả", "tôm bị đốm trắng" là ra thuốc.
- Tận dụng dữ liệu chuyên ngành đã có ở Product (mục 5 `base_spec.md`): `Active Ingredient`, `Đối tượng áp dụng`, `Pest / Bệnh`.

## 21.2 Thực thể

**Disease (Bệnh / Sâu hại / Dịch bệnh)** — một mục trong Sổ tay:

- **Name** — tên thường gọi (Đạo ôn, Rầy nâu, Dịch tả lợn, Đốm trắng tôm...).
- **Aliases** — tên gọi khác / từ khóa tìm (để gõ kiểu gì cũng ra).
- **Đối tượng** — lĩnh vực & đối tượng liên quan (Trồng trọt: Lúa, Bắp, Rau màu...; Chăn nuôi: Lợn, Gà, Bò...; Thủy sản: Tôm, Cá...).
- **Type** — Bệnh (nấm/vi khuẩn/virus/ký sinh), Sâu hại (côn trùng), Cỏ dại, hoặc Dịch bệnh vật nuôi/thủy sản.
- **Symptom** — mô tả triệu chứng ngắn, ngôn ngữ đời thường.
- **Recommended Active Ingredients** — các hoạt chất khuyến nghị trị bệnh này.
- **Note** — ghi chú của chủ cửa hàng (liều, thời điểm dùng, kinh nghiệm xử lý).

Sổ tay là dữ liệu **theo tenant** (mỗi cửa hàng tự bồi đắp kinh nghiệm riêng), có seed sẵn bộ bệnh phổ biến cho cả 3 lĩnh vực để dùng được ngay.

## 21.3 Cơ chế gợi ý thuốc (kết hợp Auto + Manual)

Thứ tự ưu tiên khi tra một bệnh:

1. **Ghim thủ công (Manual pin)** — sản phẩm chủ cửa hàng đã gắn trực tiếp cho bệnh này lên đầu. Chính xác theo kinh nghiệm thực tế.
2. **Khớp tự động theo hoạt chất** — sản phẩm có `Active Ingredient` nằm trong danh sách hoạt chất khuyến nghị của bệnh.
3. **Khớp theo tag sâu/bệnh** — sản phẩm có trường `Pest` chứa tên bệnh/alias.

Quy tắc:

- Chủ cửa hàng **ghim** (thêm) hoặc **loại** (ẩn) từng sản phẩm cho mỗi bệnh — đè lên kết quả tự động khi kinh nghiệm khác với match máy.
- Kết quả gợi ý **lọc theo tồn kho**: còn hàng ưu tiên lên đầu; hết hàng / bị khóa / hết hạn không gợi ý bán (Business Rules mục 18 `base_spec.md`).
- Không tự thêm vào đơn — chỉ gợi ý, người bán quyết định.

## 21.4 Tích hợp Bán hàng

- **Luồng B trên Bán nhanh** (`sales.md`): khách kể bệnh → gõ ô tìm → chọn bệnh → (tuỳ) hỏi diện tích/số con → list thuốc → thêm giỏ. **Cùng màn bán**, không app riêng.
- Luồng A (biết tên thuốc) không bắt qua Sổ tay.
- MVP: ghim + khớp hoạt chất/pest + **hỏi optional + SL sơ bộ** (21.7). Fallback 2 lớp tinh = 1.1 (21.8).
- Từ màn chi tiết bệnh trong Sổ tay: thêm thuốc vào đơn đang mở.
- Giá / trừ tồn = chọn SP tay.

## 21.5 Phân quyền & Feature Flag

- **Owner**: xem, thêm/sửa/xóa bệnh, ghim/loại thuốc; bật schema hỏi đáp (21.7) / fallback (21.8) khi flag sẵn sàng.
- **Staff**: xem và dùng gợi ý khi bán; không sửa Sổ tay (trừ Owner mở).
- Feature Flag `handbook` (mục 3.9 `base_spec.md`). Tắt → ẩn menu + lối Tra bệnh.
- Quyền `handbook:view|create|edit|delete`.

## 21.6 Phạm vi theo phase

**Phase 1 (MVP quầy) — bắt buộc**

- Disease + aliases + đối tượng + ghim thuốc + khớp hoạt chất / pest tag.
- **Gõ bệnh trên Bán nhanh** → panel thuốc (luồng B).
- §21.7 Hỏi đáp **optional** + công thức số học đơn giản + prefill SL — preset field theo lĩnh vực; Owner tắt hết field = 0 câu hỏi.
- Context trên đơn: bệnh + field đã trả lời (§22 tối thiểu).
- Seed bệnh vùng / 3 lĩnh vực.

**Phase 1.1**

- §21.8 Fallback thuốc hết hàng 2 lớp (mapping Owner + cùng hoạt chất).
- Field consult tùy biến nâng cao / công thức phức tạp hơn.
- Gợi ý “lần trước khách này mua gì cho bệnh này”.

**Ngoài Phase 1**

- AI / ảnh chụp lá cây.
- Nhắc lịch phun tự động.
- Chia sẻ Sổ tay liên cửa hàng.

## 21.7 Schema hỏi đáp theo lĩnh vực (tư vấn chuyên ngành)

> **Phase 1: có trong luồng B, nhưng từng câu hỏi luôn bỏ qua được.**  
> Owner tắt field / bệnh không bật field → sau chọn bệnh **thẳng** list thuốc.

Mỗi bệnh / vấn đề trong Sổ tay có một **bộ câu hỏi tư vấn** (consult schema) để người bán hỏi khách rồi quyết định bán gì. Ví dụ:

- **Lúa bị đạo ôn** cần biết: diện tích (sào / ha), giai đoạn lúa (đẻ nhánh / làm đòng / trổ), số lần phun dự kiến → từ đó tính lượng thuốc / nước cần dùng.
- **Lợn bị tiêu chảy** cần biết: số con mắc, tổng số đàn, cân nặng trung bình, đã dùng thuốc gì chưa → ra thuốc + liều / con / ngày.
- **Tôm bị đốm trắng** cần biết: diện tích ao (m²), mật độ thả (con/m²), ngày tuổi, độ mặn → chọn loại thuốc phù hợp và liều lượng ao.

### Bộ trường preset theo lĩnh vực

Hệ thống cung cấp sẵn bộ trường chuẩn theo 3 lĩnh vực để chủ cửa hàng dùng được ngay, có thể bật/tắt hoặc tùy biến:

| Lĩnh vực | Trường preset | Loại | Đơn vị | Bắt buộc? |
|---|---|---|---|---|
| Trồng trọt | Diện tích | Số | sào / ha | Không |
| Trồng trọt | Giai đoạn cây | Chọn | Đẻ nhánh / Làm đòng / Trổ / Chín | Không |
| Trồng trọt | Số lần phun | Số nguyên | lần | Không |
| Trồng trọt | Lượng nước / sào | Số | lít | Không |
| Chăn nuôi | Số con mắc | Số nguyên | con | Có |
| Chăn nuôi | Tổng số đàn | Số nguyên | con | Có |
| Chăn nuôi | Cân nặng TB | Số | kg | Không |
| Chăn nuôi | Giai đoạn vật nuôi | Chọn | Cai sữa / Vỗ béo / Mang thai | Không |
| Chăn nuôi | Đã dùng thuốc gì | Chọn nhiều + nhập | — | Không |
| Thủy sản | Diện tích ao | Số | m² | Không |
| Thủy sản | Mật độ thả | Số | con/m² | Không |
| Thủy sản | Ngày tuổi | Số | ngày | Không |
| Thủy sản | Độ mặn | Số | ‰ | Không |
| Thủy sản | Loại thủy sản | Chọn | Tôm / Cá / Khác | Có |

### Tùy biến của Owner

- **Bật/tắt trường preset**: Owner mở cài đặt Sổ tay → chọn bệnh → bật/tắt từng trường không phù hợp với cửa hàng.
- **Thêm trường riêng**: Owner tạo trường mới với tên, loại (text / số / chọn / chọn nhiều / ngày), đơn vị, bắt buộc hay không.
- **Hành vi hỏi**: bệnh nào không có trường nào bật → bỏ qua bước hỏi, đi thẳng tới gợi ý thuốc.

### Luồng tư vấn khi bán

```
Bán nhanh / Tạo đơn
   ↓ chọn bệnh từ Sổ tay
Hỏi các trường đã bật của bệnh
   ↓ (vd: "Diện tích? 5 sào" / "Số con mắc? 12")
Tính sơ bộ lượng thuốc / liều dùng theo công thức của bệnh
   ↓
Gợi ý thuốc (kèm số lượng đề xuất) → người bán chỉnh nếu cần
   ↓
Thêm vào đơn, lưu context tư vấn (mục 22)
```

**Công thức tính sơ bộ**: mỗi bệnh có một công thức đơn giản định nghĩa trong Sổ tay (vd: `lượng_thuốc = diện_tích * liều_ha / 10000`, `số_gói = số_con * liều_con_ngày * số_ngày / đơn_vị_gói`). Công thức hiển thị minh bạch để người bán hiểu và chỉnh tay. Phase 1 chỉ hỗ trợ biểu thức số học cơ bản (cộng/trừ/nhân/chia) trên các trường đã nhập — không cần engine rule phức tạp.

### Ghi chú thiết kế cho nông thôn

- Giao diện hỏi đáp dạng **một câu một màn hình** trên Bán nhanh (mobile-first), nút lớn, chữ to, có bàn phím số riêng cho trường số.
- Mặc định giá trị hợp lý theo vùng miền (vd mặc định "1 sào" cho lúa ở miền Bắc, "1000 m²" cho tôm ở miền Tây) để người bán chỉ cần sửa nhanh.
- Có thể **bỏ qua** tất cả câu hỏi bằng nút "Bán nhanh không tư vấn" — phục vụ khách vãng lai, khách quen đã rõ bệnh.

## 21.8 Fallback thuốc khi hết hàng

> **Flag OFF mặc định Phase 1.** MVP: hết hàng → không gợi ý bán (Business Rules §18); Owner ghim thuốc thay bằng tay.

Khi bật flag và thuốc gợi ý chính **hết hàng / bị khóa / hết hạn**, tìm thay thế 2 lớp:

### Lớp 1 — Owner mapping thủ công (ưu tiên cao nhất)

Trong Sổ tay, với mỗi cặp (bệnh, thuốc chính), Owner khai báo danh sách **thuốc thay thế** (1–n). Ví dụ:

```
Bệnh: Đạo ôn lúa
  Thuốc chính: Tricyclazole 75% WP (mã SP-001)
  Thuốc thay thế:
    - SP-002: Isoprothiolane 40% EC
    - SP-003: Propiconazole 25% EC
```

- Owner xếp thứ tự ưu tiên trong danh sách thay thế (cái nào ưu tiên hơn lên trước).
- Mapping này chính xác theo kinh nghiệm bán hàng thực tế, đè lên mọi kết quả tự động.
- Có thể copy nhanh mapping từ thuốc chính này sang thuốc chính khác (cùng bệnh, cùng hoạt chất).

### Lớp 2 — Tự động theo hoạt chất (cứu cánh)

Khi **không có** mapping thủ công hoặc mapping đã hết hàng hết:

1. Lấy `Active Ingredient` của thuốc chính.
2. Tìm các sản phẩm khác có cùng hoạt chất trong kho, còn bán được.
3. Sắp theo mức độ tương đồng về **hàm lượng** (concentration) so với thuốc chính — gần nhất lên đầu.
4. Đánh dấu rõ trong UI là "Gợi ý tự động theo hoạt chất" để Owner kiểm tra lại.

### Quy tắc chung

- Thuốc thay thế **vẫn phải** khớp với bệnh đang tra (nằm trong gợi ý của bệnh đó), không lấy đại một sản phẩm cùng hoạt chất.
- Kết quả cuối cùng vẫn lọc theo Business Rules mục 18 `base_spec.md` (còn hàng, không khóa, không hết hạn, không recall).
- Tại quầy, người bán **luôn thấy nhãn** rõ ràng: thuốc chính, thuốc thay thế mapping, thuốc thay thế tự động — để chủ động giải thích cho khách.
- Fallback chỉ là gợi ý, không tự thay — người bán xác nhận trước khi thêm vào đơn.

---

# 22. Context tư vấn trên đơn bán

Mỗi đơn bán (Bán nhanh hoặc Sales Order) lưu lại **bối cảnh tư vấn** tại thời điểm bán, phục vụ tra cứu lại, hỗ trợ khách sau, và phân tích hiệu quả tư vấn. Đây là dữ liệu "mềm" nhưng là **khác biệt cốt lõi** của NomoGreen so với phần mềm bán hàng thông thường.

## 22.1 Các trường lưu trên đơn

Thông tin khách hàng (luôn lưu khi có):

- **SĐT khách** — bắt buộc nếu đơn ghi nợ; khuyến khích luôn lưu để tra lịch sử.
- **Tên khách** (snapshot, kể cả khách vãng lai nhập tay).

Bệnh / vấn đề (lưu khi đơn phát sinh từ Sổ tay):

- **Bệnh** — ID + tên bệnh trong Sổ tay (nếu có).
- **Đối tượng** — cây trồng / vật nuôi / thủy sản cụ thể (vd "Lúa", "Lợn thịt", "Tôm thẻ").

Trường đặc thù theo lĩnh vực (lưu theo schema hỏi đáp của bệnh tại thời điểm bán — xem 21.7):

| Lĩnh vực | Trường lưu trên đơn |
|---|---|
| Trồng trọt | Diện tích (+ đơn vị), giai đoạn cây, số lần phun dự kiến |
| Chăn nuôi | Số con mắc, tổng số đàn, cân nặng TB, giai đoạn vật nuôi |
| Thủy sản | Diện tích ao, mật độ thả, ngày tuổi, độ mặn |
| Tùy biến | Mọi trường Owner đã bật cho bệnh đó |

Ghi chú đặc thù:

- **Thuốc thú y** — `số con` là số con mắc bệnh, `số đàn` là tổng đàn; lưu cả hai để tính tỷ lệ mắc và ra liều chính xác cho cả đàn.
- **Phân bón / vật tư nông nghiệp** — `diện tích` là đủ, không cần `số con`.
- **Giống cây / con giống** — không cần bệnh, lưu `diện tích canh tác` hoặc `quy mô đàn` tùy loại.

## 22.2 Snapshot, không sửa sau

- Các trường context tư vấn là **snapshot tại thời điểm bán**: nếu sau đó Owner sửa schema bệnh trong Sổ tay, đơn cũ vẫn giữ nguyên giá trị đã ghi lúc bán.
- Cấu trúc lưu dạng `{ field_key: value }` linh hoạt để chứa trường tùy biến mà không cần đổi schema đơn.
- Đơn đã Completed thì **không sửa** context tư vấn (Business Rules mục 18 `base_spec.md` — không sửa chứng từ đã khóa).

## 22.3 Sử dụng lại

- **Lịch sử khách**: tra lại đơn cũ của khách theo SĐT → thấy bệnh gì, dùng thuốc gì, hiệu quả ra sao (nếu có ghi nhận).
- **Gợi ý lần sau**: khi khách quay lại với cùng SĐT + bệnh, hệ thống ưu tiên hiển thị các thuốc đã bán thành công cho khách đó.
- **Thống kê tư vấn**: báo cáo "bệnh nào hay gặp ở vùng này", "thuốc nào hay được ghim thay thế", phục vụ Owner tinh chỉnh Sổ tay.
- **Hỗ trợ sau bán**: nhắc lịch phun lần 2, lần 3 dựa trên `số lần phun dự kiến` (Phase 2 — ngoài Phase 1).

## 22.4 Ghi chú cho người dùng nông thôn

- Mọi trường context đều **tùy chọn** — nếu khách vãng lai chỉ mua 1 chai thuốc đã biết, người bán bỏ qua toàn bộ bước tư vấn, đơn vẫn lưu bình thường.
- Trường nào có giá trị mặc định hợp lý theo vùng → tự điền, người bán chỉ cần sửa nhanh.
- Lịch sử tư vấn hiển thị bằng ngôn ngữ đời thường (vd: "5 sào lúa, đẻ nhánh, phun 1 lần") thay vì key kỹ thuật.
