# NomoGreen Design System

> **Version:** 2.2
> **Framework:** Next.js 16 + React 19 + Tailwind CSS v4 + lucide-react (shadcn/ui bổ sung khi cần — xem §24)
> **Design Style:** Inspired FarmGo + Modern SaaS (xanh lá tươi, icon tile nhiều màu, sidebar nhóm)
> **Sản phẩm:** SaaS quản lý bán hàng vật tư nông nghiệp (bán hàng · kho · công nợ)
> **Đối tượng:** nông hộ & cửa hàng/đại lý nhỏ lẻ — người ít quen máy tính
> **Bám theo:** `docs/base_spec.md`

---

# 1. Nguyên tắc thiết kế

NomoGreen là phần mềm **bán hàng dùng hằng ngày** cho người bán vật tư nông nghiệp, nhiều người lớn tuổi, thao tác chủ yếu **trên điện thoại**. Vì vậy giao diện phải **to, rõ, ít bước, khó bấm sai**.

Nguyên tắc cốt lõi:

* **Mobile First.** Thiết kế cho màn hình điện thoại trước, rồi mới mở rộng ra máy tính. Chưa có app native — web phải chạy tốt trên mobile.
* **To và rõ.** Chữ tối thiểu 16px, nút bấm tối thiểu 48px, số tiền hiển thị lớn và đậm.
* **Ít bước.** Mọi việc thường ngày (bán hàng, thu nợ, nhập hàng) làm xong trong **≤ 3 lần chạm**.
* **Ngôn ngữ đời thường.** Dùng tiếng Việt gần gũi: "Bán hàng", "Ghi nợ", "Thu tiền", "Hàng sắp hết" — tránh thuật ngữ kỹ thuật ("SKU", "adjustment", "outstanding").
* **Một hành động chính mỗi màn hình.** Nút chính to, màu xanh thương hiệu, luôn thấy được.
* **Khó bấm nhầm, dễ sửa sai.** Xác nhận trước thao tác nguy hiểm; luôn có nút Hoàn tác/Quay lại.
* **Ít màu, nhiều khoảng trắng.** Chỉ một màu thương hiệu cho hành động; màu còn lại để báo trạng thái.
* **Dữ liệu là trọng tâm.** Số tiền, tồn kho, công nợ hiển thị nổi bật; trang trí tối thiểu.
* **Phản hồi tức thì.** Mỗi thao tác có phản hồi rõ (toast, đổi trạng thái, loading), người dùng không phải đoán.

---

# 2. Tính cách thương hiệu

* Thân thiện
* Tin cậy
* Đơn giản
* Xanh (nông nghiệp)
* Chuyên nghiệp vừa đủ

---

# 3. Bảng màu

## Brand Green (màu hành động)

| Tên            | Hex     | Dùng cho |
| -------------- | ------- | -------- |
| Primary        | #4CAF50 | Nút chính, link, tab active |
| Primary Hover  | #43A047 | Trạng thái hover |
| Primary Active | #2E7D32 | Trạng thái nhấn |
| Primary Soft   | #E8F5E9 | Nền nhẹ, hàng được chọn |

Chỉ **một** màu thương hiệu cho hành động, để người dùng luôn biết "chỗ xanh là bấm được".

## Nền

| Tên            | Hex     |
| -------------- | ------- |
| App Background | #F7F9F8 |
| Card           | #FFFFFF |
| Sidebar        | #FFFFFF |
| Header         | #FFFFFF |

## Trung tính

| Tên      | Hex     |
| -------- | ------- |
| Gray 50  | #FAFAFA |
| Gray 100 | #F5F5F5 |
| Gray 200 | #EEEEEE |
| Gray 300 | #E0E0E0 |
| Gray 500 | #9E9E9E |
| Gray 700 | #616161 |
| Gray 900 | #212121 |

## Màu trạng thái (dùng chung toàn hệ thống)

