"use client";

import { ArrowDown01, ArrowUp01, Filter, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Toolbar hairline cho RoleTable: search + filter pill + sort pill.
 * FilterPill là dropdown thuần (không cài shadcn DropdownMenu) — dùng portal
 * inline absolute, đóng khi click ngoài / Esc.
 */

export type ScopeFilter = "all" | "system" | "custom";
export type SortKey = "newest" | "name" | "permissions";

export const SCOPE_OPTIONS: { value: ScopeFilter; label: string }[] = [
	{ value: "all", label: "Tất cả" },
	{ value: "system", label: "Hệ thống" },
	{ value: "custom", label: "Tuỳ chỉnh" },
];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
	{ value: "newest", label: "Mới cập nhật" },
	{ value: "name", label: "Tên A → Z" },
	{ value: "permissions", label: "Nhiều quyền nhất" },
];

interface Props {
	query: string;
	onQuery: (v: string) => void;
	scope: ScopeFilter;
	onScope: (v: ScopeFilter) => void;
	sort: SortKey;
	onSort: (v: SortKey) => void;
}

export function RoleToolbar({
	query,
	onQuery,
	scope,
	onScope,
	sort,
	onSort,
}: Props) {
	return (
		<div className="flex flex-col gap-2 border-y border-border/60 py-3 sm:flex-row sm:items-center">
			<label className="relative flex h-10 flex-1 items-center">
				<Search
					className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
					aria-hidden
				/>
				<input
					type="search"
					value={query}
					onChange={(e) => onQuery(e.target.value)}
					placeholder="Tìm theo tên hoặc mã vai trò..."
					className="h-10 w-full rounded-[10px] border border-transparent bg-transparent pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 hover:border-border/80 focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
				/>
			</label>
			<div className="flex items-center gap-2">
				<FilterPill<ScopeFilter>
					icon={Filter}
					value={scope}
					options={SCOPE_OPTIONS}
					onChange={onScope}
					ariaLabel="Lọc theo loại vai trò"
				/>
				<FilterPill<SortKey>
					icon={sort === "name" ? ArrowDown01 : ArrowUp01}
					value={sort}
					options={SORT_OPTIONS}
					onChange={onSort}
					ariaLabel="Sắp xếp vai trò"
				/>
			</div>
		</div>
	);
}

function FilterPill<T extends string>({
	icon: Icon,
	value,
	options,
	onChange,
	ariaLabel,
}: {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	value: T;
	options: { value: T; label: string }[];
	onChange: (v: T) => void;
	ariaLabel: string;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const current = options.find((o) => o.value === value);

	useEffect(() => {
		if (!open) return;
		function handle(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		function key(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", handle);
		document.addEventListener("keydown", key);
		return () => {
			document.removeEventListener("mousedown", handle);
			document.removeEventListener("keydown", key);
		};
	}, [open]);

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={ariaLabel}
				onClick={() => setOpen((o) => !o)}
				className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-border/60 bg-card px-3 text-sm text-foreground transition-colors duration-150 hover:bg-muted/30"
			>
				<Icon className="size-3.5 text-muted-foreground" aria-hidden />
				<span className="text-muted-foreground">·</span>
				<span className="font-medium">{current?.label}</span>
			</button>
			{open ? (
				<div
					role="listbox"
					className="absolute right-0 top-full z-30 mt-1.5 min-w-[180px] overflow-hidden rounded-[10px] border border-border/60 bg-card shadow-lg"
				>
					{options.map((opt) => (
						<button
							key={opt.value}
							type="button"
							role="option"
							aria-selected={opt.value === value}
							onClick={() => {
								onChange(opt.value);
								setOpen(false);
							}}
							className={cn(
								"flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors duration-150",
								opt.value === value
									? "bg-primary-soft font-semibold text-primary"
									: "text-foreground hover:bg-muted/30",
							)}
						>
							{opt.label}
							{opt.value === value ? (
								<span className="size-1.5 rounded-full bg-primary" />
							) : null}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
