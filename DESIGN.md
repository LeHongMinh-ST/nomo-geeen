# NomoGreen Design System

> **Version:** 2.6
> **Framework:** Next.js 16 + React 19 + Tailwind CSS v4 + lucide-react (shadcn/ui bổ sung khi cần — xem §24) · **PWA** (§26)
> **Design Style:** Logo dual-tone Green+Blue (user app) · FarmGo multi-tile (admin) · nền trắng dịu
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

Nguồn nhận diện **chính = logo** `frontend/public/images/logo.png` (sampled):

* Vòng tròn / chữ GREEN: ~`#68C048` · `#79C652`
* Chữ NOMO: ~`#1A6FA8` · `#1058A0`
* Landing `docs/NomoGreen Website.dc.html` chỉ tham chiếu phụ — **không** ghi đè logo.

## Brand Green (màu hành động — lấy từ logo, dịu hơn khi UI)

| Tên            | Hex     | Dùng cho |
| -------------- | ------- | -------- |
| Primary        | #5CAD45 | Nút chính, link, tab active (logo green giảm bão hòa ~10%) |
| Primary Hover  | #4F9C3A | Hover |
| Primary Active | #3F8530 | Nhấn |
| Primary Soft   | #F3F8F1 | Hàng chọn, badge nền — rất nhạt |
| Logo Green     | #68C048 | Khớp logo (icon mark, wordmark GREEN) |
| Logo Green Lite| #79C652 | Highlight nhỏ (dot) — **không** nền lớn |

**Dịu mắt:** Primary UI hơi trầm hơn logo để nút lớn không rực. Wordmark / favicon giữ `#68C048`. Soft fill ≤ 10% diện tích. **Không** panel xanh đậm full-height trong app/login.

## Brand Blue (chữ NOMO)

| Tên        | Hex     | Dùng cho |
| ---------- | ------- | -------- |
| Brand Blue | #1A6FA8 | Wordmark "NOMO", info, accent phụ |
| Brand Blue Dark | #1058A0 | Hover link phụ |

Không dùng Brand Blue cho nút chính.

## Nền (trắng chủ đạo)

| Tên            | Hex     |
| -------------- | ------- |
| App Background | #FFFFFF |
| Surface Soft   | #F8F9F8 |
| Card           | #FFFFFF |
| Sidebar        | #FFFFFF |
| Header         | #FFFFFF |
| Border Soft    | #E6EAE6 |

**Quy tắc:** nền app/card/sidebar/header = trắng hoặc xám gần trắng. Brand green chỉ nút / link / tab active / badge success.

**Ngoại lệ mặt tiền:** panel giới thiệu ở trang đăng nhập (`app/dang-nhap/page.tsx`, cột trái desktop) dùng gradient tròn lấy cảm hứng từ logo — radial-gradient xanh lá lệch góc trên phải (mô phỏng khối tròn logo), điểm sáng trắng mờ lồng bên trong (mô phỏng catch-light), và một khối xanh dương nhạt góc dưới trái. Chỉ áp dụng cho panel marketing trước đăng nhập, không dùng cho nền app sau đăng nhập.

## Trung tính / Ink

| Tên      | Hex     |
| -------- | ------- |
| Gray 50  | #FAFBFA |
| Gray 100 | #F4F5F4 |
| Gray 200 | #E6EAE6 |
| Gray 300 | #D0D5D0 |
| Gray 500 | #8A918A |
| Gray 700 | #5C635C |
| Gray 900 | #1B1F1B |
| Heading  | #1B1F1B |
| Muted    | #6B716B |

## Màu trạng thái

| Ý nghĩa | Hex | Dùng cho |
| ------- | --- | -------- |
| Success | #5CAD45 | Hoàn thành, đã thanh toán, còn hàng |
| Warning | #E6A817 | Sắp hết / sắp đến hạn (bớt rực hơn #F9A825) |
| Error   | #D64540 | Hết hàng, quá hạn |
| Info    | #1A6FA8 | Thông tin (NOMO blue) |

## Icon tile — phân tầng theo app

### App chủ cửa hàng (user)

**Hai màu logo** xen kẽ theo nhóm nghiệp vụ — tránh monochrome nhàm, vẫn bám brand:

