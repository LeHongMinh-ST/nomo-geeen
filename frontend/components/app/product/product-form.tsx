"use client";

import {
	Barcode,
	ChevronDown,
	FlaskConical,
	Layers,
	Lock,
	Package,
	Plus,
	Tag,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	brands,
	categories,
	manufacturers,
	type PriceTier,
	type Product,
	type UnitConversion,
	units,
} from "@/lib/products";

/**
 * Form Thêm/Sửa sản phẩm — đầy đủ theo base_spec §5, §5.1, §11.
 * Mobile-first (DESIGN.md): chia section, nút Lưu dính đáy full-width.
 * FE-only: state cục bộ, chưa nối API.
 */

type FormMode = "create" | "edit";

type FormState = {
	name: string;
	sku: string;
	barcode: string;
	categoryId: string;
	brandId: string;
	manufacturerId: string;
	baseUnit: string;
	conversions: UnitConversion[];
	costPrice: string;
	salePrice: string;
	wholesalePrice: string;
	priceTiers: PriceTier[];
	stock: string;
	lowStockThreshold: string;
	activeIngredient: string;
	concentration: string;
	crop: string;
	pest: string;
	phi: string;
	rei: string;
	locked: boolean;
};

function toFormState(p?: Product): FormState {
	return {
		name: p?.name ?? "",
		sku: p?.sku ?? "",
		barcode: p?.barcode ?? "",
		categoryId: p?.categoryId ?? "",
		brandId: p?.brandId ?? "",
		manufacturerId: p?.manufacturerId ?? "",
		baseUnit: p?.baseUnit ?? "",
		conversions: p?.conversions ?? [],
		costPrice: p ? String(p.costPrice) : "",
		salePrice: p ? String(p.salePrice) : "",
		wholesalePrice: p?.wholesalePrice ? String(p.wholesalePrice) : "",
		priceTiers: p?.priceTiers ?? [],
		stock: p ? String(p.stock) : "",
		lowStockThreshold: p ? String(p.lowStockThreshold) : "",
		activeIngredient: p?.agro?.activeIngredient ?? "",
		concentration: p?.agro?.concentration ?? "",
		crop: p?.agro?.crop ?? "",
		pest: p?.agro?.pest ?? "",
		phi: p?.agro?.phi != null ? String(p.agro.phi) : "",
		rei: p?.agro?.rei != null ? String(p.agro.rei) : "",
		locked: p?.locked ?? false,
	};
}

