"use client";

import type { LucideIcon } from "lucide-react";
import { Banknote, Check, QrCode, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatVND } from "@/lib/format";
import type { PaymentMethod } from "@/lib/orders";
import { useScrollLock } from "@/lib/use-scroll-lock";

/**
 * Sheet thanh toán (DESIGN.md §15, §24) — trượt từ dưới.
 * Chọn hình thức (Tiền mặt/Chuyển khoản/QR), nhập tiền khách đưa → tính thối.
 * Ghi nợ xử lý riêng ở màn cha (chỉ khi đã chọn khách).
 */

const methods: {
	value: Exclude<PaymentMethod, "debt">;
	label: string;
	icon: LucideIcon;
}[] = [
	{ value: "cash", label: "Tiền mặt", icon: Banknote },
	{ value: "transfer", label: "Chuyển khoản", icon: Smartphone },
	{ value: "qr", label: "Quét QR", icon: QrCode },
];

/** Gợi ý mệnh giá tiền mặt phổ biến. */
const quickCash = [50_000, 100_000, 200_000, 500_000];

export function PaymentSheet({
	open,
	total,
	onClose,
	onConfirm,
}: {
	open: boolean;
	total: number;
	onClose: () => void;
	onConfirm: (method: Exclude<PaymentMethod, "debt">) => void;
}) {
	const [method, setMethod] = useState<Exclude<PaymentMethod, "debt">>("cash");
	const [received, setReceived] = useState("");

	// Reset khi mở lại.
	useEffect(() => {
		if (open) {
			setMethod("cash");
			setReceived("");
		}
	}, [open]);

	useScrollLock(open);

	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	const receivedNum = Number(received.replace(/\D/g, "")) || 0;
	const change = receivedNum - total;
	const isCash = method === "cash";
	const enough = !isCash || receivedNum >= total;

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
				aria-label="Thu tiền"
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
					{/* Tổng cần thu */}
					<div className="mb-5 flex flex-col items-center gap-1 rounded-[16px] bg-accent py-5">
						<span className="text-sm font-medium text-accent-foreground">
							Cần thu
						</span>
						<span className="text-[32px] font-bold leading-none text-accent-foreground">
							{formatVND(total)}
							<span className="ml-1 text-xl">₫</span>
						</span>
					</div>

					{/* Hình thức thanh toán */}
					<p className="mb-2 text-sm font-semibold text-[#616161]">
						Hình thức thanh toán
					</p>
					<div className="mb-5 grid grid-cols-3 gap-2">
						{methods.map((m) => {
							const active = method === m.value;
							return (
								<button
									key={m.value}
									type="button"
									onClick={() => setMethod(m.value)}
									className={`flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-[12px] border text-sm font-semibold transition-colors duration-200 ease-out ${
										active
											? "border-primary bg-accent text-accent-foreground"
											: "border-border bg-card text-[#616161] hover:bg-[#f5f5f5]"
									}`}
								>
									<m.icon className="size-6" aria-hidden />
									{m.label}
								</button>
							);
						})}
					</div>

					{/* Tiền mặt: nhập tiền khách đưa + tính thối */}
					{isCash ? (
						<div className="mb-5 flex flex-col gap-3">
							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="received"
									className="text-sm font-semibold text-[#616161]"
								>
									Khách đưa
								</label>
								<div className="relative">
									<input
										id="received"
										inputMode="numeric"
										value={received ? formatVND(receivedNum) : ""}
										onChange={(e) => setReceived(e.target.value)}
										placeholder="0"
										className="h-14 w-full rounded-[10px] border border-border bg-white pl-4 pr-9 text-right text-2xl font-bold text-foreground placeholder:text-[#cfcfcf] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
									/>
									<span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-[#9e9e9e]">
										₫
									</span>
								</div>
							</div>

							<div className="grid grid-cols-4 gap-2">
								{quickCash.map((amount) => (
									<button
										key={amount}
										type="button"
										onClick={() => setReceived(String(amount))}
										className="h-11 rounded-[10px] border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:bg-[#f5f5f5]"
									>
										{formatVND(amount / 1000)}k
									</button>
								))}
							</div>
							<button
								type="button"
								onClick={() => setReceived(String(total))}
								className="h-11 rounded-[10px] border border-border bg-card text-sm font-semibold text-primary transition-colors hover:bg-accent"
							>
								Đúng {formatVND(total)}₫
							</button>

							{receivedNum > 0 ? (
								<div
									className={`flex items-center justify-between rounded-[12px] px-4 py-3 ${
										change >= 0 ? "bg-[#e8f5e9]" : "bg-[#fff8e1]"
									}`}
								>
									<span className="text-base font-medium text-[#616161]">
										{change >= 0 ? "Tiền thối" : "Còn thiếu"}
									</span>
									<span
										className={`text-xl font-bold ${
											change >= 0 ? "text-[#2e7d32]" : "text-[#f57f17]"
										}`}
									>
										{formatVND(Math.abs(change))}₫
									</span>
								</div>
							) : null}
						</div>
					) : (
						<div className="mb-5 flex flex-col items-center gap-3 rounded-[12px] border border-dashed border-border bg-[#fafafa] py-6">
							{method === "qr" ? (
								<>
									<span className="flex size-28 items-center justify-center rounded-[12px] bg-white">
										<QrCode className="size-16 text-foreground" aria-hidden />
									</span>
									<p className="text-base text-[#616161]">
										Khách quét mã để chuyển {formatVND(total)}₫
									</p>
								</>
							) : (
								<>
									<Smartphone className="size-10 text-[#9e9e9e]" aria-hidden />
									<p className="text-base text-[#616161]">
										Xác nhận khi đã nhận chuyển khoản {formatVND(total)}₫
									</p>
								</>
							)}
						</div>
					)}
				</div>

				{/* Nút xác nhận — dính đáy sheet */}
				<div className="pb-safe border-t border-border bg-card px-4 py-3">
					<button
						type="button"
						disabled={!enough}
						onClick={() => onConfirm(method)}
						className="flex h-14 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] disabled:cursor-not-allowed disabled:bg-[#a5d6a7]"
					>
						<Check className="size-6" aria-hidden />
						Hoàn tất thu tiền
					</button>
				</div>
			</div>
		</div>
	);
}
