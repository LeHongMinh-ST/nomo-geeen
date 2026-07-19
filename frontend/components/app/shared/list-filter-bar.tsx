"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

/**
 * Thanh bộ lọc danh sách dùng chung (DESIGN.md §12.4).
 * - Mobile/tablet (< lg): 1 nhóm → Select trực tiếp; ≥2 nhóm → nút "Bộ lọc"
 *   mở Drawer trượt từ dưới (kiểu Traveloka) chứa các Select + Áp dụng/Đặt lại.
 * - Desktop (lg+): các Select inline trên toolbar, không drawer.
 */

export type FilterOption = { value: string; label: string };

export type FilterGroup = {
	key: string;
	label: string;
	value: string;
	options: FilterOption[];
	onChange: (value: string) => void;
	/** Giá trị "tất cả"/mặc định — mặc định lấy option đầu tiên. */
	allValue?: string;
};

function groupDefault(g: FilterGroup) {
	return g.allValue ?? g.options[0]?.value;
}

function FilterSelect({
	group,
	prefix,
}: {
	group: FilterGroup;
	prefix?: boolean;
}) {
	return (
		<Select value={group.value} onValueChange={group.onChange}>
			<SelectTrigger
				aria-label={group.label}
				className={prefix ? "lg:w-auto lg:min-w-[190px]" : ""}
			>
				{prefix ? (
					<span className="font-normal text-[#616161]">{group.label}:</span>
				) : null}
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{group.options.map((o) => (
					<SelectItem key={o.value} value={o.value}>
						{o.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function ListFilterBar({ groups }: { groups: FilterGroup[] }) {
	const [open, setOpen] = useState(false);

	const activeCount = groups.filter((g) => g.value !== groupDefault(g)).length;

	const reset = () => {
		for (const g of groups) g.onChange(groupDefault(g));
	};

	return (
		<>
			{/* Desktop — Select inline */}
			<div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-3">
				{groups.map((g) => (
					<FilterSelect key={g.key} group={g} prefix />
				))}
			</div>

			{/* Mobile/tablet */}
			<div className="flex flex-col gap-3 lg:hidden">
				{groups.length <= 1 ? (
					groups.map((g) => <FilterSelect key={g.key} group={g} />)
				) : (
					<button
						type="button"
						onClick={() => setOpen(true)}
						className="flex h-12 items-center justify-center gap-2 rounded-[10px] border border-border bg-white px-4 text-base font-semibold text-foreground shadow-xs transition-colors duration-200 ease-out hover:bg-[#f5f5f5] active:scale-[0.99]"
					>
						<SlidersHorizontal className="size-5 text-[#616161]" aria-hidden />
						Bộ lọc
						{activeCount > 0 ? (
							<span className="ml-1 flex size-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
								{activeCount}
							</span>
						) : null}
					</button>
				)}
			</div>

			{groups.length > 1 ? (
				<Drawer open={open} onOpenChange={setOpen}>
					<DrawerContent className="lg:hidden">
						<DrawerHeader>
							<DrawerTitle>Bộ lọc</DrawerTitle>
						</DrawerHeader>
						<div className="flex flex-col gap-4 overflow-y-auto px-5 py-2">
							{groups.map((g) => (
								<div key={g.key} className="flex flex-col gap-2">
									<span className="text-sm font-semibold text-foreground">
										{g.label}
									</span>
									<FilterSelect group={g} />
								</div>
							))}
						</div>
						<DrawerFooter>
							<DrawerClose asChild>
								<button
									type="button"
									className="flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:scale-[0.99]"
								>
									Áp dụng
								</button>
							</DrawerClose>
							<button
								type="button"
								onClick={reset}
								className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] text-base font-semibold text-[#616161] transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
							>
								<RotateCcw className="size-4.5" aria-hidden />
								Đặt lại
							</button>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			) : null}
		</>
	);
}
