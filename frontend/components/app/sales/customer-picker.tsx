"use client";

import { Check, ChevronDown, Search, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatVND } from "@/lib/format";
import {
	type Customer,
	createCustomer,
	customerTypeLabel,
	getCustomer,
	listCustomers,
} from "@/lib/tenant-customers-api";
import { useScrollLock } from "@/lib/use-scroll-lock";

export function CustomerPicker({
	value,
	onChange,
	hideInlineSearch = false,
}: {
	value?: string;
	onChange: (customerId?: string) => void;
	hideInlineSearch?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const [selected, setSelected] = useState<Customer | undefined>();
	const [inlineQuery, setInlineQuery] = useState("");
	const close = () => {
		setOpen(false);
		requestAnimationFrame(() => triggerRef.current?.focus());
	};

	useEffect(() => {
		if (!value) {
			setSelected(undefined);
			return;
		}
		let active = true;
		getCustomer(value)
			.then((customer) => {
				if (active) setSelected(customer);
			})
			.catch(() => {
				if (active) setSelected(undefined);
			});
		return () => {
			active = false;
		};
	}, [value]);

	return (
		<>
			{!hideInlineSearch ? (
				<div className="flex w-full items-center gap-2 lg:max-w-[420px]">
					<Search className="size-5 shrink-0 text-[#9e9e9e]" aria-hidden />
					<input
						value={inlineQuery}
						onChange={(event) => {
							setInlineQuery(event.target.value);
							setOpen(true);
						}}
						onFocus={() => setOpen(true)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								setOpen(true);
							}
						}}
						role="combobox"
						aria-expanded={open}
						aria-controls="customer-picker-options"
						aria-hidden={open}
						disabled={open}
						tabIndex={open ? -1 : 0}
						aria-label="Tìm khách hàng ngay trong form"
						placeholder="Tìm tên hoặc số điện thoại..."
						className="h-12 min-w-0 flex-1 rounded-[10px] border border-border bg-white px-3 text-base text-foreground placeholder:text-[#9e9e9e] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
					/>
				</div>
			) : null}
			<button
				ref={triggerRef}
				type="button"
				onClick={() => setOpen(true)}
				aria-haspopup="dialog"
				className="flex min-h-12 self-start items-center gap-2 rounded-full border border-border bg-card pl-2 pr-3.5 text-base font-semibold text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
			>
				<span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
					<UserRound className="size-4.5" aria-hidden />
				</span>
				<span className="max-w-[140px] truncate">
					{selected?.name ?? "Khách lẻ"}
				</span>
				<ChevronDown className="size-4.5 text-[#9e9e9e]" aria-hidden />
			</button>
			{selected ? (
				<div className="mt-2 rounded-[10px] border border-[#dcebd7] bg-[#f3f8f1] px-3 py-2 text-sm text-[#616161]">
					<strong>{selected.name}</strong> ·{" "}
					{selected.phone ?? "Chưa có số điện thoại"}
					{selected.balance > 0
						? ` · Đang nợ ${formatVND(selected.balance)}₫`
						: " · Không nợ"}
					{selected.address ? (
						<p className="mt-1 border-t border-[#dcebd7] pt-1">
							<strong>Địa chỉ:</strong> {selected.address}
						</p>
					) : null}
					{selected.note ? (
						<p className="mt-1 border-t border-[#dcebd7] pt-1">
							<strong>Ghi chú:</strong> {selected.note}
						</p>
					) : null}
				</div>
			) : null}
			{open ? (
				<CustomerSheet
					open={open}
					initialQuery={inlineQuery}
					value={value}
					onClose={close}
					onPick={(id, customer) => {
						onChange(id);
						setSelected(customer);
						close();
					}}
				/>
			) : null}
		</>
	);
}

