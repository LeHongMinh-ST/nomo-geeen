"use client";

import { Check, ChevronDown, Search, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	type Customer,
	customerTypeLabel,
	getCustomer,
	customers as seedCustomers,
} from "@/lib/customers";
import { formatVND } from "@/lib/format";
import { useScrollLock } from "@/lib/use-scroll-lock";

/**
 * Chọn khách hàng — nút xổ mở Sheet trượt từ dưới có tìm kiếm (DESIGN.md §24).
 * Không bắt buộc chọn (bán vãng lai). Dùng chung Bán nhanh + Đơn bán hàng.
 */
export function CustomerPicker({
	value,
	onChange,
}: {
	value?: string;
	onChange: (customerId?: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const selected = value ? getCustomer(value) : undefined;

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex h-11 items-center gap-2 rounded-full border border-border bg-card pl-2 pr-3.5 text-base font-semibold text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
			>
				<span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
					<UserRound className="size-4.5" aria-hidden />
				</span>
				<span className="max-w-[140px] truncate">
					{selected ? selected.name : "Khách lẻ"}
				</span>
				<ChevronDown className="size-4.5 text-[#9e9e9e]" aria-hidden />
			</button>

			<CustomerSheet
				open={open}
				value={value}
				onClose={() => setOpen(false)}
				onPick={(id) => {
					onChange(id);
					setOpen(false);
				}}
			/>
		</>
	);
}

function CustomerSheet({
	open,
	value,
	onClose,
	onPick,
}: {
	open: boolean;
	value?: string;
	onClose: () => void;
	onPick: (id?: string) => void;
}) {
	const [query, setQuery] = useState("");

	useScrollLock(open);

	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return seedCustomers;
		return seedCustomers.filter(
			(c) => c.name.toLowerCase().includes(q) || c.phone.includes(q),
		);
	}, [query]);

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
				aria-label="Chọn khách hàng"
				className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-t-[18px] bg-card transition-transform duration-300 ease-out ${
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

				<div className="px-4 pb-2 pt-1">
					<h2 className="mb-3 text-lg font-bold text-foreground">
						Chọn khách hàng
					</h2>
					<div className="relative">
						<Search
							className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-[#9e9e9e]"
							aria-hidden
						/>
						<input
							type="search"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Tìm tên hoặc số điện thoại..."
							className="h-12 w-full rounded-[10px] border border-border bg-white pl-11 pr-4 text-base text-foreground placeholder:text-[#9e9e9e] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
						/>
					</div>
				</div>

				<div className="pb-safe flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
					{/* Khách lẻ (không chọn ai) */}
					<button
						type="button"
						onClick={() => onPick(undefined)}
						className="flex w-full items-center gap-3 rounded-[12px] px-2.5 py-3 text-left transition-colors hover:bg-[#f5f5f5]"
					>
						<span className="flex size-11 items-center justify-center rounded-full bg-[#f5f5f5] text-[#9e9e9e]">
							<UserRound className="size-5.5" aria-hidden />
						</span>
						<span className="flex-1 text-base font-semibold text-foreground">
							Khách lẻ (không ghi hồ sơ)
						</span>
						{!value ? (
							<Check className="size-5 text-primary" aria-hidden />
						) : null}
					</button>

					{results.map((c) => (
						<CustomerRow
							key={c.id}
							customer={c}
							selected={value === c.id}
							onPick={() => onPick(c.id)}
						/>
					))}

					{results.length === 0 ? (
						<p className="px-3 py-6 text-center text-base text-[#9e9e9e]">
							Không tìm thấy khách hàng
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}

function CustomerRow({
	customer,
	selected,
	onPick,
}: {
	customer: Customer;
	selected: boolean;
	onPick: () => void;
}) {
	const initials = customer.name
		.split(" ")
		.slice(-2)
		.map((w) => w[0])
		.join("")
		.toUpperCase();

	return (
		<button
			type="button"
			onClick={onPick}
			className="flex w-full items-center gap-3 rounded-[12px] px-2.5 py-3 text-left transition-colors hover:bg-[#f5f5f5]"
		>
			<span className="flex size-11 items-center justify-center rounded-full bg-accent text-base font-semibold text-accent-foreground">
				{initials}
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="flex items-center gap-2">
					<span className="truncate text-base font-semibold text-foreground">
						{customer.name}
					</span>
					<span className="shrink-0 rounded-full bg-[#f5f5f5] px-2 py-0.5 text-xs font-medium text-[#616161]">
						{customerTypeLabel[customer.type]}
					</span>
				</span>
				<span className="text-sm text-[#9e9e9e]">
					{customer.phone}
					{customer.debt > 0 ? ` · Đang nợ ${formatVND(customer.debt)}₫` : ""}
				</span>
			</span>
			{selected ? (
				<Check className="size-5 shrink-0 text-primary" aria-hidden />
			) : null}
		</button>
	);
}
