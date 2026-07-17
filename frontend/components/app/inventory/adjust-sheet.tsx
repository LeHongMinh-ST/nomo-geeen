"use client";

import { ClipboardCheck, Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatVND } from "@/lib/format";
import type { Product } from "@/lib/products";
import { useScrollLock } from "@/lib/use-scroll-lock";

/**
 * Sheet điều chỉnh / kiểm kê tồn (base_spec §9, DESIGN.md §24).
 * Nhập số lượng thực tế → hệ thống tính chênh lệch so với sổ sách, ghi Adjustment.
 * FE-only: gọi onConfirm với delta + lý do; chưa nối API.
 */
export function AdjustSheet({
	product,
	onClose,
	onConfirm,
}: {
	/** Sản phẩm đang kiểm kê; null = đóng. */
	product: Product | null;
	onClose: () => void;
	onConfirm: (actual: number, reason: string) => void;
}) {
	const open = product !== null;
	const bookStock = product?.stock ?? 0;

	const [actual, setActual] = useState("");
	const [reason, setReason] = useState("");

	// Reset mỗi lần mở sản phẩm mới — mặc định điền đúng số sổ sách.
	// biome-ignore lint/correctness/useExhaustiveDependencies: chỉ reset khi đổi sản phẩm
	useEffect(() => {
		if (product) {
			setActual(String(product.stock));
			setReason("");
		}
	}, [product?.id]);

	useScrollLock(open);

	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	const actualNum = Number(actual.replace(/\D/g, "")) || 0;
	const delta = actualNum - bookStock;
	const changed = delta !== 0;

	return (
		<div
			className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
			aria-hidden={!open}
		>
			<button
				type="button"
				aria-label="Đóng"
				onClick={onClose}
				className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ease-out ${
					open ? "opacity-100" : "opacity-0"
				}`}
			/>

			<div
				role="dialog"
				aria-modal="true"
				aria-label="Điều chỉnh tồn kho"
				className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-[18px] bg-card transition-transform duration-300 ease-out ${
					open ? "translate-y-0" : "translate-y-full"
				}`}
			>
				<div className="relative flex items-center justify-center pb-1 pt-3">
					<span className="h-1.5 w-10 rounded-full bg-[#e0e0e0]" />
					<button
						type="button"
						onClick={onClose}
						aria-label="Đóng"
						className="absolute right-3 top-2 flex size-10 items-center justify-center rounded-[10px] text-[#616161] hover:bg-[#f5f5f5]"
					>
						<X className="size-5" aria-hidden />
					</button>
				</div>

				<div className="overflow-y-auto overscroll-contain px-4 pb-4">
					<h2 className="mb-1 text-lg font-bold text-foreground">
						Kiểm kê tồn kho
					</h2>
					<p className="mb-4 line-clamp-1 text-sm text-[#616161]">
						{product?.name}
					</p>

					{/* Tồn sổ sách */}
					<div className="mb-4 flex items-center justify-between rounded-[12px] bg-[#f5f5f5] px-4 py-3">
						<span className="text-base font-medium text-[#616161]">
							Tồn sổ sách
						</span>
						<span className="text-lg font-bold text-foreground">
							{formatVND(bookStock)} {product?.baseUnit}
						</span>
					</div>

					{/* Số thực tế */}
					<div className="mb-4 flex flex-col gap-2">
						<label
							htmlFor="actual"
							className="text-sm font-semibold text-[#616161]"
						>
							Số lượng thực tế
						</label>
						<div className="flex items-center gap-2">
							<button
								type="button"
								aria-label="Giảm"
								onClick={() => setActual(String(Math.max(0, actualNum - 1)))}
								className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-[#f5f5f5]"
							>
								<Minus className="size-5" aria-hidden />
							</button>
							<input
								id="actual"
								inputMode="numeric"
								value={actual ? formatVND(actualNum) : ""}
								onChange={(e) => setActual(e.target.value)}
								placeholder="0"
								className="h-12 flex-1 rounded-[10px] border border-border bg-white px-4 text-center text-xl font-bold text-foreground placeholder:text-[#cfcfcf] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
							/>
							<button
								type="button"
								aria-label="Tăng"
								onClick={() => setActual(String(actualNum + 1))}
								className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-[#f5f5f5]"
							>
								<Plus className="size-5" aria-hidden />
							</button>
						</div>
					</div>

					{/* Chênh lệch */}
					{changed ? (
						<div
							className={`mb-4 flex items-center justify-between rounded-[12px] px-4 py-3 ${
								delta > 0 ? "bg-[#e8f5e9]" : "bg-[#fff8e1]"
							}`}
						>
							<span className="text-base font-medium text-[#616161]">
								Chênh lệch
							</span>
							<span
								className={`text-lg font-bold ${
									delta > 0 ? "text-[#2e7d32]" : "text-[#f57f17]"
								}`}
							>
								{delta > 0 ? "+" : "−"}
								{formatVND(Math.abs(delta))} {product?.baseUnit}
							</span>
						</div>
					) : null}

					{/* Lý do */}
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="reason"
							className="text-sm font-semibold text-[#616161]"
						>
							Lý do điều chỉnh
						</label>
						<input
							id="reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Kiểm kê lệch, hư hỏng, mất..."
							className="h-12 w-full rounded-[10px] border border-border bg-white px-4 text-base text-foreground placeholder:text-[#9e9e9e] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
						/>
					</div>
				</div>

				{/* Nút xác nhận — dính đáy sheet */}
				<div className="pb-safe border-t border-border bg-card px-4 py-3">
					<button
						type="button"
						disabled={!changed || !reason.trim()}
						onClick={() => onConfirm(actualNum, reason.trim())}
						className="flex h-14 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32] disabled:cursor-not-allowed disabled:bg-[#a5d6a7]"
					>
						<ClipboardCheck className="size-6" aria-hidden />
						Lưu điều chỉnh
					</button>
				</div>
			</div>
		</div>
	);
}
