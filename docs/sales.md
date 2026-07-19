# Sales — Bán hàng

> Module chính, dùng hằng ngày. Phase 1 tối ưu **quầy nông thôn**: nhanh, ít chạm, chữ to, mạng yếu vẫn dùng được (online mobile web). Tách từ mục 10 `base_spec.md`.

## Mục tiêu UX Phase 1

- **Hai kiểu khách quầy** đều xong trên **một màn Bán nhanh** (không đổi app).
- **≤ 3 chạm** khi khách đã biết tên thuốc / mang vỏ.
- **≤ 5–6 chạm** khi khách **kể bệnh** (gõ bệnh → chọn thuốc → thu).
- Hỏi diện tích / số con / đàn = **tùy chọn**, bỏ qua 1 chạm.
- Nút to, chữ to, bàn phím số; mobile-first; search bỏ dấu.

---

## Hành vi thực tế quầy nông thôn (cơ sở thiết kế)

| Kiểu khách | Việc xảy ra | Tần suất (ước) | Hệ thống phải |
|---|---|---|---|
| **A. Đã biết thuốc** | “Cho 2 chai X”, mang vỏ/ảnh | Rất cao | Ghim / top / quét / gõ tên SP → thu ngay |
| **B. Kể bệnh / triệu chứng** | “Lúa đạo ôn”, “heo tiêu chảy”, “tôm đốm trắng” | Cao — **khác biệt NomoGreen** | Gõ bệnh trên ô bán → ra bệnh + thuốc gợi ý (+ tuỳ hỏi liều) |
| **C. Ghi nợ / quen** | Gọi tên + “ghi sổ” | Cao | SĐT, dư nợ, 1 chạm ghi nợ |
| **D. Mua kèm** | Phân + thuốc, hoặc “thêm 1 bao” | Trung bình | Thêm dòng SP sau khi đã có thuốc từ bệnh |

**Không** ép mọi đơn qua hỏi đáp. **Không** chôn luồng B vào menu phụ khó tìm.

---

## Hai luồng chuẩn trên Bán nhanh

### Luồng A — Biết thuốc (tốc độ)

```
Ghim / Top / Quét / Gõ tên SP → SL → Thu / Ghi nợ → Xong
```

### Luồng B — Kể bệnh (cốt lõi ngành) — Phase 1 **bắt buộc hỗ trợ**

```
[Ô tìm trên Bán nhanh] gõ "đạo ôn" / "tiêu chảy heo" / triệu chứng
  → Kết quả nhóm Bệnh (ưu tiên khi query giống bệnh)
  → Chạm 1 bệnh
  → (Tuỳ chọn) Hỏi thêm: diện tích | số con | số đàn | …  [Bỏ qua]
  → Gợi ý SL sơ bộ (nếu có công thức + đã nhập)
  → Danh sách thuốc (ghim + khớp kho) kèm tồn
  → Chạm thuốc → thêm vào giỏ (SL sửa được)
  → (Tuỳ) thêm SP khác / chọn khách
  → Thu / Ghi nợ → Xong
  → Lưu snapshot: bệnh + câu trả lời hỏi (nếu có) trên đơn
```

Quy tắc:

- Không bắt buộc khách (vãng lai OK).
- Không Draft/Confirm — **hoàn thành = trừ tồn ngay**.
- Chỉ gợi ý, **không tự thêm** thuốc. Hết hàng / khóa / HSD / recall không bán (§18).
- Hỏi đáp **không bắt buộc** — mặc định có nút **Bỏ qua → xem thuốc ngay**.
- Owner tắt hết field hỏi của 1 bệnh → sau chọn bệnh **thẳng** ra thuốc (0 câu hỏi).

---

## Bán nhanh (Quick Sale) — màn hình duy nhất Phase 1

```
Chọn (SP hoặc Bệnh→thuốc) → SL → Thu tiền / Ghi nợ → Xong
```

- Phase 1 **chỉ Bán nhanh** tại quầy. Sales Order Draft = sau.
- Trả hàng (Sales Return) vẫn có.

### Chọn hàng — lối vào

1. **Ghim / Top / Gần đây** — luồng A.
2. **Quét barcode** — add ngay 1 dòng (nếu bật).
3. **Ô tìm chung** — gõ **một lần**, search song song 3 nguồn (xem dưới).
4. Nút phụ **“Bệnh hay gặp”** (ghim disease) — mở list bệnh đã ghim, không cần gõ.

