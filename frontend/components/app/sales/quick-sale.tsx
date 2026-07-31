"use client";

import {
	CheckCircle2,
	HandCoins,
	Minus,
	Plus,
	ReceiptText,
	ShoppingCart,
	Trash2,
	Wallet,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { CounterSearch } from "@/components/app/sales/counter-search";
import { CustomerPicker } from "@/components/app/sales/customer-picker";
import { PaymentSheet } from "@/components/app/sales/payment-sheet";
import { SaleAdvisoriesStrip } from "@/components/app/sales/sale-advisories-strip";
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
import { mapSalesApiError } from "@/lib/sales-api-error";
import { clearTenantProductCache } from "@/lib/tenant-products-api";
import { createQuickSale } from "@/lib/tenant-sales-api";
import { useQuickSaleStore } from "@/stores/quick-sale-store";

/**
 * Màn Bán nhanh (DESIGN.md §15) — tối ưu một tay trên điện thoại.
 * Tìm sản phẩm → chỉnh SL (+/- + giá bậc tự áp) → Thu tiền / Ghi nợ.
 * Nối API tạo đơn bán thật và tự làm mới tồn kho sau khi ghi nhận thành công.
 */

type Toast = { method: PaymentMethod; total: number } | null;

export function QuickSale() {
	const customerId = useQuickSaleStore((state) => state.customerId);
	const lines = useQuickSaleStore((state) => state.lines);
	const handbookMeta = useQuickSaleStore((state) => state.handbookMeta);
	const idempotencyKey = useQuickSaleStore((state) => state.idempotencyKey);
	const setCustomerId = useQuickSaleStore((state) => state.setCustomerId);
	const setLines = useQuickSaleStore((state) => state.setLines);
	const setHandbookMeta = useQuickSaleStore((state) => state.setHandbookMeta);
	const setIdempotencyKey = useQuickSaleStore(
		(state) => state.setIdempotencyKey,
	);
	const clearDraft = useQuickSaleStore((state) => state.clearDraft);
	const [payOpen, setPayOpen] = useState(false);
	const [needCustomer, setNeedCustomer] = useState(false);
	const [toast, setToast] = useState<Toast>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const subtotal = useMemo(
		() => lines.reduce((sum, l) => sum + lineTotal(l), 0),
		[lines],
	);
	const itemCount = useMemo(
		() => lines.reduce((sum, l) => sum + l.qty, 0),
		[lines],
	);

	const addProduct = useCallback(
		(product: Product, quantity = 1) => {
			const safeQuantity = Math.max(1, Math.round(quantity));
			setLines((current) => {
				const existing = current.find((l) => l.productId === product.id);
				if (existing) {
					return current.map((l) =>
						l.productId === product.id
							? {
									...l,
									qty: l.qty + safeQuantity,
									price: resolveTierPrice(product, l.qty + safeQuantity),
								}
							: l,
					);
				}
				return [
					...current,
					{
						productId: product.id,
						unitId: product.baseUnitId,
						name: product.name,
						unit: product.baseUnit,
						qty: safeQuantity,
						price: resolveTierPrice(product, safeQuantity),
						phiDays: product.agro?.phi,
						reiHours: product.agro?.rei,
					},
				];
			});
		},
		[setLines],
	);

	const changeQty = useCallback(
		(productId: string, delta: number) => {
			setLines((current) =>
				current.flatMap((l) => {
					if (l.productId !== productId) return [l];
					const qty = l.qty + delta;
					if (qty <= 0) return [];
					return [{ ...l, qty, price: repriceLine(l, qty) }];
				}),
			);
		},
		[setLines],
	);

	const setPrice = useCallback(
		(productId: string, price: number) => {
			setLines((current) =>
				current.map((l) => (l.productId === productId ? { ...l, price } : l)),
			);
		},
		[setLines],
	);

	const removeLine = useCallback(
		(productId: string) => {
			setLines((current) => current.filter((l) => l.productId !== productId));
		},
		[setLines],
	);

	async function finish(method: PaymentMethod, amountPaid: number) {
		if (submitting || lines.length === 0) return;
		setSubmitting(true);
		setError(null);
		const key = idempotencyKey ?? crypto.randomUUID();
		setIdempotencyKey(key);
		try {
			const result = await createQuickSale({
				idempotencyKey: key,
				...(customerId ? { customerId } : {}),
				paymentMethod: method.toUpperCase() as
					| "CASH"
					| "TRANSFER"
					| "QR"
					| "DEBT",
				amountPaid,
				discountAmount: 0,
				lines: lines.map((line) => ({
					productId: line.productId,
					unitId: line.unitId ?? "",
					qty: line.qty,
					unitPrice: line.price,
				})),
				...handbookMeta,
			});
			setToast({ method, total: result.total });
			clearTenantProductCache();
			clearDraft();
			setPayOpen(false);
			window.setTimeout(() => setToast(null), 3200);
		} catch (cause) {
			const status =
				typeof cause === "object" && cause !== null && "status" in cause
					? (cause as { status?: number }).status
					: undefined;
			if (status === 401) {
				setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
			} else {
				setError(mapSalesApiError(cause));
			}
		} finally {
			setSubmitting(false);
		}
	}

	function onDebt() {
		if (!customerId) {
			setNeedCustomer(true);
			window.setTimeout(() => setNeedCustomer(false), 2600);
			return;
		}
		void finish("debt", 0);
	}

	const empty = lines.length === 0;

	return (
		<div className="w-full space-y-5">
			{error ? (
				<div
					className="rounded-[10px] border border-[#f2c8c6] bg-[#fff5f5] px-4 py-3 text-base text-destructive"
					role="alert"
				>
					{error}
				</div>
			) : null}
			<div className="flex flex-col gap-1">
				<p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
					Bán hàng tại quầy
				</p>
				<h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
					Bán nhanh
				</h1>
				<p className="text-base text-[#616161]">
					Chọn sản phẩm, kiểm tra đơn rồi thu tiền.
				</p>
			</div>

			<div className="grid items-start gap-5 pb-[calc(184px+env(safe-area-inset-bottom,0px))] lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-0">
				<div className="min-w-0 space-y-4">
					{!empty ? (
						<div className="flex justify-end">
							<button
								type="button"
								onClick={clearDraft}
								className="flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold text-destructive transition-colors hover:bg-[#fdecea]"
							>
								<Trash2 className="size-4" aria-hidden />
								Xóa giỏ hàng
							</button>
						</div>
					) : null}
					<CounterSearch
						onSelectProduct={addProduct}
						onChangeMeta={(meta) =>
							setHandbookMeta(
								Object.keys(meta).length === 0
									? {}
									: (current) => ({ ...current, ...meta }),
							)
						}
					/>
					{empty ? (
						<div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-12 text-center">
							<span className="flex size-16 items-center justify-center rounded-full bg-[#f4f7f3] text-primary">
								<ShoppingCart className="size-8" aria-hidden />
							</span>
							<div className="flex flex-col gap-1">
								<h2 className="text-lg font-semibold text-foreground">
									Đơn hàng đang trống
								</h2>
								<p className="text-base text-[#616161]">
									Chọn một sản phẩm ở phía trên để bắt đầu bán hàng.
								</p>
							</div>
						</div>
					) : (
						<div className="space-y-2.5">
							{lines.map((l) => (
								<CartLine
									key={l.productId}
									line={l}
									onChangeQty={changeQty}
									onSetPrice={setPrice}
									onRemoveLine={removeLine}
								/>
							))}
						</div>
					)}
				</div>

				<aside className="rounded-[16px] border border-border bg-card p-4 shadow-card lg:sticky lg:top-[88px]">
					<div className="mb-4 hidden items-center gap-2 border-b border-border pb-4 lg:flex">
						<span className="flex size-10 items-center justify-center rounded-[10px] bg-[#f3f8f1] text-primary">
							<ReceiptText className="size-5" aria-hidden />
						</span>
						<div>
							<h2 className="text-lg font-bold text-foreground">
								Đơn hàng mới
							</h2>
							<p className="text-sm text-[#6b716b]">
								{itemCount} món trong đơn
							</p>
						</div>
					</div>
					<div className="mb-4 space-y-2">
						<p className="text-sm font-semibold text-[#616161]">Khách hàng</p>
						<CustomerPicker
							value={customerId}
							onChange={setCustomerId}
							hideInlineSearch
						/>
					</div>
					<div className="hidden space-y-3 border-t border-border pt-4 lg:block">
						<SummaryRow itemCount={itemCount} total={subtotal} />
						<ActionButtons onDebt={onDebt} onPay={() => setPayOpen(true)} />
					</div>
				</aside>
			</div>

			{/* Thanh tổng + hành động dính đáy — mobile/tablet */}
			<div className="fixed mb-0 inset-x-0 bottom-nav-safe z-30 flex flex-col gap-2.5 border-t border-border bg-card px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden">
				<SummaryRow itemCount={itemCount} total={subtotal} />
				<ActionButtons
					disabled={empty}
					onDebt={onDebt}
					onPay={() => setPayOpen(true)}
				/>
			</div>

			<PaymentSheet
				open={payOpen}
				total={subtotal}
				allowPartial={Boolean(customerId)}
				onClose={() => setPayOpen(false)}
				onConfirm={(method, amountPaid) => finish(method, amountPaid)}
				submitting={submitting}
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
	disabled = false,
	onDebt,
	onPay,
}: {
	disabled?: boolean;
	onDebt: () => void;
	onPay: () => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-3">
			<button
				type="button"
				onClick={onDebt}
				disabled={disabled}
				className="flex h-14 items-center justify-center gap-2 rounded-[10px] border-2 border-primary bg-white text-lg font-bold text-primary transition-colors duration-200 ease-out hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
			>
				<HandCoins className="size-6" aria-hidden />
				Ghi nợ
			</button>
			<button
				type="button"
				onClick={onPay}
				disabled={disabled}
				className="flex h-14 items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] disabled:cursor-not-allowed disabled:opacity-45"
			>
				<Wallet className="size-6" aria-hidden />
				Thu tiền
			</button>
		</div>
	);
}

const CartLine = memo(function CartLine({
	line,
	onChangeQty,
	onSetPrice,
	onRemoveLine,
}: {
	line: OrderLine;
	onChangeQty: (productId: string, delta: number) => void;
	onSetPrice: (productId: string, price: number) => void;
	onRemoveLine: (productId: string) => void;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col">
					<p className="line-clamp-2 text-base font-semibold text-foreground">
						{line.name}
					</p>
					<p className="text-sm text-[#9e9e9e]">Đơn vị: {line.unit}</p>
					<SaleAdvisoriesStrip source={line} className="mt-1" />
				</div>
				<button
					type="button"
					onClick={() => onRemoveLine(line.productId)}
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
						onClick={() => onChangeQty(line.productId, -1)}
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
						onClick={() => onChangeQty(line.productId, 1)}
						aria-label="Tăng"
						className="flex size-11 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-[#f5f5f5] active:bg-[#eeeeee]"
					>
						<Plus className="size-5" aria-hidden />
					</button>
				</div>

				{/* Đơn giá (sửa tay được) */}
				<div className="flex flex-col items-end gap-0.5">
					<div className="flex items-center gap-1">
						<input
							inputMode="numeric"
							value={formatVND(line.price)}
							onChange={(e) =>
								onSetPrice(
									line.productId,
									Number(e.target.value.replace(/\D/g, "")) || 0,
								)
							}
							aria-label="Đơn giá"
							className="w-24 rounded-[8px] border border-border bg-white px-2 py-1 text-right text-base font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
						/>
						<span className="text-sm text-[#9e9e9e]">₫</span>
					</div>
				</div>
			</div>
		</div>
	);
});