| Nhóm | Hex | Token |
| ---- | --- | ----- |
| Bán hàng · Kho · Trang chủ | #5CAD45 | `USER_TILE_GREEN` |
| Đối tác · Công nợ · Báo cáo · Thiết lập | #1A6FA8 | `USER_TILE_BLUE` |

* Nút chính / CTA / tab active: **luôn** Brand Green `#5CAD45` — không dùng blue cho nút.
* Badge trạng thái (cảnh báo/lỗi) **vẫn** màu trạng thái — không gộp vào tile.
* Không rainbow FarmGo (purple/orange/teal) ở app user.
* Token: `frontend/lib/navigation.ts` (`USER_TILE` = alias green).

### App quản trị (admin)

Giữ **Module Accent nhiều màu** kiểu FarmGo (nhận diện phân hệ nhanh). Xem `frontend/lib/admin-navigation.ts`.

| Phân hệ | Hex (admin only) |
| ------- | --- |
| Bán hàng / platform green | #43A047 |
| Khách / tenant blue | #1E88E5 |
| Gói / purple | #7E57C2 |
| Cảnh báo / orange | #F4511E |
| Kho / indigo | #3949AB |
| Teal | #26A69A |
| Slate | #546E7A |

Quy tắc tile chung:

* Tile vuông bo góc 10px, icon trắng, kích thước 40×40 (mobile 44×44).
* Không dùng màu tile cho text, nút bấm hay badge trạng thái.
* Áp dụng cho nav, dashboard, danh sách chức năng trong app (sau khi đăng nhập).

### Icon outline — riêng cho mặt tiền trước đăng nhập (hero/marketing)

Trang đăng nhập (`app/dang-nhap/page.tsx`) không dùng tile nền đặc vì đây là mặt tiền thương hiệu, cần nhẹ nhàng, "thuận mắt" hơn giao diện tác vụ. Dùng biến thể outline trần (không nền, không viền):

* Icon đứng độc lập, không nền/tile bọc quanh, kích thước 32×32.
* Icon màu accent (không tô trắng), `strokeWidth={1.75}`.
* Màu accent theo đúng nhóm nghiệp vụ ở bảng trên (Bán hàng/Kho = green, Công nợ = blue).

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
| Primary | #5CAD45 → hover #4F9C3A → active #3F8530 | Trắng | Hành động chính: "Bán hàng", "Lưu", "Thu tiền" |
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
[ Trang chủ ]  [ Đơn hàng ]  [  + Bán  ]  [ Sổ tay ]  [ Khác ]
```

* Nút giữa **"+ Bán"** (Bán nhanh) nổi lên, to nhất, màu Primary — hành động dùng nhiều nhất.
* Mỗi mục: icon + nhãn ngắn, vùng chạm ≥ 48px.
* Mục active: icon + chữ đổi sang **màu tile của chính mục đó** (xanh lá `#5CAD45` hoặc xanh dương `#1565C0`) — không cố định xanh lá cho mọi mục, tránh lệch màu với icon tile (vd. "Công nợ" active phải xanh dương, không xanh lá).
* "Khác" mở Sheet chứa các mục còn lại: Nhập hàng, Kho, Khách hàng, Nhà cung cấp, Báo cáo, Thiết lập.

## 10.2 Desktop — Sidebar (kiểu FarmGo)

* Nền trắng, rộng 260px, thu gọn còn 64px (chỉ icon + tooltip khi hover).
* Khối thương hiệu đầu sidebar: **logo chính** (`images/logo.png`, icon + wordmark NOMO GREEN) ở trên, tên cửa hàng + lĩnh vực xếp **dưới logo** (không đặt ngang hàng icon nhỏ + chữ). Toàn khối **căn trái**, thẳng hàng với padding sidebar và các mục điều hướng bên dưới — không căn giữa. Có `border-b` mảnh phân tách khối này với danh sách nav bên dưới.
* Mỗi mục: **icon tile màu module accent** (mục 3) + nhãn tiếng Việt ngắn (≤ 3 từ) — nhận diện bằng màu như FarmGo.
* Mục active: nền + thanh chỉ báo 3px đổi theo **màu tile của chính mục đó** — nhóm xanh lá dùng nền Primary Soft `#F3F8F1` + chỉ báo `#3F8530`; nhóm xanh dương dùng nền Info Soft `#E3F2FD` + chỉ báo `#1565C0`. Không cố định xanh lá cho mọi mục — tránh lệch màu giữa nền active và icon tile.
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

