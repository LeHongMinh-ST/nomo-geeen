"use client";

import {
	CheckCircle2,
	HandCoins,
	Minus,
	Plus,
	ShoppingCart,
	Trash2,
	Wallet,
} from "lucide-react";
import { useState } from "react";
import { CustomerPicker } from "@/components/app/sales/customer-picker";
import { PaymentSheet } from "@/components/app/sales/payment-sheet";
import { ProductPicker } from "@/components/app/sales/product-picker";
import { formatVND } from "@/lib/format";
import {
	lineTotal,
	type OrderLine,
	type PaymentMethod,
	paymentMethodLabel,
	repriceLine,
	resolveTierPrice,
} from "@/lib/orders";
import type { Product } from "@/lib/products";

/**
 * Màn Bán nhanh (DESIGN.md §15) — tối ưu một tay trên điện thoại.
 * Tìm sản phẩm → chỉnh SL (+/- + giá bậc tự áp) → Thu tiền / Ghi nợ.
 * FE-only: state cục bộ, chưa nối API.
 */

type Toast = { method: PaymentMethod; total: number } | null;

export function QuickSale() {
	const [customerId, setCustomerId] = useState<string | undefined>();
	const [lines, setLines] = useState<OrderLine[]>([]);
	const [payOpen, setPayOpen] = useState(false);
	const [needCustomer, setNeedCustomer] = useState(false);
	const [toast, setToast] = useState<Toast>(null);

	const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
	const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

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

	function finish(method: PaymentMethod) {
		setToast({ method, total: subtotal });
		setLines([]);
		setCustomerId(undefined);
		setPayOpen(false);
		window.setTimeout(() => setToast(null), 3200);
	}

	function onDebt() {
		if (!customerId) {
			setNeedCustomer(true);
			window.setTimeout(() => setNeedCustomer(false), 2600);
			return;
		}
		finish("debt");
	}

	const empty = lines.length === 0;

	return (
		<div className="flex w-full flex-col gap-4">
			{/* Header + chọn khách */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Bán nhanh
					</h1>
					<p className="text-base text-[#616161]">
						Tìm hàng, chốt tiền — xong trong vài chạm.
					</p>
				</div>
				<CustomerPicker value={customerId} onChange={setCustomerId} />
			</div>

			{/* Tìm sản phẩm */}
			<ProductPicker onSelect={addProduct} />

			{/* Giỏ hàng */}
			{empty ? (
				<div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
					<span className="flex size-16 items-center justify-center rounded-full bg-[#f5f5f5]">
						<ShoppingCart className="size-8 text-[#9e9e9e]" aria-hidden />
					</span>
					<div className="flex flex-col gap-1">
						<h2 className="text-lg font-semibold text-foreground">
							Chưa có hàng nào
						</h2>
						<p className="text-base text-[#616161]">
							Tìm và chọn sản phẩm ở ô trên để thêm vào đơn.
						</p>
					</div>
				</div>
			) : (
				<div className="flex flex-col gap-3 pb-[calc(184px+env(safe-area-inset-bottom,0px))] lg:pb-0">
					{/* Danh sách dòng hàng */}
					<div className="flex flex-col gap-2.5">
						{lines.map((l) => (
							<CartLine
								key={l.productId}
								line={l}
								onInc={() => changeQty(l.productId, 1)}
								onDec={() => changeQty(l.productId, -1)}
								onPrice={(price) => setPrice(l.productId, price)}
								onRemove={() => removeLine(l.productId)}
							/>
						))}
					</div>

					{/* Tổng + hành động — desktop (inline) */}
					<div className="hidden flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card lg:flex">
						<SummaryRow itemCount={itemCount} total={subtotal} />
						<ActionButtons onDebt={onDebt} onPay={() => setPayOpen(true)} />
					</div>
				</div>
			)}

			{/* Thanh tổng + hành động dính đáy — mobile/tablet */}
			{!empty ? (
				<div className="fixed inset-x-0 bottom-nav-safe z-30 flex flex-col gap-2.5 border-t border-border bg-card px-4 pb-3 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden">
					<SummaryRow itemCount={itemCount} total={subtotal} />
					<ActionButtons onDebt={onDebt} onPay={() => setPayOpen(true)} />
				</div>
			) : null}

			<PaymentSheet
				open={payOpen}
				total={subtotal}
				onClose={() => setPayOpen(false)}
				onConfirm={(method) => finish(method)}
			/>

			{/* Nhắc chọn khách khi Ghi nợ */}
			{needCustomer ? (
				<div className="fixed inset-x-0 bottom-[calc(150px+env(safe-area-inset-bottom,0px))] z-40 mx-auto w-fit max-w-[90%] rounded-full bg-[#f57f17] px-5 py-3 text-center text-base font-semibold text-white shadow-lg lg:bottom-8">
					Chọn khách hàng trước khi ghi nợ
				</div>
			) : null}

			{/* Toast thành công */}
			{toast ? (
				<div className="fixed inset-x-0 bottom-[calc(150px+env(safe-area-inset-bottom,0px))] z-40 mx-auto flex w-fit max-w-[90%] items-center gap-2.5 rounded-full bg-[#2e7d32] px-5 py-3 text-white shadow-lg lg:bottom-8">
					<CheckCircle2 className="size-5.5 shrink-0" aria-hidden />
					<span className="text-base font-semibold">
						Đã bán · {formatVND(toast.total)}₫ ·{" "}
						{paymentMethodLabel[toast.method]}
					</span>
				</div>
			) : null}
		</div>
	);
}

function SummaryRow({
	itemCount,
	total,
}: {
	itemCount: number;
	total: number;
}) {
	return (
		<div className="flex items-end justify-between">
			<span className="text-base font-medium text-[#616161]">
				Tổng cộng
				<span className="ml-1 text-sm text-[#9e9e9e]">({itemCount} món)</span>
			</span>
			<span className="text-[28px] font-bold leading-none text-foreground">
				{formatVND(total)}
				<span className="ml-1 text-lg">₫</span>
			</span>
		</div>
	);
}

function ActionButtons({
	onDebt,
	onPay,
}: {
	onDebt: () => void;
	onPay: () => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-3">
			<button
				type="button"
				onClick={onDebt}
				className="flex h-14 items-center justify-center gap-2 rounded-[10px] border-2 border-primary bg-white text-lg font-bold text-primary transition-colors duration-200 ease-out hover:bg-accent"
			>
				<HandCoins className="size-6" aria-hidden />
				Ghi nợ
			</button>
			<button
				type="button"
				onClick={onPay}
				className="flex h-14 items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
			>
				<Wallet className="size-6" aria-hidden />
				Thu tiền
			</button>
		</div>
	);
}

function CartLine({
	line,
	onInc,
	onDec,
	onPrice,
	onRemove,
}: {
	line: OrderLine;
	onInc: () => void;
	onDec: () => void;
	onPrice: (price: number) => void;
	onRemove: () => void;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col">
					<p className="line-clamp-2 text-base font-semibold text-foreground">
						{line.name}
					</p>
					<p className="text-sm text-[#9e9e9e]">Đơn vị: {line.unit}</p>
				</div>
				<button
					type="button"
					onClick={onRemove}
					aria-label="Bỏ khỏi đơn"
					className="flex size-9 shrink-0 items-center justify-center rounded-[8px] text-[#9e9e9e] transition-colors hover:bg-[#fdecea] hover:text-destructive"
				>
					<Trash2 className="size-5" aria-hidden />
				</button>
			</div>

			<div className="flex items-center justify-between gap-3">
				{/* Bộ đếm số lượng */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onDec}
						aria-label="Giảm"
						className="flex size-11 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-[#f5f5f5] active:bg-[#eeeeee]"
					>
						<Minus className="size-5" aria-hidden />
					</button>
					<span className="w-10 text-center text-lg font-bold text-foreground">
						{line.qty}
					</span>
					<button
						type="button"
						onClick={onInc}
						aria-label="Tăng"
						className="flex size-11 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-[#f5f5f5] active:bg-[#eeeeee]"
					>
						<Plus className="size-5" aria-hidden />
					</button>
				</div>

				{/* Đơn giá (sửa tay được) + thành tiền */}
				<div className="flex flex-col items-end gap-0.5">
					<div className="flex items-center gap-1">
						<input
							inputMode="numeric"
							value={formatVND(line.price)}
							onChange={(e) =>
								onPrice(Number(e.target.value.replace(/\D/g, "")) || 0)
							}
							aria-label="Đơn giá"
							className="w-24 rounded-[8px] border border-border bg-white px-2 py-1 text-right text-base font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
						/>
						<span className="text-sm text-[#9e9e9e]">₫</span>
					</div>
					<span className="text-lg font-bold text-foreground">
						{formatVND(lineTotal(line))}₫
					</span>
				</div>
			</div>
		</div>
	);
}
