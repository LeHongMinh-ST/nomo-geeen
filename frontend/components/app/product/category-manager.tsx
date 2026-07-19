"use client";

import { Check, Plus, Tag, Trash2, X } from "lucide-react";
import { useState } from "react";
import { SettingHeader } from "@/components/app/setting-header";
import {
	brands as seedBrands,
	categories as seedCategories,
	manufacturers as seedManufacturers,
	units as seedUnits,
} from "@/lib/products";

/**
 * Quản lý danh mục phụ: Danh mục · Thương hiệu · Đơn vị · Nhà sản xuất.
 * Tabs inline + thêm/xóa inline (không modal — DESIGN.md hạn chế lớp phủ).
 * FE-only: state cục bộ, chưa nối API.
 */

type Entity = { id: string; name: string };
type TabKey = "category" | "brand" | "unit" | "manufacturer";

const tabs: { key: TabKey; label: string; unit: string; tile: string }[] = [
	{ key: "category", label: "Danh mục", unit: "danh mục", tile: "#5cad45" },
	{ key: "brand", label: "Thương hiệu", unit: "thương hiệu", tile: "#5cad45" },
	{ key: "unit", label: "Đơn vị", unit: "đơn vị", tile: "#5cad45" },
	{
		key: "manufacturer",
		label: "Nhà sản xuất",
		unit: "nhà sản xuất",
		tile: "#5cad45",
	},
];

export function CategoryManager() {
	const [active, setActive] = useState<TabKey>("category");
	const [data, setData] = useState<Record<TabKey, Entity[]>>({
		category: seedCategories,
		brand: seedBrands,
		unit: seedUnits,
		manufacturer: seedManufacturers,
	});
	const [newName, setNewName] = useState("");
	const [confirmId, setConfirmId] = useState<string | null>(null);

	const current = tabs.find((t) => t.key === active) ?? tabs[0];
	const list = data[active];

	function addItem() {
		const name = newName.trim();
		if (!name) return;
		// TODO: gọi API tạo khi backend sẵn sàng.
		const id = `${active}-${Date.now()}`;
		setData((d) => ({ ...d, [active]: [{ id, name }, ...d[active]] }));
		setNewName("");
	}

	function removeItem(id: string) {
		// TODO: gọi API xóa khi backend sẵn sàng.
		setData((d) => ({ ...d, [active]: d[active].filter((e) => e.id !== id) }));
		setConfirmId(null);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 lg:mx-0">
			<SettingHeader
				title="Quản lý danh mục"
				description="Danh mục, thương hiệu, đơn vị và nhà sản xuất dùng chung cho sản phẩm."
			/>

			{/* Tabs */}
			<div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
				{tabs.map((t) => (
					<button
						key={t.key}
						type="button"
						onClick={() => {
							setActive(t.key);
							setConfirmId(null);
							setNewName("");
						}}
						className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors duration-200 ease-out ${
							active === t.key
								? "bg-primary text-white"
								: "border border-border bg-card text-[#616161] hover:bg-[#f5f5f5]"
						}`}
					>
						{t.label}
						<span
							className={`ml-1.5 ${active === t.key ? "text-white/80" : "text-[#9e9e9e]"}`}
						>
							{data[t.key].length}
						</span>
					</button>
				))}
			</div>

			{/* Thêm nhanh — inline */}
			<div className="flex items-center gap-2">
				<input
					type="text"
					value={newName}
					onChange={(e) => setNewName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							addItem();
						}
					}}
					placeholder={`Thêm ${current.unit} mới...`}
					className="h-12 flex-1 rounded-[10px] border border-border bg-white px-4 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11"
				/>
				<button
					type="button"
					onClick={addItem}
					disabled={!newName.trim()}
					aria-label="Thêm"
					className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-primary text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] disabled:opacity-50 md:h-11"
				>
					<Plus className="size-6" aria-hidden />
				</button>
			</div>

			{/* Danh sách */}
			{list.length === 0 ? (
				<div className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-border bg-card px-6 py-12 text-center">
					<Tag className="size-8 text-[#9e9e9e]" aria-hidden />
					<p className="text-base text-[#616161]">
						Chưa có {current.unit} nào. Thêm ở ô phía trên.
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-card">
					{list.map((item) => (
						<div
							key={item.id}
							className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
						>
							<span
								className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
								style={{ backgroundColor: current.tile }}
							>
								<Tag className="size-4.5 text-white" aria-hidden />
							</span>
							<span className="min-w-0 flex-1 truncate text-base font-medium text-foreground">
								{item.name}
							</span>

							{confirmId === item.id ? (
								<div className="flex items-center gap-1.5">
									<button
										type="button"
										aria-label="Hủy xóa"
										onClick={() => setConfirmId(null)}
										className="flex size-10 items-center justify-center rounded-[8px] border border-border text-[#616161] hover:bg-[#f5f5f5]"
									>
										<X className="size-5" aria-hidden />
									</button>
									<button
										type="button"
										aria-label="Xác nhận xóa"
										onClick={() => removeItem(item.id)}
										className="flex size-10 items-center justify-center rounded-[8px] bg-destructive text-white hover:bg-[#c62828]"
									>
										<Check className="size-5" aria-hidden />
									</button>
								</div>
							) : (
								<button
									type="button"
									aria-label={`Xóa ${item.name}`}
									onClick={() => setConfirmId(item.id)}
									className="flex size-10 shrink-0 items-center justify-center rounded-[8px] text-[#9e9e9e] transition-colors hover:bg-[#fdecea] hover:text-destructive"
								>
									<Trash2 className="size-5" aria-hidden />
								</button>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
