"use client";

import { ClipboardCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AdjustmentConfirmation } from "@/components/app/inventory/adjustment-confirmation";
import type { Product } from "@/lib/products";
import { mapTenantApiError } from "@/lib/sales-api-error";
import {
	STOCK_ADJUSTMENT_REASONS,
	type StockAdjustmentReasonCode,
} from "@/lib/stock-adjustment-reasons";
import {
	completeTenantStockAdjustment,
	createTenantStockAdjustment,
} from "@/lib/tenant-stock-adjustments-api";
import { useScrollLock } from "@/lib/use-scroll-lock";

export function AdjustSheet({
	product,
	warehouseId,
	stockValue,
	batches,
	onClose,
	onSaved,
}: {
	product: Product | null;
	warehouseId?: string;
	stockValue?: string;
	batches?: Array<{ id: string; batchCode: string }>;
	onClose: () => void;
	onSaved?: (adjustmentId: string) => void;
}) {
	const open = product !== null;
	const [actual, setActual] = useState("");
	const [reasonCode, setReasonCode] = useState<StockAdjustmentReasonCode | "">(
		"",
	);
	const [batchId, setBatchId] = useState("");
	const [note, setNote] = useState("");
	const [draftId, setDraftId] = useState<string | null>(null);
	const [draftDocNo, setDraftDocNo] = useState("");
	const [confirming, setConfirming] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	useScrollLock(open);

	useEffect(() => {
		if (!open) return;
		const previous = document.activeElement as HTMLElement | null;
		closeButtonRef.current?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			if (
				document.querySelector(
					"[aria-labelledby=adjustment-confirmation-title]",
				)
			)
				return;
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
				return;
			}
			if (event.key !== "Tab" || !dialogRef.current) return;
			const focusable = Array.from(
				dialogRef.current.querySelectorAll<HTMLElement>(
					"button, input, select, textarea",
				),
			).filter((element) => !element.hasAttribute("disabled"));
			if (!focusable.length) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			previous?.focus();
		};
	}, [open, onClose]);

	useEffect(() => {
		if (product) {
			setActual(stockValue ?? String(product.stock));
			setReasonCode("");
			setBatchId("");
			setNote("");
			setDraftId(null);
			setDraftDocNo("");
			setConfirming(false);
			setError(null);
		}
	}, [product, stockValue]);
	if (!open) return null;

	const bookStock = stockValue ?? String(product.stock);
	const delta = subtractDecimal(actual, bookStock);
	const validBatch =
		!batchId || Boolean(batches?.some((batch) => batch.id === batchId));
	const valid = Boolean(
		warehouseId &&
			reasonCode &&
			validBatch &&
			delta !== "0" &&
			delta !== "-0" &&
			actual.trim(),
	);

	async function saveDraft() {
		if (!product) return;
		if (!warehouseId)
			return setError(
				"Chưa có kho mặc định. Vui lòng thiết lập kho trước khi điều chỉnh.",
			);
		if (!delta || delta === "0" || delta === "-0")
			return setError("Chênh lệch phải là số hợp lệ và khác 0.");
		if (!reasonCode) return setError("Vui lòng chọn lý do điều chỉnh.");
		if (!validBatch) return setError("Lô hàng không hợp lệ.");
		setPending(true);
		setError(null);
		try {
			const draft = await createTenantStockAdjustment({
				warehouseId,
				note: note.trim() || undefined,
				lines: [
					{
						productId: product.id,
						delta,
						reasonCode,
						...(batchId ? { batchId } : {}),
					},
				],
			});
			setDraftId(draft.id);
			setDraftDocNo(draft.docNo);
			setConfirming(true);
		} catch (reason) {
			setError(formatAdjustmentError(reason, "Không thể lưu phiếu điều chỉnh"));
		} finally {
			setPending(false);
		}
	}

	async function completeDraft() {
		if (!draftId) return;
		setPending(true);
		setError(null);
		try {
			const completed = await completeTenantStockAdjustment(draftId);
			onSaved?.(completed.id);
			onClose();
		} catch (reason) {
			setError(
				formatAdjustmentError(reason, "Không thể hoàn tất phiếu điều chỉnh"),
			);
		} finally {
			setPending(false);
		}
	}

	return (
		<>
			<div
				className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
				role="dialog"
				aria-modal="true"
				aria-labelledby="adjust-sheet-title"
				aria-hidden={confirming}
			>
				<div
					ref={dialogRef}
					className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[18px] bg-card p-5 sm:rounded-[18px]"
				>
					<div className="flex items-center justify-between">
						<h2 id="adjust-sheet-title" className="text-lg font-bold">
							Điều chỉnh tồn kho
						</h2>
						<button
							ref={closeButtonRef}
							type="button"
							onClick={onClose}
							aria-label="Đóng"
							className="flex size-11 items-center justify-center rounded-[10px]"
						>
							<X className="size-5" aria-hidden />
						</button>
					</div>
					<p className="mt-1 text-sm text-[#616161]">
						{product.name} · Tồn sổ sách {bookStock} {product.baseUnit}
					</p>
					{!warehouseId ? (
						<p
							role="alert"
							className="mt-4 rounded-[10px] bg-[#fff8e1] px-4 py-3 text-sm text-[#8a6100]"
						>
							Chưa có kho mặc định. Không thể gửi phiếu.
						</p>
					) : null}
					<div className="mt-4 grid gap-4">
						<label className="flex flex-col gap-1.5 text-sm font-semibold">
							Số lượng thực tế
							<input
								aria-label="Số lượng thực tế"
								type="text"
								inputMode="decimal"
								value={actual}
								onChange={(event) => setActual(event.target.value)}
								className="h-12 rounded-[10px] border border-border px-4 text-base"
							/>
						</label>
						{batches?.length ? (
							<label className="flex flex-col gap-1.5 text-sm font-semibold">
								Lô hàng
								<select
									aria-label="Lô hàng"
									value={batchId}
									onChange={(event) => setBatchId(event.target.value)}
									className="h-12 rounded-[10px] border border-border bg-white px-4 text-base"
								>
									<option value="">Không chọn lô</option>
									{batches.map((batch) => (
										<option key={batch.id} value={batch.id}>
											{batch.batchCode}
										</option>
									))}
								</select>
							</label>
						) : null}
						<label className="flex flex-col gap-1.5 text-sm font-semibold">
							Lý do
							<select
								aria-label="Lý do điều chỉnh"
								value={reasonCode}
								onChange={(event) =>
									setReasonCode(event.target.value as StockAdjustmentReasonCode)
								}
								className="h-12 rounded-[10px] border border-border bg-white px-4 text-base"
							>
								<option value="">Chọn lý do</option>
								{STOCK_ADJUSTMENT_REASONS.map((reason) => (
									<option key={reason.code} value={reason.code}>
										{reason.label}
									</option>
								))}
							</select>
						</label>
						<label className="flex flex-col gap-1.5 text-sm font-semibold">
							Ghi chú
							<textarea
								aria-label="Ghi chú"
								value={note}
								onChange={(event) => setNote(event.target.value)}
								className="min-h-24 rounded-[10px] border border-border p-3 text-base"
							/>
						</label>
					</div>
					{error && !confirming ? (
						<p role="alert" className="mt-4 text-sm text-destructive">
							{error}
						</p>
					) : null}
					<p className="mt-4 rounded-[10px] bg-[#f5f5f5] px-4 py-3 text-sm">
						Chênh lệch:{" "}
						<b>
							{delta?.startsWith("-") ? `−${delta.slice(1)}` : `+${delta}`}{" "}
							{product.baseUnit}
						</b>
					</p>
					<button
						type="button"
						disabled={!valid || pending}
						onClick={saveDraft}
						className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
					>
						<ClipboardCheck className="size-5" aria-hidden />
						{pending ? "Đang lưu..." : "Lưu nháp"}
					</button>
				</div>
			</div>
			<AdjustmentConfirmation
				open={confirming}
				docNo={draftDocNo}
				delta={
					(delta.startsWith("-") ? "−" : "+") +
					delta.replace(/^-/, "") +
					" " +
					product.baseUnit
				}
				error={error}
				pending={pending}
				onCancel={() => setConfirming(false)}
				onConfirm={completeDraft}
			/>
		</>
	);
}

function formatAdjustmentError(error: unknown, fallback: string): string {
	return mapTenantApiError(error, fallback);
}

function subtractDecimal(left: string, right: string): string {
	const [leftWhole, leftFraction = ""] = left.trim().split(".");
	const [rightWhole, rightFraction = ""] = right.trim().split(".");
	if (
		!/^\d+$/.test(leftWhole) ||
		!/^\d+$/.test(rightWhole) ||
		!/^\d*$/.test(leftFraction) ||
		!/^\d*$/.test(rightFraction)
	)
		return "";
	const scale = Math.max(leftFraction.length, rightFraction.length);
	const leftInt = BigInt(leftWhole + leftFraction.padEnd(scale, "0"));
	const rightInt = BigInt(rightWhole + rightFraction.padEnd(scale, "0"));
	const sign = leftInt < rightInt ? "-" : "";
	const value = (leftInt < rightInt ? rightInt - leftInt : leftInt - rightInt)
		.toString()
		.padStart(scale + 1, "0");
	const whole = scale ? value.slice(0, -scale) || "0" : value;
	const fraction = scale ? value.slice(-scale).replace(/0+$/, "") : "";
	return sign + whole + (fraction ? `.${fraction}` : "");
}