| Ý nghĩa | Hex | Dùng cho |
| ------- | --- | -------- |
| Success | #4CAF50 | Hoàn thành, đã thanh toán, còn hàng |
| Warning | #F9A825 | Sắp hết hàng, nợ sắp đến hạn, sắp hết hạn |
| Error   | #E53935 | Hết hàng, quá hạn nợ, hàng hết hạn |
| Info    | #2196F3 | Thông tin, ghi chú |

## Màu nhận diện phân hệ (Module Accent — chữ ký thị giác kiểu FarmGo)

Đây là **đặc trưng thị giác chính** lấy từ FarmGo: mỗi phân hệ có một **icon tile màu riêng**, giúp người dùng nhận ra module bằng màu trước cả khi đọc chữ. Dùng nhiều ở Dashboard (tile lối tắt), menu, đầu mỗi dòng danh sách và Page Header — **chỉ cho icon tile, không dùng cho nút bấm/text/badge**.

| Phân hệ | Màu | Hex |
| ------- | --- | --- |
| Bán hàng | Green | #43A047 |
| Nhập hàng | Teal | #26A69A |
| Kho / Tồn kho | Indigo | #3949AB |
| Công nợ | Orange | #F4511E |
| Khách hàng | Blue | #1E88E5 |
| Nhà cung cấp | Purple | #7E57C2 |
| Sản phẩm | Lime | #9E9D24 |
| Báo cáo | Slate | #546E7A |

Quy tắc (theo FarmGo):

* Tile vuông bo góc 10px, icon trắng, kích thước 40×40 (mobile 44×44).
* Tile màu đầy (solid) hoặc nền soft cùng tông + icon đậm — dùng nhất quán toàn hệ thống.
* Tối đa 8 màu tile, tái sử dụng theo nhóm nghiệp vụ.
* Không dùng màu tile cho text, nút bấm hay badge trạng thái — những chỗ đó luôn dùng Brand Green / màu trạng thái.
* Chỉ định nghĩa token màu tile khi module thực sự được xây (YAGNI).

---

# 4. Typography

## Font

```
Be Vietnam Pro    (chính — hỗ trợ tiếng Việt tốt)
Inter             (fallback)
```

## Kích thước (tối thiểu 16px cho nội dung — người dùng lớn tuổi)

| Loại | Size | Dùng cho |
| ---- | ---- | -------- |
| H1 | 32 | Số tiền lớn ở Dashboard |
| H2 | 26 | Tiêu đề trang |
| H3 | 22 | Tiêu đề mục / tên thực thể |
| H4 | 18 | Tiêu đề card |
| Body Large | 18 | Số tiền, nội dung quan trọng |
| Body | 16 | Nội dung mặc định |
| Small | 14 | Nhãn phụ, mô tả |

**Không dùng cỡ chữ < 14px.** Số tiền luôn tối thiểu 18px và **in đậm**.

---

# 5. Bo góc & Bóng đổ

| Thành phần | Radius |
| ---------- | ------ |
| Button | 10px |
| Card | 16px |
| Input | 10px |
| Dialog / Sheet | 18px |
| Badge | Bo tròn hết (full) |

Bóng đổ nhẹ:

```
Card:  0 2px 10px rgba(0,0,0,.04)
Hover: 0 8px 30px rgba(0,0,0,.08)
```

Không dùng bóng đậm.

---

# 6. Khoảng cách

