"use client";

import {
	ArrowLeft,
	FlaskConical,
	Layers,
	Lock,
	Package,
	Pencil,
	Tag,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatVND } from "@/lib/format";
import {
	brandName,
	categoryName,
	getStockStatus,
	manufacturers,
	type Product,
	stockStatusBadgeClass,
	stockStatusLabel,
} from "@/lib/products";
import { deleteTenantProduct } from "@/lib/tenant-products-api";
import { ProductForm } from "./product-form";

/**
 * Chi tiết sản phẩm + chuyển sang sửa inline (không modal).
 * FE-only: xóa chỉ mock rồi quay lại danh sách.
 */
export function ProductDetail({ product }: { product: Product }) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	const status = getStockStatus(product);
	const manufacturerName =
		product.manufacturerLabel ??
		manufacturers.find((m) => m.id === product.manufacturerId)?.name ??
		null;

	if (editing) {
		return (
			<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 lg:mx-0">
				<div className="flex items-start gap-3">
					<button
						type="button"
						onClick={() => setEditing(false)}
						aria-label="Quay lại chi tiết"
						className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
					>
						<ArrowLeft className="size-5" aria-hidden />
					</button>
					<div className="flex flex-col gap-1 pt-0.5">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Sửa sản phẩm
						</h1>
						<p className="text-base text-[#616161]">{product.name}</p>
					</div>
				</div>
				<ProductForm mode="edit" product={product} />
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-24 lg:mx-0 lg:pb-6">
			{/* Header */}
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/san-pham")}
					aria-label="Quay lại danh sách"
					className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Chi tiết sản phẩm
					</h1>
					<p className="text-base text-[#616161]">Mã: {product.sku}</p>
				</div>
			</div>

			{/* Thẻ tổng quan */}
			<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex items-start gap-4">
					<span
						className="flex size-16 shrink-0 items-center justify-center rounded-[14px]"
						style={{ backgroundColor: "#5cad45" }}
					>
						<Package className="size-8 text-white" aria-hidden />
					</span>
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<h2 className="text-xl font-bold text-foreground">
							{product.name}
						</h2>
						<div className="flex flex-wrap items-center gap-2">
							<span
								className={`rounded-full px-3 py-0.5 text-sm font-semibold ${stockStatusBadgeClass[status]}`}
							>
								{stockStatusLabel[status]}
							</span>
							{product.locked ? (
								<span className="flex items-center gap-1 rounded-full bg-[#f5f5f5] px-3 py-0.5 text-sm font-semibold text-[#616161]">
									<Lock className="size-3.5" aria-hidden />
									Đã khóa bán
								</span>
							) : null}
						</div>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<InfoTile
						label="Giá lẻ"
						value={`${formatVND(product.salePrice)}₫`}
						big
					/>
					<InfoTile
						label={`Tồn kho (${product.baseUnit})`}
						value={formatVND(product.stock)}
						big
					/>
				</div>
			</section>

			{/* Thông tin cơ bản */}
			<InfoSection icon={Tag} tile="#5cad45" title="Thông tin chung">
				<InfoRow
					label="Danh mục"
					value={product.categoryLabel ?? categoryName(product.categoryId)}
				/>
				<InfoRow
					label="Thương hiệu"
					value={product.brandLabel ?? brandName(product.brandId)}
				/>
				{manufacturerName ? (
					<InfoRow label="Nhà sản xuất" value={manufacturerName} />
				) : null}
				{product.barcode ? (
					<InfoRow label="Mã vạch" value={product.barcode} />
				) : null}
				<InfoRow label="Giá vốn" value={`${formatVND(product.costPrice)}₫`} />
				{product.wholesalePrice ? (
					<InfoRow
						label="Giá sỉ"
						value={`${formatVND(product.wholesalePrice)}₫`}
					/>
				) : null}
			</InfoSection>

			{/* Đơn vị & quy đổi */}
			{product.conversions.length > 0 ? (
				<InfoSection icon={Layers} tile="#5cad45" title="Đơn vị & quy đổi">
					<InfoRow label="Đơn vị gốc" value={product.baseUnit} />
					{product.conversions.map((c) => (
						<InfoRow
							key={c.unit}
							label={`1 ${c.unit}`}
							value={`${formatVND(c.factor)} ${product.baseUnit}`}
						/>
					))}
				</InfoSection>
			) : null}

			{/* Giá theo bậc */}
			{product.priceTiers.length > 1 ? (
				<InfoSection icon={Tag} tile="#5cad45" title="Giá theo bậc số lượng">
					{product.priceTiers.map((t) => (
						<InfoRow
							key={t.minQty}
							label={`Từ ${formatVND(t.minQty)} ${product.baseUnit}`}
							value={`${formatVND(t.price)}₫`}
						/>
					))}
				</InfoSection>
			) : null}

			{/* Chuyên ngành */}
			{product.agro?.activeIngredient ? (
				<InfoSection
					icon={FlaskConical}
					tile="#5cad45"
					title="Thông tin chuyên ngành"
				>
					{product.agro.activeIngredient ? (
						<InfoRow label="Hoạt chất" value={product.agro.activeIngredient} />
					) : null}
					{product.agro.concentration ? (
						<InfoRow label="Nồng độ" value={product.agro.concentration} />
					) : null}
					{product.agro.crop ? (
						<InfoRow label="Cây trồng" value={product.agro.crop} />
					) : null}
					{product.agro.pest ? (
						<InfoRow label="Dịch hại" value={product.agro.pest} />
					) : null}
					{product.agro.phi != null ? (
						<InfoRow label="Cách ly (PHI)" value={`${product.agro.phi} ngày`} />
					) : null}
					{product.agro.rei != null ? (
						<InfoRow
							label="Cách ly vào lại (REI)"
							value={`${product.agro.rei} giờ`}
						/>
					) : null}
				</InfoSection>
			) : null}

			{/* Xóa — inline confirm */}
			{confirmDelete ? (
				<div className="flex flex-col gap-3 rounded-[16px] border border-[#ffcdd2] bg-[#fff5f5] p-4">
					<p className="text-base text-foreground">
						Xóa <span className="font-semibold">{product.name}</span>? Sản phẩm
						sẽ chuyển vào thùng rác.
					</p>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setConfirmDelete(false)}
							className="h-11 flex-1 rounded-[10px] border border-border bg-card text-base font-semibold text-foreground hover:bg-[#f5f5f5]"
						>
							Hủy
						</button>
						<button
							type="button"
							onClick={async () => {
								setDeleting(true);
								setDeleteError(null);
								try {
									await deleteTenantProduct(product.id);
									router.push("/san-pham");
								} catch {
									setDeleteError("Không thể xóa sản phẩm. Vui lòng thử lại.");
									setDeleting(false);
								}
							}}
							disabled={deleting}
							className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-destructive text-base font-semibold text-white hover:bg-[#c62828]"
						>
							<Trash2 className="size-5" aria-hidden />
							Xóa
						</button>
					</div>
					{deleteError ? (
						<p className="text-sm text-destructive" role="alert">
							{deleteError}
						</p>
					) : null}
				</div>
			) : (
				<button
					type="button"
					onClick={() => setConfirmDelete(true)}
					className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-base font-semibold text-destructive shadow-card transition-colors duration-200 ease-out hover:bg-[#fdecea] lg:hidden"
				>
					<Trash2 className="size-5" aria-hidden />
					Xóa sản phẩm
				</button>
			)}

			{/* Hành động — desktop */}
			<div className="hidden items-center justify-between gap-3 lg:flex">
				<button
					type="button"
					onClick={() => setConfirmDelete(true)}
					className="flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-5 text-base font-semibold text-destructive hover:bg-[#fdecea]"
				>
					<Trash2 className="size-5" aria-hidden />
					Xóa
				</button>
				<button
					type="button"
					onClick={() => setEditing(true)}
					className="flex h-11 items-center gap-2 rounded-[10px] bg-primary px-8 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
				>
					<Pencil className="size-5" aria-hidden />
					Sửa sản phẩm
				</button>
			</div>

			{/* Sửa — mobile dính đáy */}
			<div className="fixed inset-x-0 bottom-nav-safe z-20 border-t border-border bg-card p-3 lg:hidden">
				<button
					type="button"
					onClick={() => setEditing(true)}
					className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-base font-semibold text-white transition-colors duration-200 ease-out active:bg-[#3f8530]"
				>
					<Pencil className="size-5" aria-hidden />
					Sửa sản phẩm
				</button>
			</div>
		</div>
	);
}

function InfoTile({
	label,
	value,
	big,
}: {
	label: string;
	value: string;
	big?: boolean;
}) {
	return (
		<div className="flex flex-col gap-1 rounded-[12px] bg-[#fafafa] p-4">
			<span className="text-sm text-[#616161]">{label}</span>
			<span
				className={`font-bold text-foreground ${big ? "text-xl" : "text-base"}`}
			>
				{value}
			</span>
		</div>
	);
}

function InfoSection({
	icon: Icon,
	tile,
	title,
	children,
}: {
	icon: typeof Package;
	tile: string;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-1 rounded-[16px] border border-border bg-card p-5 shadow-card">
			<div className="mb-2 flex items-center gap-3">
				<span
					className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
					style={{ backgroundColor: tile }}
				>
					<Icon className="size-4.5 text-white" aria-hidden />
				</span>
				<h2 className="text-lg font-semibold text-foreground">{title}</h2>
			</div>
			{children}
		</section>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
			<span className="text-base text-[#616161]">{label}</span>
			<span className="text-right text-base font-medium text-foreground">
				{value}
			</span>
		</div>
	);
}