### Ô tìm — 3 nguồn (song song)

1. **Sổ tay (bệnh / vấn đề)** — tên bệnh, alias, triệu chứng đời thường.
2. **Thuốc / SP** — tên, hoạt chất, SKU, barcode.
3. **Khách** — tên / SĐT → gắn khách; không khớp → **+ Tạo khách nhanh** (Tên + SĐT).

**Search nông thôn:** bỏ dấu, telex gần đúng, alias bệnh (“đạo ôn” / “dao on” / “cháy lá”).

**Thứ tự dropdown theo ngữ cảnh (không cố định Thuốc trước):**

| Tín hiệu query | Ưu tiên hiển thị |
|---|---|
| Khớp mạnh bệnh / triệu chứng / alias Sổ tay | **Bệnh → Thuốc → Khách** |
| Khớp mạnh tên SP / barcode / hoạt chất | **Thuốc → Bệnh → Khách** |
| Toàn số (SĐT) | **Khách → Thuốc → Bệnh** |
| Rỗng / chưa gõ | Ghim SP + Bệnh hay gặp (không dropdown dài) |

Tab chuyển nhóm luôn có. Sau khi chọn bệnh, vẫn gõ tiếp để thêm SP / khách.

### Sau chọn bệnh — panel gợi ý

1. Tên bệnh + đối tượng (lúa / lợn / tôm…) + ghi chú Owner (nếu có).
2. **Hỏi thêm (optional)** — field đã bật trên bệnh đó:
   - Cây: diện tích (sào/ha), giai đoạn, số lần phun…
   - Con: số con mắc, tổng đàn, cân nặng TB…
   - Thủy sản: diện tích ao, mật độ, ngày tuổi…
3. Nút **Bỏ qua** / **Xem thuốc**.
4. List thuốc: còn hàng trước; nhãn ghim / cùng hoạt chất; SL đề xuất (nếu tính được) — **sửa tay**.
5. Chạm = add giỏ; có thể chọn nhiều thuốc (phun + bám…).

Chi tiết schema field + công thức: `handbook.md` §21.7.  
**Phase 1 ship:** chọn bệnh → thuốc + hỏi optional tối thiểu (preset field, công thức số học đơn giản). Fallback 2 lớp tinh chỉnh = 1.1.

### Dòng hàng

- **Đơn vị bán** trên dòng — quy **Base Unit**.
- SL: bàn phím số, +/− to; prefill từ gợi ý liều nếu có.
- Giá: auto; **sửa tay luôn**.
- Tax: OFF mặc định.

### Thanh toán 1 chạm

| Nút | Hành vi |
|---|---|
| **Tiền mặt đủ** | Thu = tổng |
| **Một phần** | Nhập thu; phần còn nợ (cần SĐT) |
| **Ghi nợ hết** | Full nợ (cần SĐT) |

- **Khách đưa** → **Thối lại**.
- Chọn khách → hiện **dư nợ cũ**.
- Cash mặc định; CK / QR ghi nhận.

### Sau khi xong

- Trừ tồn, audit, công nợ, **snapshot bệnh + consult** (nếu có).
- In A5/thermal hoặc copy gửi Zalo.
- **Bán tiếp** — xóa giỏ, giữ context màn.

---

## Sales Return

```
Chọn đơn / SP trả → SL → Xác nhận
  → Tăng tồn
  → Điều chỉnh công nợ (nếu đơn ghi nợ)
```

Đơn giản: trả theo dòng SP; không quy trình duyệt.

---

## Sales Order (Draft) — ngoài luồng quầy Phase 1

Giữ concept cho sau / Advanced:

- Draft → Completed / Cancelled
- Dùng khi cần soạn dở, giao sau

**Phase 1 quầy không bắt buộc implement UI Sales Order** nếu Bán nhanh + Return đủ. API/schema có thể chừa.

---

## Ghi chú nông thôn

- Mọi context (bệnh, diện tích, số con…) **tùy chọn**.
- Empty state tenant mới: seed SP mẫu / bệnh vùng + Saler import Excel (Product/Customer).
- Offline bán đầy đủ = sau (PWA); Phase 1 = **mobile web online ổn định**, timeout/retry rõ, không mất giỏ khi lỗi mạng ngắn (giữ state client).
- Không nhồi dashboard trước khi bán xong đơn đang mở.
