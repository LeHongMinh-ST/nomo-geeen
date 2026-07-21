"use client";

import type { LucideIcon } from "lucide-react";
import {
	ArrowLeft,
	Banknote,
	CheckCircle2,
	Minus,
	PackagePlus,
	Plus,
	SaveAll,
	Smartphone,
	Trash2,
	Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SupplierPicker } from "@/components/app/purchase/supplier-picker";
import { ProductPicker } from "@/components/app/sales/product-picker";
import { formatVND } from "@/lib/format";
import type { Product } from "@/lib/products";
import {
	type PurchaseLine,
	type PurchasePayment,
	type PurchaseStatus,
	purchaseLineTotal,
} from "@/lib/purchases";
import { createTenantPurchase } from "@/lib/tenant-purchases-api";

/**
 * Form tạo phiếu nhập (DESIGN.md §24 — trang riêng, không modal).
 * Chọn NCC → thêm SP (đơn vị nhập + quy đổi Base Unit + lô/HSD) → chiết khấu
 * + vận chuyển → hình thức thanh toán → Lưu nháp / Hoàn thành.
 * API-backed: form state is submitted to the tenant purchase API.
 */

const payments: { value: PurchasePayment; label: string; icon: LucideIcon }[] =
	[
		{ value: "cash", label: "Tiền mặt", icon: Banknote },
		{ value: "transfer", label: "Chuyển khoản", icon: Smartphone },
		{ value: "debt", label: "Ghi nợ", icon: Wallet },
	];

