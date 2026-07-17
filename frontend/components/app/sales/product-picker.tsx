"use client";

import { Package, ScanLine, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { ScanSheet } from "@/components/app/sales/scan-sheet";
import { formatVND } from "@/lib/format";
import {
	getStockStatus,
	type Product,
	products as seedProducts,
	stockStatusBadgeClass,
	stockStatusLabel,
} from "@/lib/products";

/**
 * Combobox tìm sản phẩm nhanh (DESIGN.md §8, §15) + nút quét mã vạch (mobile).
 * Gõ tên / SKU / mã vạch → danh sách gợi ý xổ xuống; chọn để thêm vào giỏ.
 * Nút quét mở ScanSheet (camera preview + nhập mã tay). Dùng chung Bán nhanh + Đơn.
 */
export function ProductPicker({
	onSelect,
	placeholder = "Tìm sản phẩm, quét mã...",
}: {
	onSelect: (product: Product) => void;
	placeholder?: string;
}) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [scanOpen, setScanOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return seedProducts.slice(0, 6);
		return seedProducts
			.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.sku.toLowerCase().includes(q) ||
					(p.barcode?.includes(q) ?? false),
			)
			.slice(0, 8);
	}, [query]);

	function pick(product: Product) {
		if (getStockStatus(product) === "out-of-stock") return;
		onSelect(product);
		setQuery("");
		setOpen(false);
		inputRef.current?.blur();
	}

	return (
		<div className="flex items-start gap-2">
			<div className="relative flex-1">
				<Search
					className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-[#9e9e9e]"
					aria-hidden
				/>
				<input
					ref={inputRef}
					type="search"
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					placeholder={placeholder}
					className="h-12 w-full rounded-[10px] border border-border bg-white pl-11 pr-11 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
				/>
				{query ? (
					<button
						type="button"
						aria-label="Xóa tìm kiếm"
						onClick={() => {
							setQuery("");
							inputRef.current?.focus();
						}}
						className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-[#9e9e9e] hover:bg-[#f5f5f5]"
					>
						<X className="size-4.5" aria-hidden />
					</button>
				) : null}

				{open ? (
					<>
						{/* Lớp bắt click ra ngoài để đóng */}
						<button
							type="button"
							aria-label="Đóng gợi ý"
							onClick={() => setOpen(false)}
							className="fixed inset-0 z-30 cursor-default"
						/>
						<div className="absolute inset-x-0 top-[calc(100%+6px)] z-40 max-h-[320px] overflow-y-auto rounded-[14px] border border-border bg-card p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
							{results.length === 0 ? (
								<p className="px-3 py-6 text-center text-base text-[#9e9e9e]">
									Không tìm thấy sản phẩm phù hợp
								</p>
							) : (
								results.map((p) => {
									const st = getStockStatus(p);
									const soldOut = st === "out-of-stock";
									return (
										<button
											key={p.id}
											type="button"
											disabled={soldOut}
											onClick={() => pick(p)}
											className={`flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-left transition-colors ${
												soldOut
													? "cursor-not-allowed opacity-55"
													: "hover:bg-accent"
											}`}
										>
											<span
												className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
												style={{ backgroundColor: "#9e9d24" }}
											>
												<Package className="size-5 text-white" aria-hidden />
											</span>
											<span className="flex min-w-0 flex-1 flex-col">
												<span className="truncate text-base font-semibold text-foreground">
													{p.name}
												</span>
												<span className="text-sm text-[#9e9e9e]">
													Tồn: {formatVND(p.stock)} {p.baseUnit}
												</span>
											</span>
											<span className="flex shrink-0 flex-col items-end gap-1">
												<span className="whitespace-nowrap text-base font-bold text-foreground">
													{formatVND(p.salePrice)}₫
												</span>
												<span
													className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${stockStatusBadgeClass[st]}`}
												>
													{stockStatusLabel[st]}
												</span>
											</span>
										</button>
									);
								})
							)}
						</div>
					</>
				) : null}
			</div>

			{/* Nút quét mã vạch — mobile/tablet (DESIGN.md §15.1). Desktop dùng máy quét cắm ngoài. */}
			<button
				type="button"
				onClick={() => setScanOpen(true)}
				aria-label="Quét mã vạch"
				className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5] lg:hidden"
			>
				<ScanLine className="size-5.5" aria-hidden />
			</button>

			<ScanSheet
				open={scanOpen}
				onClose={() => setScanOpen(false)}
				onFound={(product) => {
					pick(product);
					setScanOpen(false);
				}}
			/>
		</div>
	);
}