* Header nền Gray100, hover hàng = Primary Soft, chọn = #F3F8F1.
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

Bộ lọc dùng **ô Select** (shadcn/ui — `components/ui/select.tsx`) thống nhất mọi loại giá trị (cố định hay động: trạng thái tồn, trạng thái đơn, danh mục, lĩnh vực...). Trình bày **khác theo thiết bị** qua component dùng chung `ListFilterBar` (`components/app/shared/list-filter-bar.tsx`):

* **Desktop (`lg+`):** các ô **Select inline** cạnh nhau trên toolbar (dropdown mở xuống), mỗi ô có nhãn tiền tố ("Trạng thái: …").
* **Mobile/tablet (`< lg`):**
  * **1 nhóm lọc** → render Select trực tiếp (cao 48px, dễ chạm).
  * **≥ 2 nhóm lọc** → nút **"Bộ lọc"** (icon `SlidersHorizontal`) + badge số nhóm đang khác mặc định; bấm mở **Drawer trượt từ dưới** (kiểu Traveloka, `components/ui/drawer.tsx` — vaul) chứa từng nhóm là 1 khối nhãn + Select. Đáy drawer có nút **"Áp dụng"** (Primary, full-width) và **"Đặt lại"** (ghost, đưa mọi nhóm về mặc định). Chọn trong drawer cập nhật danh sách ngay (live).
* **Bộ đổi góc nhìn chính** (vd. "Phải thu / Phải trả" ở Công nợ — đổi cả dữ liệu + KPI, không phải lọc phụ) vẫn giữ **segmented control** 2 ô để nổi bật, không đưa vào Select.
* Không dùng Dialog giữa màn cho lọc — luôn Select inline (desktop) hoặc Drawer dưới (mobile).


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

## 15.1 Nút quét mã vạch (mobile)

Trên **màn Bán nhanh và Tạo đơn bán hàng**, cạnh phải ô tìm sản phẩm có **nút quét mã vạch** (icon `ScanLine`), chỉ hiện ở `< lg` (mobile/tablet — desktop dùng máy quét cắm ngoài gõ thẳng vào ô tìm).

* Bấm nút mở **Sheet quét** trượt từ dưới (không modal — §24): khung **camera preview** (`getUserMedia`, `facingMode: environment`) + khung ngắm, kèm **ô nhập/dán mã vạch bằng tay**.
* **Giai đoạn hiện tại:** camera chỉ để canh mã; **nhập tay là đường thêm hàng chính thức**. Gõ mã → tra sản phẩm theo `barcode` → thêm vào giỏ (giá bậc tự áp như chọn tay).
* Mã không khớp / hàng đã hết → báo lỗi tiếng Việt ngay trong sheet, không đóng.
* Máy chưa cấp quyền hoặc không hỗ trợ camera (iOS Safari cũ) → vẫn dùng được ô nhập tay; hiện trạng thái rõ ("Chưa cấp quyền camera" / "Thiết bị không hỗ trợ").
* **Tự động giải mã ảnh** (BarcodeDetector API) và **máy quét chuyên dụng** tích hợp sau — nút và luồng giữ nguyên, chỉ bổ sung bước giải mã.

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

Thứ tự ưu tiên trên mobile (cuộn dọc) — cảm giác app native (PWA):

```
0. Header gọn: ngày + "Chào …" + CTA "Bán" (h-12, Primary)
1. KPI hero full-width: Doanh thu hôm nay (số ≥ 32px) + delta + số đơn
2. KPI phụ 2 cột: Doanh thu tháng · Phải thu (tap → /cong-no)
3. Cảnh báo: Hàng sắp hết · Nợ đến hạn · Hàng sắp hết hạn
   · mobile: horizontal snap-scroll chips (không stack 3 card dọc)
   · sm+: grid 3 cột
4. Lối tắt nhanh: [Bán hàng] [Nhập hàng] [Thu nợ]  (tile ≥ 96px, icon module accent)
5. Biểu đồ doanh thu 7 ngày (cột, nhãn số khi chạm; hôm nay đậm hơn)
6. Bán chạy trong tháng
```

