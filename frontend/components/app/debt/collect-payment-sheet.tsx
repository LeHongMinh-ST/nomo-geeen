"use client";

import type { LucideIcon } from "lucide-react";
import { Banknote, Check, Smartphone, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
	type DebtAccount,
	type DebtPaymentMethod,
	debtOutstanding,
} from "@/lib/debts";
import { formatVND } from "@/lib/format";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { getCurrentProfile, type TenantProfile } from "@/lib/user-auth-api";
import { useUserAuth } from "@/stores/user-auth-store";

/**
 * Sheet thu/trả công nợ (DESIGN.md §16, §24) — trượt từ dưới.
 * Hỗ trợ trả nhiều lần: nhập số tiền thu, tự tính số còn lại sau thu.
 * Chọn hình thức (Tiền mặt / Chuyển khoản). Dữ liệu QR lịch sử vẫn giữ ở contract.
 */

const methods: {
	value: DebtPaymentMethod;
	label: string;
	icon: LucideIcon;
}[] = [
	{ value: "cash", label: "Tiền mặt", icon: Banknote },
	{ value: "transfer", label: "Chuyển khoản", icon: Smartphone },
];

export function CollectPaymentSheet({
	account,
	onClose,
	onConfirm,
}: {
	/** Tài khoản đang thu/trả; null = đóng. */
	account: DebtAccount | null;
	onClose: () => void;
	onConfirm: (amount: number, method: DebtPaymentMethod) => void;
}) {
	const open = account !== null;
	const isReceivable = account?.direction === "receivable";
	const outstanding = account ? debtOutstanding(account) : 0;
	const accessToken = useUserAuth((state) => state.accessToken);

	const [method, setMethod] = useState<DebtPaymentMethod>("cash");
	const [amount, setAmount] = useState("");
	const [profile, setProfile] = useState<TenantProfile | null>(null);
	const [profileLoading, setProfileLoading] = useState(false);

	// Reset mỗi lần mở tài khoản mới.
	// biome-ignore lint/correctness/useExhaustiveDependencies: chỉ reset khi đổi tài khoản
	useEffect(() => {
		if (account) {
			setMethod("cash");
			setAmount("");
			setProfile(null);
			if (account.direction === "receivable" && accessToken) {
				setProfileLoading(true);
				void getCurrentProfile(accessToken)
					.then(setProfile)
					.catch(() => setProfile(null))
					.finally(() => setProfileLoading(false));
			}
		}
	}, [accessToken, account?.id]);

	useScrollLock(open);

	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	const amountNum = Math.min(
		Number(amount.replace(/\D/g, "")) || 0,
		outstanding,
	);
	const remaining = outstanding - amountNum;
	const valid = amountNum > 0;
	const collectVerb = isReceivable ? "Thu" : "Trả";
	const bank = profile?.bank;
	const canConfirm =
		valid && (method !== "transfer" || !isReceivable || Boolean(bank));
	const quickLink =
		bank && account
			? `https://img.vietqr.io/image/${encodeURIComponent(bank.bankId)}-${encodeURIComponent(bank.accountNumber)}-compact2.png?amount=${amountNum}&addInfo=${encodeURIComponent(`Thu no ${account.id} - ${account.name}`)}&accountName=${encodeURIComponent(bank.accountName)}`
			: null;

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
				aria-label={`${collectVerb} tiền công nợ`}
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
					{/* Đối tác + số còn nợ */}
					<div className="mb-5 flex flex-col items-center gap-1 rounded-[16px] bg-[#fff8e1] py-5">
						<span className="text-sm font-medium text-[#8d6e00]">
							{account?.name} · Còn nợ
						</span>
						<span className="text-[32px] font-bold leading-none text-[#f57f17]">
							{formatVND(outstanding)}
							<span className="ml-1 text-xl">₫</span>
						</span>
					</div>

					{/* Số tiền thu/trả */}
					<div className="mb-5 flex flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="debt-amount"
								className="text-sm font-semibold text-[#616161]"
							>
								Số tiền {collectVerb.toLowerCase()}
							</label>
							<div className="relative">
								<input
									id="debt-amount"
									inputMode="numeric"
									value={amountNum ? formatVND(amountNum) : ""}
									onChange={(e) => setAmount(e.target.value)}
									placeholder="0"
									className="h-14 w-full rounded-[10px] border border-border bg-white pl-4 pr-9 text-right text-2xl font-bold text-foreground placeholder:text-[#cfcfcf] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
								/>
								<span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-[#9e9e9e]">
									₫
								</span>
							</div>
						</div>

						{/* Nút nhanh: một nửa / trả hết */}
						<div className="grid grid-cols-2 gap-2">
							<button
								type="button"
								onClick={() => setAmount(String(Math.round(outstanding / 2)))}
								className="h-11 rounded-[10px] border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:bg-[#f5f5f5]"
							>
								Một nửa
							</button>
							<button
								type="button"
								onClick={() => setAmount(String(outstanding))}
								className="h-11 rounded-[10px] border border-border bg-card text-sm font-semibold text-primary transition-colors hover:bg-accent"
							>
								{collectVerb} hết {formatVND(outstanding)}₫
							</button>
						</div>

						{/* Còn lại sau thu */}
						{amountNum > 0 ? (
							<div
								className={`flex items-center justify-between rounded-[12px] px-4 py-3 ${
									remaining <= 0 ? "bg-[#e8f5e9]" : "bg-[#fff8e1]"
								}`}
							>
								<span className="text-base font-medium text-[#616161]">
									{remaining <= 0 ? "Sau khi trả" : "Còn lại sau thu"}
								</span>
								<span
									className={`text-xl font-bold ${
										remaining <= 0 ? "text-[#2e7d32]" : "text-[#f57f17]"
									}`}
								>
									{remaining <= 0 ? "Hết nợ" : `${formatVND(remaining)}₫`}
								</span>
							</div>
						) : null}
					</div>

					{/* Hình thức thanh toán */}
					<p className="mb-2 text-sm font-semibold text-[#616161]">Hình thức</p>
					<div className="mb-2 grid grid-cols-2 gap-2">
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
					{method === "transfer" ? (
						<div className="mb-2 flex flex-col items-center gap-3 rounded-[12px] border border-dashed border-border bg-[#fafafa] py-6">
							{isReceivable ? (
								<>
									{profileLoading ? (
										<p className="text-base text-[#616161]">
											Đang tải thông tin ngân hàng...
										</p>
									) : null}
									{bank && quickLink ? (
										<>
											<Image
												src={quickLink}
												alt="Mã VietQR thu nợ"
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
												{formatVND(amountNum)}₫
											</p>
										</>
									) : (
										<p className="text-center text-base text-destructive">
											Chưa cấu hình tài khoản nhận chuyển khoản. Hãy cập nhật
											trong Thông tin cửa hàng.
										</p>
									)}
								</>
							) : (
								<p className="text-base text-[#616161]">
									Xác nhận khi đã chuyển khoản {formatVND(amountNum)}₫
								</p>
							)}
						</div>
					) : null}
				</div>

				{/* Nút xác nhận — dính đáy sheet */}
				<div className="pb-safe border-t border-border bg-card px-4 py-3">
					<button
						type="button"
						disabled={!canConfirm}
						onClick={() => onConfirm(amountNum, method)}
						className="flex h-14 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] disabled:cursor-not-allowed disabled:bg-[#a5d6a7]"
					>
						<Check className="size-6" aria-hidden />
						{amountNum > 0
							? `${collectVerb} ${formatVND(amountNum)}₫`
							: `${collectVerb} tiền`}
					</button>
				</div>
			</div>
		</div>
	);
}