function CustomerSheet({
	open,
	initialQuery,
	value,
	onClose,
	onPick,
}: {
	open: boolean;
	initialQuery: string;
	value?: string;
	onClose: () => void;
	onPick: (id?: string, customer?: Customer) => void;
}) {
	const [query, setQuery] = useState(initialQuery);
	const [phone, setPhone] = useState("");
	const [results, setResults] = useState<Customer[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>();
	const [activeIndex, setActiveIndex] = useState(-1);
	const [creating, setCreating] = useState(false);
	const searchRef = useRef<HTMLInputElement>(null);
	const generation = useRef(0);
	useScrollLock(open);
	useEffect(() => {
		if (initialQuery) setQuery(initialQuery);
	}, [initialQuery]);

	const load = useCallback(
		(expectedGeneration?: number) => {
			const current = expectedGeneration ?? ++generation.current;
			if (current !== generation.current) return;
			setLoading(true);
			setError(undefined);
			listCustomers({
				search: query.trim() || undefined,
				page: 1,
				pageSize: 20,
			})
				.then((response) => {
					if (current !== generation.current) return;
					setResults(response.items);
					setActiveIndex(response.items.length > 0 ? 0 : -1);
				})
				.catch(() => {
					if (current === generation.current)
						setError("Không thể tải danh sách khách hàng.");
				})
				.finally(() => {
					if (current === generation.current) setLoading(false);
				});
		},
		[query],
	);

	useEffect(() => {
		const current = ++generation.current;
		if (!open)
			return () => {
				generation.current += 1;
			};
		searchRef.current?.focus();
		const timer = window.setTimeout(
			() => {
				if (current === generation.current) load(current);
			},
			query ? 350 : 0,
		);
		return () => {
			window.clearTimeout(timer);
			generation.current += 1;
		};
	}, [open, query, load]);

	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	const options = [
		{ id: undefined, name: "Khách lẻ (không ghi hồ sơ)" },
		...results,
	];
	const hasExactMatch = results.some(
		(customer) =>
			customer.name.trim().toLocaleLowerCase() ===
			query.trim().toLocaleLowerCase(),
	);
	const createInline = async () => {
		if (!query.trim() || results.length > 0 || creating) return;
		setCreating(true);
		setError(undefined);
		try {
			const customer = await createCustomer({
				name: query.trim(),
				...(phone.trim() ? { phone: phone.trim() } : {}),
			});
			onPick(customer.id, customer);
		} catch {
			setError("Không thể tạo khách hàng. Thử lại.");
		} finally {
			setCreating(false);
		}
	};

	const choose = (index: number) => {
		const customer = results[index];
		onPick(customer?.id, customer);
	};

	return (
		<div
			className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
			aria-hidden={!open}
		>
			<button
				type="button"
				aria-label="Đóng"
				onClick={onClose}
				className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="customer-picker-title"
				className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-t-[18px] bg-card transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
			>
				<div className="relative flex items-center justify-center pb-1 pt-3">
					<span className="h-1.5 w-10 rounded-full bg-[#e0e0e0]" />
					<button
						type="button"
						onClick={onClose}
						aria-label="Đóng"
						className="absolute right-3 top-2 flex min-h-12 min-w-12 items-center justify-center rounded-[10px] text-[#616161] hover:bg-[#f5f5f5]"
					>
						<X className="size-5" aria-hidden />
					</button>
				</div>
				<div className="px-4 pb-2 pt-1">
					<h2
						id="customer-picker-title"
						className="mb-3 text-lg font-bold text-foreground"
					>
						Chọn khách hàng
					</h2>
					<div className="relative">
						<Search
							className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-[#9e9e9e]"
							aria-hidden
						/>
						<input
							ref={searchRef}
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "ArrowDown") {
									event.preventDefault();
									setActiveIndex((index) =>
										Math.min(index + 1, results.length - 1),
									);
								} else if (event.key === "ArrowUp") {
									event.preventDefault();
									setActiveIndex((index) => Math.max(index - 1, 0));
								} else if (event.key === "Enter" && activeIndex >= 0) {
									event.preventDefault();
									choose(activeIndex);
								}
							}}
							role="combobox"
							aria-expanded={open}
							aria-activedescendant={
								activeIndex >= 0 && results[activeIndex]
									? `customer-option-${results[activeIndex].id}`
									: undefined
							}
							aria-label="Tìm khách hàng"
							aria-controls="customer-picker-options"
							className="h-12 w-full rounded-[10px] border border-border bg-white pl-11 pr-4 text-base text-foreground placeholder:text-[#9e9e9e] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
							placeholder="Tìm tên hoặc số điện thoại..."
						/>
					</div>
				</div>
				<div
					id="customer-picker-options"
					role="listbox"
					aria-label="Danh sách khách hàng"
					className="pb-safe flex-1 overflow-y-auto overscroll-contain px-3 pb-6"
				>
					{loading ? (
						<p
							role="status"
							className="px-3 py-6 text-center text-base text-[#6b716b]"
						>
							Đang tải khách hàng...
						</p>
					) : error ? (
						<div className="px-3 py-6 text-center">
							<p role="alert" className="text-base text-[#d64540]">
								{error}
							</p>
							<button
								type="button"
								onClick={() => load()}
								className="mt-3 min-h-12 rounded-[10px] border border-border px-4 text-base font-semibold"
							>
								Thử lại
							</button>
						</div>
					) : (
						options.map((option, index) =>
							option.id === undefined ? (
								<button
									key="walk-in"
									id="customer-option-walk-in"
									type="button"
									role="option"
									aria-selected={!value}
									onClick={() => onPick(undefined)}
									className="flex min-h-12 w-full items-center gap-3 rounded-[12px] px-2.5 py-3 text-left transition-colors hover:bg-[#f5f5f5]"
								>
									<span className="flex size-11 items-center justify-center rounded-full bg-[#f5f5f5] text-[#9e9e9e]">
										<UserRound className="size-5.5" aria-hidden />
									</span>
									<span className="flex-1 text-base font-semibold text-foreground">
										{option.name}
									</span>
									{!value ? (
										<Check className="size-5 text-primary" aria-hidden />
									) : null}
								</button>
							) : (
								<CustomerRow
									key={option.id}
									customer={option as Customer}
									selected={value === option.id}
									active={activeIndex === index - 1}
									onPick={() => onPick(option.id, option as Customer)}
								/>
							),
						)
					)}
					{!loading && !error && query.trim() && !hasExactMatch ? (
						<div className="mb-2 rounded-[12px] border border-[#dcebd7] bg-[#f3f8f1] p-3">
							<p className="mb-2 text-base font-semibold text-foreground">
								Chưa có khách phù hợp. Nhập số điện thoại nếu có.
							</p>
							<input
								type="tel"
								inputMode="tel"
								value={phone}
								onChange={(event) => setPhone(event.target.value)}
								aria-label="Số điện thoại khách hàng mới"
								placeholder="Số điện thoại (không bắt buộc)"
								className="mb-2 h-12 w-full rounded-[10px] border border-border bg-white px-3 text-base text-foreground placeholder:text-[#9e9e9e] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
							/>
							<button
								type="button"
								disabled={creating}
								onClick={() => void createInline()}
								className="flex min-h-12 w-full items-center justify-center rounded-[10px] bg-primary px-3 text-base font-semibold text-white disabled:cursor-wait disabled:opacity-60"
							>
								{creating
									? "Đang tạo khách..."
									: "Không trùng khách hiện có · Tạo khách mới"}
							</button>
						</div>
					) : null}
					{!loading && !error && results.length === 0 ? (
						<p className="px-3 py-6 text-center text-base text-[#9e918a]">
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
	active,
	onPick,
}: {
	customer: Customer;
	selected: boolean;
	active: boolean;
	onPick: () => void;
}) {
	const initials = customer.name
		.split(" ")
		.slice(-2)
		.map((word) => word[0])
		.join("")
		.toUpperCase();
	return (
		<button
			id={`customer-option-${customer.id}`}
			type="button"
			role="option"
			aria-selected={selected}
			onClick={onPick}
			className={`flex min-h-12 w-full items-center gap-3 rounded-[12px] px-2.5 py-3 text-left transition-colors ${active ? "bg-[#f3f8f1]" : "hover:bg-[#f5f5f5]"}`}
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
						{customer.type ? customerTypeLabel[customer.type] : "Khách hàng"}
					</span>
				</span>
				<span className="text-sm text-[#9e9e9e]">
					{customer.phone ?? "Chưa có số điện thoại"}
					{customer.balance > 0
						? ` · Đang nợ ${formatVND(customer.balance)}₫`
						: ""}
				</span>
			</span>
			{selected ? (
				<Check className="size-5 shrink-0 text-primary" aria-hidden />
			) : null}
		</button>
	);
}
