"use client";

import {
	ArrowLeft,
	CheckCircle2,
	Minus,
	Plus,
	SaveAll,
	ShoppingCart,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CustomerPicker } from "@/components/app/sales/customer-picker";
import { ProductPicker } from "@/components/app/sales/product-picker";
import { formatVND } from "@/lib/format";
import {
	lineTotal,
	type OrderLine,
	type OrderStatus,
	repriceLine,
	resolveTierPrice,
} from "@/lib/orders";
import type { Product } from "@/lib/products";

/**
 * Form tạo đơn bán hàng (DESIGN.md §24 — trang riêng, không modal).
 * Chọn khách → thêm hàng (giá bậc tự áp) → chiết khấu → Lưu nháp / Hoàn thành.
 * FE-only: state cục bộ, chưa nối API.
 */
export function OrderForm() {
	const router = useRouter();
	const [customerId, setCustomerId] = useState<string | undefined>();
	const [lines, setLines] = useState<OrderLine[]>([]);
	const [discount, setDiscount] = useState("");
	const [note, setNote] = useState("");

	const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
	const discountNum = Number(discount.replace(/\D/g, "")) || 0;
	const total = Math.max(0, subtotal - discountNum);
	const empty = lines.length === 0;

	function addProduct(product: Product) {
		setLines((current) => {
			const existing = current.find((l) => l.productId === product.id);
			if (existing) {
				return current.map((l) =>
					l.productId === product.id
						? {
								...l,
								qty: l.qty + 1,
								price: resolveTierPrice(product, l.qty + 1),
							}
						: l,
				);
			}
			return [
				...current,
				{
					productId: product.id,
					name: product.name,
					unit: product.baseUnit,
					qty: 1,
					price: resolveTierPrice(product, 1),
				},
			];
		});
	}

	function changeQty(productId: string, delta: number) {
		setLines((current) =>
			current.flatMap((l) => {
				if (l.productId !== productId) return [l];
				const qty = l.qty + delta;
				if (qty <= 0) return [];
				return [{ ...l, qty, price: repriceLine(l, qty) }];
			}),
		);
	}

	function setPrice(productId: string, price: number) {
		setLines((current) =>
			current.map((l) => (l.productId === productId ? { ...l, price } : l)),
		);
	}

	function removeLine(productId: string) {
		setLines((current) => current.filter((l) => l.productId !== productId));
	}

	function save(_status: OrderStatus) {
		// TODO: gọi API tạo đơn (Draft lưu nháp / Completed cộng doanh thu + trừ tồn).
		router.push("/don-ban-hang");
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-[calc(168px+env(safe-area-inset-bottom,0px))] lg:mx-0 lg:pb-0">
			{/* Header */}
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/don-ban-hang")}
					aria-label="Quay lại danh sách"
					className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div className="flex flex-col gap-1 pt-0.5">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Tạo đơn bán hàng
					</h1>
					<p className="text-base text-[#616161]">
						Đơn có quản lý — dùng khi cần công nợ hoặc giao sau.
					</p>
				</div>
			</div>

			{/* Khách hàng */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Khách hàng
				</h2>
				<CustomerPicker value={customerId} onChange={setCustomerId} />
			</section>

			{/* Thêm hàng */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Hàng hóa
				</h2>
				<ProductPicker onSelect={addProduct} />

				{empty ? (
					<div className="flex flex-col items-center gap-2 py-6 text-center">
						<span className="flex size-12 items-center justify-center rounded-full bg-[#f5f5f5]">
							<ShoppingCart className="size-6 text-[#9e9e9e]" aria-hidden />
						</span>
						<p className="text-base text-[#616161]">
							Chưa có hàng nào trong đơn.
						</p>
					</div>
				) : (
					<ul className="flex flex-col divide-y divide-border">
						{lines.map((l) => (
							<li
								key={l.productId}
								className="flex flex-col gap-3 py-3.5 first:pt-1"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex min-w-0 flex-col">
										<span className="text-base font-semibold text-foreground">
											{l.name}
										</span>
										<span className="text-sm text-[#9e9e9e]">
											Đơn vị: {l.unit}
										</span>
									</div>
									<button
										type="button"
										onClick={() => removeLine(l.productId)}
										aria-label="Bỏ khỏi đơn"
										className="flex size-9 shrink-0 items-center justify-center rounded-[8px] text-[#9e9e9e] transition-colors hover:bg-[#fdecea] hover:text-destructive"
									>
										<Trash2 className="size-5" aria-hidden />
									</button>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => changeQty(l.productId, -1)}
											aria-label="Giảm"
											className="flex size-10 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-[#f5f5f5]"
										>
											<Minus className="size-4.5" aria-hidden />
										</button>
										<span className="w-9 text-center text-lg font-bold text-foreground">
											{l.qty}
										</span>
										<button
											type="button"
											onClick={() => changeQty(l.productId, 1)}
											aria-label="Tăng"
											className="flex size-10 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-[#f5f5f5]"
										>
											<Plus className="size-4.5" aria-hidden />
										</button>
									</div>
									<div className="flex flex-col items-end gap-0.5">
										<div className="flex items-center gap-1">
											<input
												inputMode="numeric"
												value={formatVND(l.price)}
												onChange={(e) =>
													setPrice(
														l.productId,
														Number(e.target.value.replace(/\D/g, "")) || 0,
													)
												}
												aria-label="Đơn giá"
												className="w-24 rounded-[8px] border border-border bg-white px-2 py-1 text-right text-base font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
											/>
											<span className="text-sm text-[#9e9e9e]">₫</span>
										</div>
										<span className="text-base font-bold text-foreground">
											{formatVND(lineTotal(l))}₫
										</span>
									</div>
								</div>
							</li>
						))}
					</ul>
				)}
			</section>

			{/* Chiết khấu + ghi chú */}
			{!empty ? (
				<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="discount"
							className="text-sm font-semibold text-[#616161]"
						>
							Chiết khấu (₫)
						</label>
						<div className="relative">
							<input
								id="discount"
								inputMode="numeric"
								value={discount ? formatVND(discountNum) : ""}
								onChange={(e) => setDiscount(e.target.value)}
								placeholder="0"
								className="h-12 w-full rounded-[10px] border border-border bg-white pl-4 pr-9 text-right text-base font-medium text-foreground placeholder:text-[#cfcfcf] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
							/>
							<span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-[#9e9e9e]">
								₫
							</span>
						</div>
					</div>
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="note"
							className="text-sm font-semibold text-[#616161]"
						>
							Ghi chú
						</label>
						<textarea
							id="note"
							value={note}
							onChange={(e) => setNote(e.target.value)}
							rows={2}
							placeholder="Giao chiều thứ 6, khách hẹn trả sau..."
							className="w-full resize-none rounded-[10px] border border-border bg-white px-4 py-3 text-base text-foreground placeholder:text-[#cfcfcf] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
						/>
					</div>

					{/* Tổng kết */}
					<div className="flex flex-col gap-2 border-t border-border pt-4">
						<div className="flex items-center justify-between text-base text-[#616161]">
							<span>Tạm tính</span>
							<span className="font-medium text-foreground">
								{formatVND(subtotal)}₫
							</span>
						</div>
						<div className="flex items-end justify-between">
							<span className="text-base font-semibold text-foreground">
								Tổng cộng
							</span>
							<span className="text-[26px] font-bold leading-none text-foreground">
								{formatVND(total)}
								<span className="ml-1 text-lg">₫</span>
							</span>
						</div>
					</div>
				</section>
			) : null}

			{/* Nút lưu — dính đáy trên mobile, inline trên desktop */}
			<div className="fixed inset-x-0 bottom-nav-safe z-30 flex items-center gap-3 border-t border-border bg-card px-4 py-3 lg:static lg:justify-end lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
				<button
					type="button"
					disabled={empty}
					onClick={() => save("draft")}
					className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[10px] border border-border bg-white text-base font-semibold text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50 lg:h-12 lg:flex-none lg:px-6"
				>
					<SaveAll className="size-5" aria-hidden />
					Lưu nháp
				</button>
				<button
					type="button"
					disabled={empty}
					onClick={() => save("completed")}
					className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32] disabled:cursor-not-allowed disabled:bg-[#a5d6a7] lg:h-12 lg:flex-none lg:px-8"
				>
					<CheckCircle2 className="size-6" aria-hidden />
					Hoàn thành
				</button>
			</div>
		</div>
	);
}
