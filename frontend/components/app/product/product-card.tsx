"use client";

import { Package } from "lucide-react";
import Link from "next/link";
import { formatVND } from "@/lib/format";
import {
	brandName,
	categoryName,
	getStockStatus,
	type Product,
	stockStatusBadgeClass,
	stockStatusLabel,
} from "@/lib/products";

/**
 * Thẻ 1 sản phẩm cho mobile (DESIGN.md §12.1).
 * Tile màu module "Sản phẩm" (Lime #5cad45) + tên + SKU + tồn + giá + badge trạng thái.
 */
export function ProductCard({ product }: { product: Product }) {
	const status = getStockStatus(product);

	return (
		<Link
			href={`/san-pham/${product.id}`}
			className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card transition-shadow duration-200 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
		>
			<span
				className="flex size-12 shrink-0 items-center justify-center rounded-[12px]"
				style={{ backgroundColor: "#5cad45" }}
			>
				<Package className="size-6 text-white" aria-hidden />
			</span>

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-start justify-between gap-2">
					<p className="line-clamp-2 text-base font-semibold text-foreground">
						{product.name}
					</p>
					<span
						className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${stockStatusBadgeClass[status]}`}
					>
						{stockStatusLabel[status]}
					</span>
				</div>

				<p className="text-sm text-[#616161]">
					{categoryName(product.categoryId)}
					{product.brandId ? ` · ${brandName(product.brandId)}` : ""}
				</p>

				<div className="mt-1 flex items-end justify-between gap-2">
					<span className="text-sm text-[#616161]">
						Tồn:{" "}
						<span className="font-semibold text-foreground">
							{formatVND(product.stock)} {product.baseUnit}
						</span>
					</span>
					<span className="text-lg font-bold text-foreground">
						{formatVND(product.salePrice)}
						<span className="ml-0.5 text-sm">₫</span>
					</span>
				</div>
			</div>
		</Link>
	);
}
