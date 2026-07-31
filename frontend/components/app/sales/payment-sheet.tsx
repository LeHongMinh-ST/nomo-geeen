"use client";

import type { LucideIcon } from "lucide-react";
import { Banknote, Check, Smartphone, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { formatVND } from "@/lib/format";
import type { PaymentMethod } from "@/lib/orders";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { getCurrentProfile, type TenantProfile } from "@/lib/user-auth-api";
import { useUserAuth } from "@/stores/user-auth-store";

/**
 * Sheet thanh toán (DESIGN.md §15, §24) — trượt từ dưới.
 * Chọn hình thức (Tiền mặt/Chuyển khoản), nhập tiền khách đưa → tính thối.
 * Ghi nợ xử lý riêng ở màn cha (chỉ khi đã chọn khách).
 */

const methods: {
	value: Exclude<PaymentMethod, "debt">;
	label: string;
	icon: LucideIcon;
}[] = [
	{ value: "cash", label: "Tiền mặt", icon: Banknote },
	{ value: "transfer", label: "Chuyển khoản", icon: Smartphone },
];

/** Gợi ý mệnh giá tiền mặt phổ biến. */
const quickCash = [50_000, 100_000, 200_000, 500_000];
type SettlementMode = "full" | "partial";

export function PaymentSheet({
	open,
	total,
	paymentReference,
	paymentNote,
	onClose,
	onConfirm,
	submitting = false,
	allowPartial = false,
}: {
	open: boolean;
	total: number;
	paymentReference?: string;
	paymentNote?: string;
	onClose: () => void;
	onConfirm: (
		method: Exclude<PaymentMethod, "debt">,
		amountPaid: number,
	) => void | Promise<void>;
	submitting?: boolean;
	/** Chỉ bật khi đã chọn khách để khoản còn lại được ghi nhận là công nợ. */
	allowPartial?: boolean;
}) {
	const [method, setMethod] = useState<Exclude<PaymentMethod, "debt">>("cash");
	const [settlement, setSettlement] = useState<SettlementMode>("full");
	const [received, setReceived] = useState("");
	const accessToken = useUserAuth((state) => state.accessToken);
	const [profile, setProfile] = useState<TenantProfile | null>(null);
	const [profileLoading, setProfileLoading] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const confirmingRef = useRef(false);

	// Reset khi mở lại.
	useEffect(() => {
		if (open) {
			setMethod("cash");
			setSettlement("full");
			setReceived("");
			confirmingRef.current = false;
			setConfirming(false);
			if (accessToken) {
				setProfileLoading(true);
				void getCurrentProfile(accessToken)
					.then(setProfile)
					.catch(() => setProfile(null))
					.finally(() => setProfileLoading(false));
			}
		}
	}, [accessToken, open]);

	useEffect(() => {
		if (!allowPartial) setSettlement("full");
	}, [allowPartial]);

	useEffect(() => {
		if (!open) {
			confirmingRef.current = false;
			setConfirming(false);
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
	const isPartial = settlement === "partial";
	const amountPaid = isPartial ? receivedNum : isCash ? receivedNum : total;
	const enough = isPartial
		? receivedNum > 0 && receivedNum < total
		: !isCash || receivedNum >= total;
	const bank = profile?.bank;
	const canConfirm =
		(!isPartial || allowPartial) && enough && (isCash || Boolean(bank));
	const addInfo =
		[paymentReference, paymentNote].filter(Boolean).join(" - ") ||
		"Thanh toan don hang";
	const quickLink = bank
		? `https://img.vietqr.io/image/${encodeURIComponent(bank.bankId)}-${encodeURIComponent(bank.accountNumber)}-compact2.png?amount=${amountPaid}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(bank.accountName)}`
		: null;

	async function confirm() {
		if (!canConfirm || submitting || confirmingRef.current) return;
		confirmingRef.current = true;
		setConfirming(true);
		try {
			await onConfirm(method, amountPaid);
		} finally {
			confirmingRef.current = false;
			setConfirming(false);
		}
	}

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
					<div className="mb-5 grid grid-cols-2 gap-2">
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

					{allowPartial ? (
						<fieldset className="mb-5 grid grid-cols-2 gap-2">
							<legend className="sr-only">Mức thanh toán</legend>
							<button
								type="button"
								onClick={() => {
									setSettlement("full");
									setReceived(String(total));
								}}
								className={`h-11 rounded-[10px] border text-sm font-semibold ${
									settlement === "full"
										? "border-primary bg-accent text-accent-foreground"
										: "border-border bg-card text-[#616161]"
								}`}
							>
								Thanh toán đủ
							</button>
							<button
								type="button"
								onClick={() => {
									setSettlement("partial");
									setReceived("");
								}}
								className={`h-11 rounded-[10px] border text-sm font-semibold ${
									settlement === "partial"
										? "border-primary bg-accent text-accent-foreground"
										: "border-border bg-card text-[#616161]"
								}`}
							>
								Thanh toán một phần
							</button>
						</fieldset>
					) : null}

					{/* Tiền mặt: nhập tiền khách đưa + tính thối */}
					{isCash ? (
						<div className="mb-5 flex flex-col gap-3">
							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="payment-amount"
									className="text-sm font-semibold text-[#616161]"
								>
									{isPartial ? "Số tiền thanh toán" : "Khách đưa"}
								</label>
								<div className="relative">
									<input
										id="payment-amount"
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
								onClick={() => {
									setSettlement("full");
									setReceived(String(total));
								}}
								className="h-11 rounded-[10px] border border-border bg-card text-sm font-semibold text-primary transition-colors hover:bg-accent"
							>
								Đúng {formatVND(total)}₫
							</button>

							{receivedNum > 0 ? (
								<div
									className={`flex items-center justify-between rounded-[12px] px-4 py-3 ${
										isPartial
											? receivedNum < total
												? "bg-[#fff8e1]"
												: "bg-[#ffebee]"
											: change >= 0
												? "bg-[#e8f5e9]"
												: "bg-[#fff8e1]"
									}`}
								>
									<span className="text-base font-medium text-[#616161]">
										{isPartial
											? receivedNum < total
												? "Còn nợ"
												: "Số tiền phải nhỏ hơn tổng"
											: change >= 0
												? "Tiền thối"
												: "Còn thiếu"}
									</span>
									<span
										className={`text-xl font-bold ${
											isPartial
												? receivedNum < total
													? "text-[#f57f17]"
													: "text-[#c62828]"
												: change >= 0
													? "text-[#2e7d32]"
													: "text-[#f57f17]"
										}`}
									>
										{formatVND(
											isPartial
												? Math.abs(total - receivedNum)
												: Math.abs(change),
										)}
										₫
									</span>
								</div>
							) : null}
						</div>
					) : (
						<div className="mb-5 flex flex-col items-center gap-3 rounded-[12px] border border-dashed border-border bg-[#fafafa] py-6">
							{isPartial ? (
								<div className="w-full px-4">
									<label
										htmlFor="payment-amount"
										className="text-sm font-semibold text-[#616161]"
									>
										Số tiền thanh toán
									</label>
									<input
										id="payment-amount"
										inputMode="numeric"
										value={received ? formatVND(receivedNum) : ""}
										onChange={(event) => setReceived(event.target.value)}
										placeholder="0"
										className="mt-1 h-12 w-full rounded-[10px] border border-border bg-white px-4 text-right text-xl font-bold"
									/>
								</div>
							) : null}
							{method === "transfer" ? (
								<>
									{profileLoading ? (
										<p className="text-base text-[#616161]">
											Đang tải thông tin ngân hàng...
										</p>
									) : null}
									{bank && quickLink && (!isPartial || amountPaid > 0) ? (
										<>
											<Image
												src={quickLink}
												alt="Mã VietQR thanh toán"
												className="size-64 rounded-[12px] bg-white object-contain"
												width={256}
												height={256}
												unoptimized
											/>
											<p className="text-center text-base text-[#616161]">
												{bank.bankName}
												<br />
												{bank.accountNumber} · {bank.accountName}
												<br />
												{formatVND(amountPaid)}₫
											</p>
										</>
									) : isPartial && amountPaid <= 0 ? (
										<p className="text-center text-base text-[#616161]">
											Nhập số tiền thanh toán để tạo mã VietQR.
										</p>
									) : (
										<p className="text-center text-base text-destructive">
											Chưa cấu hình tài khoản nhận chuyển khoản. Hãy cập nhật
											trong Thông tin cửa hàng.
										</p>
									)}
								</>
							) : (
								<>
									<Smartphone className="size-10 text-[#9e9e9e]" aria-hidden />
									<p className="text-base text-[#616161]">
										{isPartial && amountPaid <= 0
											? "Nhập số tiền đã nhận trước khi xác nhận"
											: `Xác nhận khi đã nhận chuyển khoản ${formatVND(amountPaid)}₫`}
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
						disabled={!canConfirm || submitting || confirming}
						onClick={() => void confirm()}
						aria-busy={submitting || confirming}
						className="flex h-14 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] disabled:cursor-not-allowed disabled:bg-[#a5d6a7]"
					>
						<Check className="size-6" aria-hidden />
						{submitting || confirming ? "Đang lưu đơn..." : "Hoàn tất thu tiền"}
					</button>
				</div>
			</div>
		</div>
	);
}