Theo hệ 4px: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`.

Trên mobile ưu tiên padding thoáng (16–20) để dễ chạm, tránh bấm nhầm.

---

# 7. Nút bấm (Buttons)

**Kích thước tối thiểu 48px chiều cao** (mobile), để ngón tay dễ chạm.

| Loại | Nền | Chữ | Dùng cho |
| ---- | --- | --- | -------- |
| Primary | #4CAF50 → hover #43A047 | Trắng | Hành động chính: "Bán hàng", "Lưu", "Thu tiền" |
| Secondary | Trắng, viền Gray200 | Gray900 | Hành động phụ |
| Ghost | Không nền, hover Gray100 | Gray700 | Hành động nhẹ trong toolbar |
| Destructive | #E53935 | Trắng | Xóa, hủy — luôn kèm hộp xác nhận |

Quy tắc:

* Mỗi màn hình chỉ **một** nút Primary rõ ràng.
* Nút quan trọng dùng **icon + chữ** (không chỉ icon) để người mới hiểu ngay.
* Trên mobile, nút hành động chính **kéo dài hết chiều ngang** (full-width) ở đáy màn hình.
* **Form mobile**: nút Lưu/Thêm **dính đáy** (`fixed`, ngay trên bottom nav — `bottom-[68px]`), full-width, luôn thấy khi cuộn form dài.
* **Danh sách mobile/tablet** (`< lg`): hành động tạo mới dùng **FAB pill "＋ <hành động>"** nổi góc phải dưới (trên bottom nav, `bottom-[84px] right-4`), màu Primary + bóng xanh. Desktop đã có nút ở header/toolbar thì FAB phải `lg:hidden` — không trùng lặp. Lưu ý: nút "+" giữa bottom nav là **Bán nhanh**, không dùng thay cho tạo mới trong module khác.

---

# 8. Ô nhập (Inputs)

* Chiều cao **48px** (mobile) / 44px (desktop).
* Viền Gray200, focus đổi sang Primary.
* Label luôn hiển thị phía trên ô (không chỉ dùng placeholder — người dùng dễ quên đang nhập gì).
* Ô số lượng / tiền: bàn phím số, có nút +/- to để tăng giảm nhanh.
* Chọn sản phẩm / khách hàng: dùng **Combobox có tìm kiếm**, gõ tên hoặc SĐT ra ngay.

---

# 9. Cards

Card là thành phần xuất hiện nhiều nhất.

Style: nền trắng · radius 16 · shadow nhẹ · padding 20–24.

Card số liệu (KPI) ví dụ:

```
------------------------------------
  Doanh thu hôm nay
  12.500.000 ₫          ▲ +8%
------------------------------------
```

* Nhãn nhỏ (Gray700, 14px) ở trên, **số lớn đậm** (H1/H2) ở giữa.
* Số tiền luôn kèm đơn vị "₫" và dấu phân cách nghìn.

---

# 10. Điều hướng (Navigation)

Điều hướng **khác nhau theo thiết bị** để tối ưu từng màn hình:

## 10.1 Mobile (mặc định) — Bottom Navigation

Thanh dưới cùng, 5 mục lớn, luôn thấy:

```
[ Trang chủ ]  [ Bán hàng ]  [  + Bán  ]  [ Công nợ ]  [ Khác ]
```

* Nút giữa **"+ Bán"** (Bán nhanh) nổi lên, to nhất, màu Primary — hành động dùng nhiều nhất.
* Mỗi mục: icon + nhãn ngắn, vùng chạm ≥ 48px.
* "Khác" mở Sheet chứa các mục còn lại: Nhập hàng, Kho, Khách hàng, Nhà cung cấp, Báo cáo, Thiết lập.

## 10.2 Desktop — Sidebar (kiểu FarmGo)

* Nền trắng, rộng 260px, thu gọn còn 64px (chỉ icon + tooltip khi hover).
* Mỗi mục: **icon tile màu module accent** (mục 3) + nhãn tiếng Việt ngắn (≤ 3 từ) — nhận diện bằng màu như FarmGo.
* Mục active: nền Primary Soft + thanh chỉ báo 3px màu Primary ở mép trái.
* Chia **nhóm nghiệp vụ**, phân tách bằng divider mảnh (Gray200); nhóm "Khác/Trợ giúp" luôn ở cuối.

```
[Bán hàng]
Bán nhanh
Đơn bán hàng
Trả hàng

[Kho & Hàng hóa]
Sản phẩm
Nhập hàng
Tồn kho

[Đối tác]
Khách hàng
Nhà cung cấp
Công nợ