export function PurchaseForm() {
	const router = useRouter();
	const [supplierId, setSupplierId] = useState<string | undefined>();
	const [lines, setLines] = useState<PurchaseLine[]>([]);
	const [discount, setDiscount] = useState("");
	const [shipping, setShipping] = useState("");
	const [payment, setPayment] = useState<PurchasePayment>("cash");
	const [note, setNote] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const retryKey = useRef(crypto.randomUUID());

	const subtotal = lines.reduce((sum, l) => sum + purchaseLineTotal(l), 0);
	const discountNum = Number(discount.replace(/\D/g, "")) || 0;
	const shippingNum = Number(shipping.replace(/\D/g, "")) || 0;
	const total = Math.max(0, subtotal - discountNum + shippingNum);
	const empty = lines.length === 0;
	const canSave =
		!empty &&
		Boolean(supplierId) &&
		lines.every((line) => Boolean(line.unitId));

	function addProduct(product: Product) {
		setLines((current) => {
			const existing = current.find((l) => l.productId === product.id);
			if (existing) {
				return current.map((l) =>
					l.productId === product.id ? { ...l, qty: l.qty + 1 } : l,
				);
			}
			// Đơn vị nhập mặc định = đơn vị quy đổi lớn đầu tiên (nếu có), factor tương ứng.
			const conv = product.conversions[0];
			return [
				...current,
				{
					productId: product.id,
					name: product.name,
					unitId: product.baseUnitId,
					unit: conv?.unit ?? product.baseUnit,
					factor: conv?.factor ?? 1,
					qty: 1,
					cost: product.costPrice * (conv?.factor ?? 1),
				},
			];
		});
	}

	function patchLine(productId: string, patch: Partial<PurchaseLine>) {
		setLines((current) =>
			current.map((l) => (l.productId === productId ? { ...l, ...patch } : l)),
		);
	}

	function changeQty(productId: string, delta: number) {
		setLines((current) =>
			current.flatMap((l) => {
				if (l.productId !== productId) return [l];
				const qty = l.qty + delta;
				if (qty <= 0) return [];
				return [{ ...l, qty }];
			}),
		);
	}

	function removeLine(productId: string) {
		setLines((current) => current.filter((l) => l.productId !== productId));
	}

	async function save(status: PurchaseStatus) {
		if (!supplierId || !canSave || pending) return;
		setPending(true);
		setError(null);
		try {
			await createTenantPurchase({
				idempotencyKey: retryKey.current,
				supplierId,
				status: status === "completed" ? "COMPLETED" : "DRAFT",
				discountAmount: discountNum,
				shippingFee: shippingNum,
				amountPaid: payment === "debt" ? 0 : total,
				paymentMethod:
					payment === "transfer"
						? "BANK_TRANSFER"
						: payment === "debt"
							? "DEBT"
							: "CASH",
				note: note || undefined,
				lines: lines.map((line) => ({
					productId: line.productId,
					unitId: line.unitId as string,
					qty: String(line.qty),
					unitPrice: line.cost,
					lineDiscount: 0,
					batchCode: line.batch,
					expiresAt: line.expiry,
				})),
			});
			router.push("/nhap-hang");
		} catch (reason) {
			setError(
				reason instanceof Error
					? reason.message
					: "Không thể lưu phiếu nhập. Vui lòng thử lại.",
			);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-[calc(168px+env(safe-area-inset-bottom,0px))] lg:mx-0 lg:pb-0">
			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive bg-[#fdecea] px-4 py-3 text-sm text-destructive"
				>
					{error}
				</div>
			) : null}

			{/* Header */}
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/nhap-hang")}
					aria-label="Quay lại danh sách"
					className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div className="flex flex-col gap-1 pt-0.5">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Tạo phiếu nhập
					</h1>
					<p className="text-base text-[#616161]">
						Nhập hàng một bước — hoàn thành là cộng tồn ngay.
					</p>
				</div>
			</div>

			{/* Nhà cung cấp */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Nhà cung cấp *
				</h2>
				<SupplierPicker value={supplierId} onChange={setSupplierId} />
			</section>

			{/* Thêm hàng */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Hàng nhập
				</h2>
				<ProductPicker
					onSelect={addProduct}
					placeholder="Tìm sản phẩm, quét mã..."
				/>

				{empty ? (
					<div className="flex flex-col items-center gap-2 py-6 text-center">
						<span className="flex size-12 items-center justify-center rounded-full bg-[#f5f5f5]">
							<PackagePlus className="size-6 text-[#9e9e9e]" aria-hidden />
						</span>
						<p className="text-base text-[#616161]">
							Chưa có hàng nào trong phiếu.
						</p>
					</div>
				) : (
					<ul className="flex flex-col divide-y divide-border">
						{lines.map((l) => (
							<PurchaseLineRow
								key={l.productId}
								line={l}
								onInc={() => changeQty(l.productId, 1)}
								onDec={() => changeQty(l.productId, -1)}
								onPatch={(patch) => patchLine(l.productId, patch)}
								onRemove={() => removeLine(l.productId)}
							/>
						))}
					</ul>
				)}
			</section>

			{/* Chiết khấu + vận chuyển + thanh toán + ghi chú */}
			{!empty ? (
				<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<div className="grid grid-cols-2 gap-3">
						<MoneyField
							id="discount"
							label="Chiết khấu (₫)"
							value={discountNum ? formatVND(discountNum) : ""}
							onChange={setDiscount}
						/>
						<MoneyField
							id="shipping"
							label="Vận chuyển (₫)"
							value={shippingNum ? formatVND(shippingNum) : ""}
							onChange={setShipping}
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<span className="text-sm font-semibold text-[#616161]">
							Hình thức thanh toán
						</span>
						<div className="grid grid-cols-3 gap-2">
							{payments.map((p) => {
								const active = payment === p.value;
								return (
									<button
										key={p.value}
										type="button"
										onClick={() => setPayment(p.value)}
										className={`flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-[12px] border text-sm font-semibold transition-colors duration-200 ease-out ${
											active
												? "border-primary bg-accent text-accent-foreground"
												: "border-border bg-card text-[#616161] hover:bg-[#f5f5f5]"
										}`}
									>
										<p.icon className="size-5.5" aria-hidden />
										{p.label}
									</button>
								);
							})}
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
							placeholder="Giao tận kho, hẹn trả sau..."
							className="w-full resize-none rounded-[10px] border border-border bg-white px-4 py-3 text-base text-foreground placeholder:text-[#cfcfcf] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
						/>
					</div>

					{/* Tổng kết */}
					<div className="flex flex-col gap-2 border-t border-border pt-4">
						<div className="flex items-center justify-between text-base text-[#616161]">
							<span>Tiền hàng</span>
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

			{/* Nút lưu — dính đáy mobile, inline desktop */}
			<div className="fixed inset-x-0 bottom-nav-safe z-30 flex items-center gap-3 border-t border-border bg-card px-4 py-3 lg:static lg:justify-end lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
				<button
					type="button"
					disabled={!canSave || pending}
					onClick={() => save("draft")}
					className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[10px] border border-border bg-white text-base font-semibold text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50 lg:h-12 lg:flex-none lg:px-6"
				>
					<SaveAll className="size-5" aria-hidden />
					Lưu nháp
				</button>
				<button
					type="button"
					disabled={!canSave}
					onClick={() => save("completed")}
					className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] disabled:cursor-not-allowed disabled:bg-[#a5d6a7] lg:h-12 lg:flex-none lg:px-8"
				>
					<CheckCircle2 className="size-6" aria-hidden />
					Hoàn thành
				</button>
			</div>
		</div>
	);
}

function MoneyField({
	id,
	label,
	value,
	onChange,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={id} className="text-sm font-semibold text-[#616161]">
				{label}
			</label>
			<div className="relative">
				<input
					id={id}
					inputMode="numeric"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder="0"
					className="h-12 w-full rounded-[10px] border border-border bg-white pl-4 pr-9 text-right text-base font-medium text-foreground placeholder:text-[#cfcfcf] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
				/>
				<span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-[#9e9e9e]">
					₫
				</span>
			</div>
		</div>
	);
}

function PurchaseLineRow({
	line,
	onInc,
	onDec,
	onPatch,
	onRemove,
}: {
	line: PurchaseLine;
	onInc: () => void;
	onDec: () => void;
	onPatch: (patch: Partial<PurchaseLine>) => void;
	onRemove: () => void;
}) {
	return (
		<li className="flex flex-col gap-3 py-3.5 first:pt-1">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col">
					<span className="text-base font-semibold text-foreground">
						{line.name}
					</span>
					<span className="text-sm text-[#9e9e9e]">
						1 {line.unit} = {line.factor} đơn vị gốc
					</span>
				</div>
				<button
					type="button"
					onClick={onRemove}
					aria-label="Bỏ khỏi phiếu"
					className="flex size-9 shrink-0 items-center justify-center rounded-[8px] text-[#9e9e9e] transition-colors hover:bg-[#fdecea] hover:text-destructive"
				>
					<Trash2 className="size-5" aria-hidden />
				</button>
			</div>

			<div className="flex items-center justify-between gap-3">
				{/* Số lượng */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onDec}
						aria-label="Giảm"
						className="flex size-10 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-[#f5f5f5]"
					>
						<Minus className="size-4.5" aria-hidden />
					</button>
					<span className="w-9 text-center text-lg font-bold text-foreground">
						{line.qty}
					</span>
					<button
						type="button"
						onClick={onInc}
						aria-label="Tăng"
						className="flex size-10 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-[#f5f5f5]"
					>
						<Plus className="size-4.5" aria-hidden />
					</button>
				</div>

				{/* Giá vốn / đơn vị nhập */}
				<div className="flex flex-col items-end gap-0.5">
					<div className="flex items-center gap-1">
						<input
							inputMode="numeric"
							value={formatVND(line.cost)}
							onChange={(e) =>
								onPatch({
									cost: Number(e.target.value.replace(/\D/g, "")) || 0,
								})
							}
							aria-label="Giá vốn"
							className="w-28 rounded-[8px] border border-border bg-white px-2 py-1 text-right text-base font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
						/>
						<span className="text-sm text-[#9e9e9e]">₫</span>
					</div>
					<span className="text-base font-bold text-foreground">
						{formatVND(purchaseLineTotal(line))}₫
					</span>
				</div>
			</div>

			{/* Lô + HSD */}
			<div className="grid grid-cols-2 gap-2">
				<input
					value={line.batch ?? ""}
					onChange={(e) => onPatch({ batch: e.target.value })}
					placeholder="Số lô (tùy chọn)"
					className="h-11 rounded-[10px] border border-border bg-white px-3 text-base text-foreground placeholder:text-[#9e9e9e] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
				/>
				<input
					type="date"
					value={line.expiry ?? ""}
					onChange={(e) => onPatch({ expiry: e.target.value })}
					aria-label="Hạn sử dụng"
					className="h-11 rounded-[10px] border border-border bg-white px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
				/>
			</div>
		</li>
	);
}