export function ProductForm({
	mode,
	product,
}: {
	mode: FormMode;
	product?: Product;
}) {
	const router = useRouter();
	const [form, setForm] = useState<FormState>(() => toFormState(product));
	const [agroOpen, setAgroOpen] = useState<boolean>(
		Boolean(product?.agro?.activeIngredient),
	);
	const [saving, setSaving] = useState(false);

	function set<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	function addConversion() {
		set("conversions", [...form.conversions, { unit: "", factor: 1 }]);
	}
	function updateConversion(i: number, patch: Partial<UnitConversion>) {
		set(
			"conversions",
			form.conversions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
		);
	}
	function removeConversion(i: number) {
		set(
			"conversions",
			form.conversions.filter((_, idx) => idx !== i),
		);
	}

	function addTier() {
		set("priceTiers", [...form.priceTiers, { minQty: 1, price: 0 }]);
	}
	function updateTier(i: number, patch: Partial<PriceTier>) {
		set(
			"priceTiers",
			form.priceTiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
		);
	}
	function removeTier(i: number) {
		set(
			"priceTiers",
			form.priceTiers.filter((_, idx) => idx !== i),
		);
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setSaving(true);
		// TODO: gọi API tạo/cập nhật sản phẩm khi backend sẵn sàng.
		setTimeout(() => {
			router.push("/san-pham");
		}, 400);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-24 lg:mx-0 lg:pb-6"
		>
			{/* Section 1: Thông tin cơ bản */}
			<Section icon={Package} tile="#5cad45" title="Thông tin cơ bản">
				<Field label="Tên sản phẩm" required>
					<input
						type="text"
						required
						value={form.name}
						onChange={(e) => set("name", e.target.value)}
						placeholder="VD: Phân bón NPK Đầu Trâu 20-20-15"
						className={inputClass}
					/>
				</Field>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label="Mã SKU" required>
						<div className="relative">
							<Tag className={iconClass} aria-hidden />
							<input
								type="text"
								required
								value={form.sku}
								onChange={(e) => set("sku", e.target.value)}
								placeholder="NPK-202015"
								className={`${inputClass} pl-10.5`}
							/>
						</div>
					</Field>
					<Field label="Mã vạch (Barcode)">
						<div className="relative">
							<Barcode className={iconClass} aria-hidden />
							<input
								type="text"
								inputMode="numeric"
								value={form.barcode}
								onChange={(e) => set("barcode", e.target.value)}
								placeholder="8938501234567"
								className={`${inputClass} pl-10.5`}
							/>
						</div>
					</Field>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label="Danh mục" required>
						<Select
							value={form.categoryId}
							onChange={(v) => set("categoryId", v)}
							placeholder="Chọn danh mục"
							options={categories.map((c) => ({ value: c.id, label: c.name }))}
							required
						/>
					</Field>
					<Field label="Thương hiệu">
						<Select
							value={form.brandId}
							onChange={(v) => set("brandId", v)}
							placeholder="Chọn thương hiệu"
							options={brands.map((b) => ({ value: b.id, label: b.name }))}
						/>
					</Field>
				</div>

				<Field label="Nhà sản xuất">
					<Select
						value={form.manufacturerId}
						onChange={(v) => set("manufacturerId", v)}
						placeholder="Chọn nhà sản xuất"
						options={manufacturers.map((m) => ({ value: m.id, label: m.name }))}
					/>
				</Field>

				{/* Khóa bán */}
				<label className="flex items-center gap-3 rounded-[10px] border border-border bg-[#fafafa] px-4 py-3">
					<input
						type="checkbox"
						checked={form.locked}
						onChange={(e) => set("locked", e.target.checked)}
						className="size-5 accent-primary"
					/>
					<span className="flex items-center gap-1.5 text-base text-foreground">
						<Lock className="size-4.5 text-[#9e9e9e]" aria-hidden />
						Khóa bán sản phẩm này
					</span>
				</label>
			</Section>

			{/* Section 2: Đơn vị & quy đổi */}
			<Section icon={Layers} tile="#5cad45" title="Đơn vị & quy đổi">
				<Field label="Đơn vị tồn kho gốc (Base Unit)" required>
					<Select
						value={form.baseUnit}
						onChange={(v) => set("baseUnit", v)}
						placeholder="Chọn đơn vị (Chai, Kg, Gói...)"
						options={units.map((u) => ({ value: u.name, label: u.name }))}
						required
					/>
				</Field>

				<div className="flex flex-col gap-2">
					<span className="text-sm font-medium text-foreground">
						Đơn vị quy đổi
					</span>
					<p className="text-sm text-[#616161]">
						Nhập theo đơn vị lớn, tự quy đổi ra {form.baseUnit || "đơn vị gốc"}.
						VD: 1 Bao = 50 Kg.
					</p>

					{form.conversions.map((c, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: dòng nhập tạm, không có id ổn định
						<div key={i} className="flex items-center gap-2">
							<input
								type="text"
								value={c.unit}
								onChange={(e) => updateConversion(i, { unit: e.target.value })}
								placeholder="Bao"
								className={`${inputClass} flex-1`}
							/>
							<span className="text-base text-[#616161]">=</span>
							<input
								type="number"
								inputMode="numeric"
								min={1}
								value={c.factor}
								onChange={(e) =>
									updateConversion(i, { factor: Number(e.target.value) })
								}
								className={`${inputClass} w-24 text-right`}
							/>
							<span className="w-16 shrink-0 text-sm text-[#616161]">
								{form.baseUnit || "gốc"}
							</span>
							<button
								type="button"
								aria-label="Xóa dòng quy đổi"
								onClick={() => removeConversion(i)}
								className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-[#9e9e9e] hover:bg-[#fdecea] hover:text-destructive"
							>
								<Trash2 className="size-5" aria-hidden />
							</button>
						</div>
					))}

					<button
						type="button"
						onClick={addConversion}
						className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-dashed border-border text-base font-semibold text-primary hover:bg-accent"
					>
						<Plus className="size-5" aria-hidden />
						Thêm quy đổi
					</button>
				</div>
			</Section>

			{/* Section 3: Giá & tồn kho */}
			<Section icon={Tag} tile="#5cad45" title="Giá bán & tồn kho">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<Field label="Giá vốn (₫)">
						<input
							type="number"
							inputMode="numeric"
							min={0}
							value={form.costPrice}
							onChange={(e) => set("costPrice", e.target.value)}
							placeholder="0"
							className={`${inputClass} text-right`}
						/>
					</Field>
					<Field label="Giá lẻ (₫)" required>
						<input
							type="number"
							inputMode="numeric"
							min={0}
							required
							value={form.salePrice}
							onChange={(e) => set("salePrice", e.target.value)}
							placeholder="0"
							className={`${inputClass} text-right`}
						/>
					</Field>
					<Field label="Giá sỉ (₫)">
						<input
							type="number"
							inputMode="numeric"
							min={0}
							value={form.wholesalePrice}
							onChange={(e) => set("wholesalePrice", e.target.value)}
							placeholder="0"
							className={`${inputClass} text-right`}
						/>
					</Field>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label={`Tồn kho hiện tại (${form.baseUnit || "gốc"})`}>
						<input
							type="number"
							inputMode="numeric"
							min={0}
							value={form.stock}
							onChange={(e) => set("stock", e.target.value)}
							placeholder="0"
							className={`${inputClass} text-right`}
						/>
					</Field>
					<Field label="Ngưỡng cảnh báo sắp hết">
						<input
							type="number"
							inputMode="numeric"
							min={0}
							value={form.lowStockThreshold}
							onChange={(e) => set("lowStockThreshold", e.target.value)}
							placeholder="0"
							className={`${inputClass} text-right`}
						/>
					</Field>
				</div>

				{/* Giá theo bậc số lượng */}
				<div className="flex flex-col gap-2">
					<span className="text-sm font-medium text-foreground">
						Giá theo bậc số lượng
					</span>
					<p className="text-sm text-[#616161]">
						Mua càng nhiều giá càng tốt. VD: từ 50 {form.baseUnit || "đơn vị"} →
						giá sỉ.
					</p>

					{form.priceTiers.map((t, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: dòng nhập tạm, không có id ổn định
						<div key={i} className="flex items-center gap-2">
							<span className="shrink-0 text-sm text-[#616161]">Từ</span>
							<input
								type="number"
								inputMode="numeric"
								min={1}
								value={t.minQty}
								onChange={(e) =>
									updateTier(i, { minQty: Number(e.target.value) })
								}
								className={`${inputClass} w-20 text-right`}
							/>
							<span className="shrink-0 text-sm text-[#616161]">
								{form.baseUnit || "đv"} →
							</span>
							<input
								type="number"
								inputMode="numeric"
								min={0}
								value={t.price}
								onChange={(e) =>
									updateTier(i, { price: Number(e.target.value) })
								}
								placeholder="Giá ₫"
								className={`${inputClass} flex-1 text-right`}
							/>
							<button
								type="button"
								aria-label="Xóa bậc giá"
								onClick={() => removeTier(i)}
								className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-[#9e9e9e] hover:bg-[#fdecea] hover:text-destructive"
							>
								<Trash2 className="size-5" aria-hidden />
							</button>
						</div>
					))}

					<button
						type="button"
						onClick={addTier}
						className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-dashed border-border text-base font-semibold text-primary hover:bg-accent"
					>
						<Plus className="size-5" aria-hidden />
						Thêm bậc giá
					</button>
				</div>
			</Section>

			{/* Section 4: Thông tin chuyên ngành (thu gọn được) */}
			<div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-card">
				<button
					type="button"
					onClick={() => setAgroOpen((o) => !o)}
					className="flex w-full items-center gap-3 p-5 text-left"
				>
					<span
						className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
						style={{ backgroundColor: "#5cad45" }}
					>
						<FlaskConical className="size-5 text-white" aria-hidden />
					</span>
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="text-lg font-semibold text-foreground">
							Thông tin chuyên ngành
						</span>
						<span className="text-sm text-[#616161]">
							Hoạt chất, nồng độ, cây trồng, cách ly (tùy chọn)
						</span>
					</span>
					<ChevronDown
						className={`size-5 shrink-0 text-[#9e9e9e] transition-transform duration-200 ${
							agroOpen ? "rotate-180" : ""
						}`}
						aria-hidden
					/>
				</button>

				{agroOpen ? (
					<div className="flex flex-col gap-4 border-t border-border p-5">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field label="Hoạt chất">
								<input
									type="text"
									value={form.activeIngredient}
									onChange={(e) => set("activeIngredient", e.target.value)}
									placeholder="VD: Fipronil"
									className={inputClass}
								/>
							</Field>
							<Field label="Nồng độ / Hàm lượng">
								<input
									type="text"
									value={form.concentration}
									onChange={(e) => set("concentration", e.target.value)}
									placeholder="VD: 800 g/kg"
									className={inputClass}
								/>
							</Field>
						</div>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field label="Cây trồng">
								<input
									type="text"
									value={form.crop}
									onChange={(e) => set("crop", e.target.value)}
									placeholder="VD: Lúa"
									className={inputClass}
								/>
							</Field>
							<Field label="Dịch hại / Đối tượng">
								<input
									type="text"
									value={form.pest}
									onChange={(e) => set("pest", e.target.value)}
									placeholder="VD: Rầy nâu, sâu cuốn lá"
									className={inputClass}
								/>
							</Field>
						</div>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field label="Thời gian cách ly - PHI (ngày)">
								<input
									type="number"
									inputMode="numeric"
									min={0}
									value={form.phi}
									onChange={(e) => set("phi", e.target.value)}
									placeholder="VD: 7"
									className={`${inputClass} text-right`}
								/>
							</Field>
							<Field label="Cách ly vào lại - REI (giờ)">
								<input
									type="number"
									inputMode="numeric"
									min={0}
									value={form.rei}
									onChange={(e) => set("rei", e.target.value)}
									placeholder="VD: 24"
									className={`${inputClass} text-right`}
								/>
							</Field>
						</div>
					</div>
				) : null}
			</div>

			{/* Hành động — desktop inline */}
			<div className="hidden items-center justify-end gap-3 lg:flex">
				<button
					type="button"
					onClick={() => router.back()}
					className="h-11 rounded-[10px] border border-border bg-card px-6 text-base font-semibold text-foreground hover:bg-[#f5f5f5]"
				>
					Hủy
				</button>
				<button
					type="submit"
					disabled={saving}
					className="h-11 rounded-[10px] bg-primary px-8 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] disabled:opacity-60"
				>
					{saving
						? "Đang lưu..."
						: mode === "create"
							? "Thêm sản phẩm"
							: "Lưu thay đổi"}
				</button>
			</div>

			{/* Hành động — mobile dính đáy full-width */}
			<div className="fixed inset-x-0 bottom-nav-safe z-20 border-t border-border bg-card p-3 lg:hidden">
				<button
					type="submit"
					disabled={saving}
					className="flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-base font-semibold text-white transition-colors duration-200 ease-out active:bg-[#3f8530] disabled:opacity-60"
				>
					{saving
						? "Đang lưu..."
						: mode === "create"
							? "Thêm sản phẩm"
							: "Lưu thay đổi"}
				</button>
			</div>
		</form>
	);
}

/* ---------- Thành phần con dùng lại trong form ---------- */

const inputClass =
	"h-12 w-full rounded-[10px] border border-border bg-white px-4 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11";

const iconClass =
	"pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]";

function Section({
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
		<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
			<div className="flex items-center gap-3">
				<span
					className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
					style={{ backgroundColor: tile }}
				>
					<Icon className="size-5 text-white" aria-hidden />
				</span>
				<h2 className="text-lg font-semibold text-foreground">{title}</h2>
			</div>
			{children}
		</section>
	);
}

function Field({
	label,
	required,
	children,
}: {
	label: string;
	required?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-sm font-medium text-foreground">
				{label}
				{required ? <span className="ml-0.5 text-destructive">*</span> : null}
			</span>
			{children}
		</div>
	);
}

function Select({
	value,
	onChange,
	options,
	placeholder,
	required,
}: {
	value: string;
	onChange: (v: string) => void;
	options: { value: string; label: string }[];
	placeholder: string;
	required?: boolean;
}) {
	return (
		<div className="relative">
			<select
				value={value}
				required={required}
				onChange={(e) => onChange(e.target.value)}
				className={`${inputClass} appearance-none pr-10 ${
					value ? "text-foreground" : "text-[#9e9e9e]"
				}`}
			>
				<option value="" disabled>
					{placeholder}
				</option>
				{options.map((o) => (
					<option key={o.value} value={o.value} className="text-foreground">
						{o.label}
					</option>
				))}
			</select>
			<ChevronDown
				className="pointer-events-none absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]"
				aria-hidden
			/>
		</div>
	);
}