[Khác]
Báo cáo
Thiết lập
Hướng dẫn
```

## 10.3 Topbar (mọi thiết bị)

* Cao 56–64px.
* Mobile: tên cửa hàng/logo + chuông thông báo. Bỏ bớt để nhường chỗ nội dung.
* Desktop (kiểu FarmGo):
  * Toggle sidebar
  * Nút **"+ Tạo mới"** dạng **pill nổi bật**, đặt gần giữa topbar — mở menu nhanh: Bán hàng, Nhập hàng, Thêm khách, Thu nợ... (≤ 3 lần chạm).
  * Ô tìm kiếm
  * Chuông thông báo (badge đỏ khi có mới)
  * Avatar kèm vai trò ("Minh Tâm — Chủ cửa hàng") — luôn biết mình đang ở quyền nào.

## 10.4 Khung nội dung (Content Frame) — chuẩn bắt buộc

Khung nội dung do **AppShell cung cấp một lần duy nhất** tại `<main>`: `mx-auto w-full max-w-6xl`. Mọi màn trong portal người dùng dùng chung khung này — **không trang nào tự thêm `mx-auto` / `max-w-*` cho khung ngoài** — nhờ đó chuyển trang không bị "nhảy khung" to/nhỏ.

* **Trang rộng** (Dashboard, danh sách): nội dung fill hết khung (`flex w-full flex-col`).
* **Trang form / chi tiết / thiết lập**: nội dung gói trong `max-w-2xl` cho dễ đọc, với căn lề responsive `mx-auto lg:mx-0`:
  * `< lg` (mobile + tablet dọc, chưa có sidebar): **căn giữa** — căn trái sẽ hở phải, nhìn lệch.
  * `≥ lg` (desktop có sidebar): **căn trái** — mép trái mọi trang thẳng hàng (kiểu Linear/Stripe).
* Trang mới thêm vào portal tự thừa hưởng khung, không cần khai báo lại.

---

# 11. Tiêu đề trang (Page Header)

```
Tên trang  [badge số lượng]
Mô tả ngắn (Gray700, 14px)
```

Ví dụ: **Công nợ khách hàng** `12` — "Đang còn nợ".

* Tiêu đề H2/H3, đậm.
* Badge số lượng: nền Info Soft (#E3F2FD), chữ Info, bo full.

---

# 12. Bảng & Danh sách (Tables / Lists)

Nguyên tắc responsive quan trọng: **bảng nhiều cột không dùng được trên điện thoại.**

## 12.1 Mobile — dạng thẻ danh sách (Card List)

Mỗi bản ghi là **một thẻ**, thông tin quan trọng nhất nổi bật:

```
┌──────────────────────────────┐
│ Anh Ba (Tổ 3)         Còn nợ │
│ 0912 345 678       1.200.000₫│
│ [ Thu tiền ]        [ Chi tiết]│
└──────────────────────────────┘
```

* Dòng đầu: tên + trạng thái (badge).
* Dòng giữa: thông tin phụ (SĐT) + **số tiền lớn đậm**.
* Hành động chính đặt ngay trên thẻ (Thu tiền / Bán tiếp).
* Vuốt hoặc menu "⋮" cho hành động phụ.

## 12.2 Desktop — bảng đầy đủ

* Header nền Gray100, hover hàng = Primary Soft, chọn = #E8F5E9.
* Hàng cao tối thiểu 56px, thoáng.
* Cột cuối: menu "⋮" (Dropdown) thay vì nhiều nút inline.
  * Menu ⋮ phải render bằng **fixed positioning** theo tọa độ nút (không dùng `absolute` trong container `overflow-hidden` — sẽ bị cắt ở hàng cuối). Mỗi mục menu có **icon + chữ**.
* Trạng thái luôn dùng **Badge** (không dùng text trần).
* Toolbar: bộ lọc, số bản ghi, nút hành động chính (Primary) góc phải.

**Chống dồn chữ trong cột (bắt buộc):**

* Mọi cột dữ liệu ngắn (số tiền, số lượng, trạng thái, ngày) phải có `min-width` + `whitespace-nowrap` ở cả `<th>` lẫn `<td>` — "Tồn kho", "Sắp hết", "18.000₫" không bao giờ bị bẻ dòng.
* **Chỉ cho phép xuống dòng** ở cột định danh dài: tên (sản phẩm/khách/NCC) và danh mục.
* Tham chiếu: tên ≥ 220px (wrap), danh mục ≥ 120px (wrap), tiền ≥ 110px (nowrap), số lượng ≥ 100px (nowrap), trạng thái ≥ 110px (badge nowrap).

## 12.3 Phân trang & tải dần (chuẩn chung)

Cùng dữ liệu, hai cơ chế theo thiết bị:

* **Desktop (bảng)** — **phân trang**: 10 dòng/trang; dưới bảng có "Hiển thị X–Y trên Z" + nút ‹ số trang ›. Chỉ 1 trang thì chỉ hiện "Tổng Z bản ghi".
* **Mobile (card list)** — **tải dần khi cuộn** (infinite scroll bằng IntersectionObserver, `rootMargin` ~200px, mỗi lần +8 thẻ), sentinel spinner ở đáy; hết dữ liệu hiện "Đã hiển thị tất cả N". **Không dùng phân trang trên mobile.**
* Đổi bộ lọc/tìm kiếm → tự về trang 1 / thu gọn danh sách.

Cùng dữ liệu, cùng component — chỉ đổi cách bày theo kích thước màn hình.

## 12.4 Bộ lọc danh sách (không modal)

* **Tập giá trị cố định, ít lựa chọn** (trạng thái tồn, trạng thái đơn...): **segmented control** — nền Gray nhạt bo 12px, chia đều `grid-cols-N`, ô active nền trắng + chữ Primary + shadow nhẹ. Full-width nên **không bao giờ cắt chữ ở mép**.
* **Tập giá trị động, nhiều lựa chọn** (danh mục, thương hiệu...): **pill cuộn ngang** + utility `no-scrollbar` (bắt buộc — không để lộ thanh cuộn); pill active nền Primary Soft. Trên mobile cho tràn viền (`-mx-4 px-4`) để cuộn sát mép màn hình.
* Lọc nâng cao (nếu cần) → Sheet trượt từ dưới, không dùng Dialog giữa màn.

---

# 13. Badge (nhãn trạng thái)

Mỗi trạng thái = **màu + chữ** (không chỉ màu — để người mù màu và người lớn tuổi vẫn đọc được).

| Trạng thái | Nền | Chữ | Ví dụ |
| ---------- | --- | --- | ----- |
| Success | Green 50 | Green 700 | Đã thanh toán · Hoàn thành · Còn hàng |
| Warning | Orange 50 | Orange 700 | Còn nợ · Sắp hết hàng · Sắp hết hạn |
| Error | Red 50 | Red 700 | Quá hạn · Hết hàng · Đã hết hạn |
| Draft | Gray 100 | Gray 700 | Nháp · Chưa hoàn thành |

---

# 14. Icons

Chỉ dùng **Lucide React**. Icon đơn giản, đi kèm chữ ở các hành động quan trọng.

Gợi ý: `ShoppingCart` (bán hàng), `PackagePlus` (nhập hàng), `Warehouse` (kho), `Wallet`/`HandCoins` (công nợ), `Users` (khách), `Truck` (NCC), `Package` (sản phẩm), `BarChart3` (báo cáo), `Bell` (thông báo), `Settings` (thiết lập), `Plus` (tạo mới), `Search`.

---

# 15. Màn hình Bán nhanh (Quick Sale) — quan trọng nhất

Đây là màn hình dùng nhiều nhất, phải nhanh và không sai. Tối ưu cho **một tay, trên điện thoại**.

```
┌──────────────────────────────┐
│  Bán hàng            [Khách ▾]│   ← khách tùy chọn (bán vãng lai được)
├──────────────────────────────┤
│  🔍 Tìm sản phẩm / quét mã     │   ← Combobox tìm nhanh
├──────────────────────────────┤
│  Thuốc A   2 chai   90.000₫  ✎│
│  Phân B    1 bao   250.000₫  ✎│
├──────────────────────────────┤
│  Tổng                340.000₫ │   ← số lớn, đậm
├──────────────────────────────┤
│  [ Ghi nợ ]      [ Thu tiền ] │   ← 2 nút to, full-width
└──────────────────────────────┘
```

Quy tắc:

* Thêm sản phẩm bằng tìm kiếm hoặc quét mã vạch (camera điện thoại).
* Số lượng chỉnh bằng nút +/- to; giá tự áp theo bậc số lượng, sửa tay được.
* Không có bước nháp/xác nhận rườm rà — chọn xong bấm **Thu tiền** là xong, tồn kho trừ ngay.
* **Ghi nợ**: chỉ hiện khi đã chọn khách; nếu chưa chọn khách mà bấm Ghi nợ → nhắc chọn khách.
* Sau khi bán: toast "Đã bán · 340.000₫" + tùy chọn in/gửi biên lai.

---

# 16. Công nợ (Debt) — nghiệp vụ nhạy cảm, phải cực rõ

* Danh sách khách còn nợ: sắp theo **nợ nhiều nhất** hoặc **sắp đến hạn** lên đầu.
* Số nợ hiển thị **to, màu cảnh báo** (Warning nếu còn hạn, Error nếu quá hạn).
* Nút **"Thu tiền"** to, ngay trên mỗi dòng.
* Thu tiền cho **trả nhiều lần**: nhập số tiền thu, hệ thống tự tính còn lại.
* Mỗi lần thu ghi lịch sử rõ (ngày, số tiền, hình thức: Tiền mặt / Chuyển khoản / QR).

---

# 17. Biểu đồ (Charts)

* Tối đa **4 màu**, khuyến nghị: Green, Blue, Orange, Gray.
* Dashboard mobile: biểu đồ đơn giản (cột/đường), có nhãn số rõ; tránh biểu đồ phức tạp.
* Luôn kèm số liệu dạng chữ bên cạnh biểu đồ (người dùng đọc số dễ hơn đọc đồ thị).

---

# 18. Dashboard (Trang chủ)

Thứ tự ưu tiên trên mobile (cuộn dọc):

```
1. KPI hàng đầu: Doanh thu hôm nay · Doanh thu tháng
2. Cảnh báo: Hàng sắp hết · Nợ đến hạn · Hàng sắp hết hạn  (badge số)
3. Lối tắt nhanh: [Bán hàng] [Nhập hàng] [Thu nợ]  (tile lớn, icon màu module accent kiểu FarmGo)
4. Biểu đồ doanh thu (đơn giản)
5. Bán chạy trong tháng
```

* KPI dạng card, số lớn đậm.
* Khối cảnh báo nổi bật màu Warning/Error, bấm vào đi thẳng tới danh sách liên quan.

---

# 19. Trạng thái rỗng (Empty State)

Khi chưa có dữ liệu: icon minh họa nhẹ → tiêu đề → mô tả ngắn → **nút hành động**.

Ví dụ:

```
🛒
Chưa có đơn bán nào
Bắt đầu bán hàng để ghi nhận doanh thu
[ Bán hàng ngay ]
```

Không để màn hình trắng trơn — luôn chỉ cho người dùng bước tiếp theo.

---

# 20. Chuyển động (Motion)

* Thời lượng ~200ms, easing ease-out.
* Hover nhẹ (scale 1.02) trên desktop.
* Không animation phức tạp — ưu tiên mượt và nhanh trên máy yếu / mạng yếu.

---

# 21. Phản hồi & Xử lý lỗi

* Mỗi thao tác thành công: **toast** ngắn gọn (Sonner), tự ẩn.
* Đang tải: **Skeleton** thay vì màn hình trắng.
* Thao tác nguy hiểm (xóa, hủy đơn): xác nhận **2 bước bằng inline confirm** ngay trên dòng/thẻ/trang đó (đổi sang trạng thái "Xóa? [Hủy] [Xóa]", nút Destructive bên phải) — **ưu tiên hơn Alert Dialog** để hạn chế lớp phủ trên mobile. Chỉ dùng Alert Dialog khi hành động phá hủy vượt phạm vi màn hình hiện tại.
* Lỗi mạng: thông báo rõ bằng tiếng Việt đời thường ("Mất kết nối, thử lại") + nút Thử lại — không hiện mã lỗi kỹ thuật.

---

# 22. Khả năng tiếp cận (Accessibility)

* Tương phản màu ≥ WCAG AA.
* Cỡ chữ nội dung ≥ 16px (nhãn phụ ≥ 14px).
* Vùng chạm ≥ 48×48px trên mobile.
* Trạng thái **luôn kèm icon hoặc chữ**, không chỉ dựa vào màu.
* Nhãn rõ ràng cho mọi ô nhập và nút; hỗ trợ đọc màn hình.

---

# 23. Breakpoints (responsive)

Theo Tailwind, mobile-first:

| Tên | Bề rộng | Bố cục |
| --- | ------- | ------ |
| base (mobile) | < 640px | 1 cột, Bottom Nav, danh sách dạng thẻ, nút full-width |
| sm/md (tablet) | 640–1024px | 2 cột form, **vẫn Bottom Nav + FAB** (chưa có sidebar); nội dung hẹp **căn giữa** để không lệch |
| lg+ (desktop) | ≥ 1024px | Sidebar đầy đủ, bảng nhiều cột + phân trang, nội dung hẹp **căn trái** trong khung chung |

Nguyên tắc: thiết kế cho **base trước**, rồi thêm cột/khối khi màn hình rộng ra. Không thu nhỏ layout desktop xuống mobile.

---

# 24. Component & Lớp phủ (hạn chế modal)

Hiện tại codebase **viết tay bằng Tailwind v4 + lucide-react** theo token trong `globals.css` (chưa cài shadcn/ui). Khi bổ sung shadcn/ui, ưu tiên các component dưới đây và giữ đúng token hiện có:

* **Nhập liệu:** Button · Input · Select · Combobox · Calendar · Form (React Hook Form + Zod)
* **Hiển thị:** Card · Badge · Table / Data Table · Tabs · Accordion · Skeleton
* **Lớp phủ (mobile-friendly):** Sheet · Drawer · Popover · Dropdown Menu · Tooltip · Command
* **Phản hồi:** Sonner (toast) · Pagination

**Nguyên tắc hạn chế modal (bắt buộc, để mượt trên mobile):**

1. **Thêm / Sửa / Chi tiết** → **trang riêng** (route), không dùng Dialog.
2. **Lọc, menu phụ trên mobile** → Sheet trượt từ dưới.
3. **Xác nhận xóa** → inline confirm 2 bước (xem §21).
4. **Thêm nhanh mục danh mục/đơn vị...** → inline add row (ô nhập + nút ＋ ngay đầu danh sách).
5. Dropdown/Popover nhỏ (menu ⋮) được phép — nhưng phải fixed-position để không bị `overflow-hidden` cắt (§12.2).

---

# 25. Hướng thị giác tổng thể

* **Màu sắc & phong cách:** lấy cảm hứng **FarmGo** — xanh lá tươi thân thiện, **icon tile nhiều màu theo module**, sidebar nhóm nghiệp vụ, nút "+ Tạo mới" pill nổi bật.
* **Độ tối giản:** gọn gàng như Notion / Linear.
* **Card & Dashboard:** sạch, số liệu rõ như Stripe Dashboard.
* **Trọng tâm:** người dùng lớn tuổi, dùng điện thoại, bán hàng nhanh — mọi quyết định thiết kế phục vụ điều này.

Kết hợp: **cảm giác thị giác FarmGo** (màu sắc, tile, bố cục thân thiện) + **nghiệp vụ bán hàng** (không GIS/mùa vụ) + **mobile-first dễ dùng cho nông dân**.

Mục tiêu: một phần mềm bán hàng **dễ tới mức nông dân tự dùng được ngay**, mang phong cách FarmGo quen thuộc, chạy mượt trên điện thoại.