* KPI hero: nền Primary Soft `#F3F8F1`, border soft green, orb radial nhẹ — **không** panel xanh đậm.
* Số tiền `tabular-nums`, tối thiểu 18px (hero 32px).
* Cảnh báo: màu + chữ + icon; badge tổng "N việc" cạnh tiêu đề.
* Press feedback: `active:scale-[0.97]` 150–200ms; `touch-manipulation` trên chart bars.

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

Codebase chủ yếu **viết tay bằng Tailwind v4 + lucide-react** theo token trong `globals.css`. **Đã cài shadcn/ui** (style `new-york`, `components.json` + `lib/utils.ts` `cn()`) và đưa vào dùng dần — hiện có `Select` và `Drawer` (`components/ui/`) phục vụ bộ lọc (§12.4). Khi bổ sung component mới, cài qua shadcn CLI hoặc thêm tay vào `components/ui/`, luôn giữ đúng token HEX hiện có (không để CLI ghi đè `globals.css`):

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

---

# 26. Progressive Web App (PWA)

NomoGreen triển khai theo hướng **PWA**: chạy trên trình duyệt nhưng **cài được lên màn hình chính** điện thoại như một app, mở toàn màn hình, khởi động nhanh. Đây là lựa chọn thay cho app native ở giai đoạn đầu — một codebase web, cài không qua chợ ứng dụng, cập nhật tức thì.

## 26.1 Nguyên tắc

* **Cài được (installable):** có `manifest.webmanifest` + service worker hợp lệ để trình duyệt hiện "Thêm vào màn hình chính".
* **Standalone:** khi mở từ màn hình chính, chạy toàn màn (`display: standalone`), ẩn thanh địa chỉ — cảm giác như app thật.
* **Mobile-first, an toàn ngoại tuyến nhẹ:** app-shell (khung, trang chính) mở được khi mạng chập chờn; **không cache dữ liệu bán hàng** (đơn, tồn, công nợ luôn realtime).
* **Nhận diện thương hiệu:** logo NomoGreen (vòng xanh + N trắng), theme color `#5CAD45` cho thanh trạng thái.

## 26.2 Manifest (`/public/manifest.webmanifest`)

| Khóa | Giá trị |
| ---- | ------- |
| `name` | NomoGreen — Bán hàng vật tư nông nghiệp |
| `short_name` | NomoGreen |
| `start_url` | `/trang-chu` |
| `scope` | `/` |
| `display` | `standalone` |
| `orientation` | `portrait` |
| `background_color` | `#FFFFFF` (App Background) |
| `theme_color` | `#5CAD45` (Primary) |
| `icons` | 192 / 512 (`any`) + 512 (`maskable`) |
| `shortcuts` | Bán nhanh (`/ban-nhanh`), Đơn bán hàng (`/don-ban-hang`) |

* **Icon:** đặt ở `/public/icons/`. Bắt buộc có bản **maskable** (nền brand phủ kín, nội dung trong safe-zone ~64% giữa) để không bị cắt xấu trên Android. Thêm `apple-touch-icon` cho iOS.
* **Shortcuts:** nhấn giữ icon app hiện lối tắt nhanh tới 2 nghiệp vụ dùng nhiều nhất.

## 26.3 Service worker (`/public/sw.js`)

* Đăng ký ở client, **chỉ chạy production** (không cản HMR khi dev).
* **Điều hướng (HTML):** network-first, fallback cache khi mất mạng (về được `/trang-chu`).
* **Static (font, icon, ảnh, css, js):** cache-first; đổi tên file khi đổi nội dung để bust cache.
* **Không đụng API/POST:** dữ liệu nghiệp vụ không cache — tránh hiển thị số liệu cũ.
* Versioned cache (`nomo-v1`); `activate` dọn cache phiên bản cũ.

## 26.4 Meta (trong `app/layout.tsx`)

* `manifest`, `themeColor` (`viewport` export), `appleWebApp` (capable + title), `icons` (icon + apple-touch).
* `viewport-fit: cover` để dùng hết màn hình máy có tai thỏ; kết hợp `dvh` và `env(safe-area-inset-*)` khi cần.

## 26.5 Chưa làm (giai đoạn sau)

* Push notification, background sync, offline ghi đơn rồi đồng bộ lại.
* Tự giải mã barcode bằng camera (BarcodeDetector) và **máy quét phần cứng** — xem §15.1.
