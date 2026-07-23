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
import { useEffect, useState } from "react";
import {
	BUSINESS_GROUP_CATALOG,
	getProductKindDefinition,
	getProductKindsForGroup,
	getRequiredAttrKeys,
	normalizeProductAttrs,
	resolveEnabledBusinessGroups,
	resolveLegacyProductKind,
	type BusinessGroupId,
	type ProductKindId,
} from "@/lib/product-kind-form";
import type {
	PriceTier,
	Product,
	UnitConversion,
} from "@/lib/products";
import {
	createTenantProduct,
	getProductLookups,
	getTenantBusinessGroups,
	updateTenantProduct,
	type ProductInput,
	type ProductLookups,
} from "@/lib/tenant-products-api";

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
	businessGroup: BusinessGroupId | "";
	productKind: ProductKindId | "";
	attrs: Record<string, string>;
};

type ProductFormError = { message: string; field?: string };

function mapProductFormError(cause: unknown): ProductFormError {
	const reason = typeof cause === "object" && cause && "reason" in cause
		? String((cause as { reason?: unknown }).reason ?? "")
		: "";
	const serverMessage = typeof cause === "object" && cause && "serverMessage" in cause
		? String((cause as { serverMessage?: unknown }).serverMessage ?? "")
		: "";
	const detail = `${reason} ${serverMessage}`;
	if (detail.includes("businessGroup is not enabled")) {
		return { message: "Nhóm ngành hàng này chưa được bật cho cửa hàng.", field: "businessGroup" };
	}
	if (detail.includes("productKind is incompatible")) {
		return { message: "Loại sản phẩm không thuộc nhóm ngành đã chọn.", field: "productKind" };
	}
	const attrMatch = detail.match(/attrs\.([A-Za-z0-9_]+)/);
	if (attrMatch) {
		return { message: "Thông tin chuyên ngành này chưa hợp lệ.", field: attrMatch[1] };
	}
	if (cause instanceof Error && cause.message) return { message: cause.message };
	return { message: "Không thể lưu sản phẩm. Vui lòng kiểm tra dữ liệu và thử lại." };
}

function toFormState(p?: Product): FormState {
	const productKind = resolveLegacyProductKind(
		p?.productKind,
		p?.agro?.activeIngredient
			? "PESTICIDE"
			: p?.domain === "CROP"
				? "CROP_SEED"
				: null,
	);
	const definition = getProductKindDefinition(productKind);
	const attrs = Object.fromEntries(
		(definition?.fields ?? []).map((field) => [
			field.key,
			String(
				p?.attrs?.[field.key] ??
					(field.key === "activeIngredient" ? p?.agro?.activeIngredient : undefined) ??
					(field.key === "concentration" ? p?.agro?.concentration : undefined) ??
					(field.key === "phiDays" ? p?.agro?.phi : undefined) ??
					(field.key === "reiDays" ? p?.agro?.rei : undefined) ??
					"",
			),
		]),
	);
	return {
		name: p?.name ?? "",
		sku: p?.sku ?? "",
		barcode: p?.barcode ?? "",
		categoryId: p?.categoryId ?? "",
		brandId: p?.brandId ?? "",
		manufacturerId: p?.manufacturerId ?? "",
		baseUnit: p?.baseUnitId ?? "",
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
		businessGroup: p?.businessGroup ?? definition?.businessGroup ?? "",
		productKind: productKind ?? "",
		attrs,
	};
}

export function ProductForm({
	mode,
	product,
	lookups: providedLookups,
}: {
	mode: FormMode;
	product?: Product;
	lookups?: ProductLookups;
}) {
	const router = useRouter();
	const [form, setForm] = useState<FormState>(() => toFormState(product));
	const [saving, setSaving] = useState(false);
	const [lookups, setLookups] = useState<ProductLookups | null>(
		providedLookups ?? null,
	);
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [enabledGroups, setEnabledGroups] = useState<
		(typeof BUSINESS_GROUP_CATALOG)[number][]
	>([...BUSINESS_GROUP_CATALOG]);
	const selectedUnitName =
		lookups?.units.find((unit) => unit.id === form.baseUnit)?.name ?? "";

	useEffect(() => {
		if (providedLookups) return;
		void getProductLookups()
			.then(setLookups)
			.catch(() => {
				setError("Không thể tải danh mục sản phẩm. Vui lòng thử lại.");
			});
	}, [providedLookups]);

	useEffect(() => {
		void getTenantBusinessGroups()
			.then((result) =>
				setEnabledGroups(
					resolveEnabledBusinessGroups(result.configured, result.groups),
				),
			)
			.catch(() =>
				setError("Không thể tải nhóm ngành sản phẩm. Vui lòng thử lại."),
			);
	}, []);

	const selectedKind = getProductKindDefinition(form.productKind);
	const availableKinds = form.businessGroup
		? getProductKindsForGroup(form.businessGroup)
		: [];

	function setBusinessGroup(value: BusinessGroupId | "") {
		if (
			value !== form.businessGroup &&
			Object.values(form.attrs).some((attr) => attr.trim()) &&
			!window.confirm("Đổi nhóm ngành sẽ xóa thông tin chuyên ngành đã nhập. Tiếp tục?")
		) {
			return;
		}
		setFieldErrors((current) => ({ ...current, businessGroup: "", productKind: "" }));
		setForm((current) => ({
			...current,
			businessGroup: value,
			productKind:
				value &&
				current.productKind &&
				getProductKindDefinition(current.productKind)?.businessGroup === value
					? current.productKind
					: "",
			attrs: {},
		}));
	}

	function setProductKind(value: ProductKindId | "") {
		if (
			value !== form.productKind &&
			Object.values(form.attrs).some((attr) => attr.trim()) &&
			!window.confirm("Đổi loại sản phẩm có thể xóa một số thông tin chuyên ngành. Tiếp tục?")
		) {
			return;
		}
		setFieldErrors((current) => ({ ...current, productKind: "" }));
		const definition = getProductKindDefinition(value);
		setForm((current) => ({
			...current,
			productKind: value,
			attrs: Object.fromEntries(
				(definition?.fields ?? []).map((field) => [
					field.key,
					current.attrs[field.key] ?? "",
				]),
			),
		}));
	}

	function setAttr(key: string, value: string) {
		setFieldErrors((current) => ({ ...current, [key]: "" }));
		setForm((current) => ({
			...current,
			attrs: { ...current.attrs, [key]: value },
		}));
	}

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

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const requiredAttrs = getRequiredAttrKeys(form.productKind);
		const nextFieldErrors: Record<string, string> = {};
		if (!form.businessGroup) nextFieldErrors.businessGroup = "Hãy chọn nhóm ngành hàng.";
		if (!form.productKind) nextFieldErrors.productKind = "Hãy chọn loại sản phẩm.";
		for (const key of requiredAttrs) {
			if (!form.attrs[key]?.trim()) nextFieldErrors[key] = "Trường này bắt buộc.";
		}
		if (
			!form.businessGroup ||
			!form.productKind ||
			requiredAttrs.some((key) => !form.attrs[key]?.trim())
		) {
			setFieldErrors(nextFieldErrors);
			setError(
				"Vui lòng chọn nhóm, loại sản phẩm và điền đủ thông tin chuyên ngành bắt buộc.",
			);
			return;
		}
		setSaving(true);
		setError(null);
		const input: ProductInput = {
			sku: form.sku,
			name: form.name,
			barcode: form.barcode || undefined,
			baseUnitId: form.baseUnit,
			categoryId: form.categoryId || undefined,
			brandId: form.brandId || undefined,
			manufacturerId: form.manufacturerId || undefined,
			costPrice: Number(form.costPrice || 0),
			salePrice: Number(form.salePrice || 0),
			wholesalePrice: form.wholesalePrice
				? Number(form.wholesalePrice)
				: undefined,
			isLocked: form.locked,
			businessGroup: form.businessGroup,
			productKind: form.productKind,
			attrs: normalizeProductAttrs(form.productKind, form.attrs),
		};
		try {
			if (mode === "edit" && product) {
				await updateTenantProduct(product.id, input);
			} else {
				await createTenantProduct(input);
			}
			router.push("/san-pham");
		} catch (cause) {
			const mapped = mapProductFormError(cause);
			setError(mapped.message);
			if (mapped.field) setFieldErrors({ [mapped.field]: mapped.message });
			setSaving(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-24 lg:mx-0 lg:pb-6"
		>
			<Section icon={FlaskConical} tile="#5cad45" title="Phân loại sản phẩm">
				<Field label="Nhóm ngành hàng" required>
					<Select
						value={form.businessGroup}
						onChange={(value) => setBusinessGroup(value as BusinessGroupId)}
						placeholder="Chọn nhóm ngành hàng"
						ariaLabel="Nhóm ngành hàng"
						ariaInvalid={Boolean(fieldErrors.businessGroup)}
						ariaDescribedBy="business-group-error"
						options={enabledGroups.map((group) => ({ value: group.id, label: group.label }))}
						required
					/>
					<InlineFieldError id="business-group-error" message={fieldErrors.businessGroup} />
				</Field>
				<Field label="Loại sản phẩm" required>
					<Select
						value={form.productKind}
						onChange={(value) => setProductKind(value as ProductKindId)}
						placeholder={form.businessGroup ? "Chọn loại sản phẩm" : "Chọn nhóm trước"}
						ariaLabel="Loại sản phẩm"
						ariaInvalid={Boolean(fieldErrors.productKind)}
						ariaDescribedBy="product-kind-error"
						options={availableKinds.map((kind) => ({ value: kind.id, label: kind.label }))}
						required
					/>
					<InlineFieldError id="product-kind-error" message={fieldErrors.productKind} />
				</Field>
				{selectedKind ? (
					<div className="rounded-[10px] bg-[#f4f8f1] px-3 py-2 text-base text-[#416b35]">
						Thông tin bắt buộc cho: <strong>{selectedKind.label}</strong>
					</div>
				) : null}
			</Section>

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
							options={(lookups?.categories ?? []).map((c) => ({
								value: c.id,
								label: c.name,
							}))}
							required
						/>
					</Field>
					<Field label="Thương hiệu">
						<Select
							value={form.brandId}
							onChange={(v) => set("brandId", v)}
							placeholder="Chọn thương hiệu"
							options={(lookups?.brands ?? []).map((b) => ({
								value: b.id,
								label: b.name,
							}))}
						/>
					</Field>
				</div>

				<Field label="Nhà sản xuất">
					<Select
						value={form.manufacturerId}
						onChange={(v) => set("manufacturerId", v)}
						placeholder="Chọn nhà sản xuất"
						options={(lookups?.manufacturers ?? []).map((m) => ({
							value: m.id,
							label: m.name,
						}))}
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
						options={(lookups?.units ?? []).map((u) => ({
							value: u.id,
							label: u.name,
						}))}
						required
					/>
				</Field>

				<div className="flex flex-col gap-2">
					<span className="text-sm font-medium text-foreground">
						Đơn vị quy đổi
					</span>
					<p className="text-sm text-[#616161]">
						Nhập theo đơn vị lớn, tự quy đổi ra{" "}
						{selectedUnitName || "đơn vị gốc"}. VD: 1 Bao = 50 Kg.
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
								{selectedUnitName || "gốc"}
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
					<Field label={`Tồn kho hiện tại (${selectedUnitName || "gốc"})`}>
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
						Mua càng nhiều giá càng tốt. VD: từ 50{" "}
						{selectedUnitName || "đơn vị"} → giá sỉ.
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
								{selectedUnitName || "đv"} →
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

			{/* Section 4: Trường chuyên ngành theo ProductKind */}
			{selectedKind ? (
				<Section icon={FlaskConical} tile="#5cad45" title="Thông tin chuyên ngành">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{selectedKind.fields.map((field) => (
							<Field
								key={field.key}
								label={field.label}
								required={!field.optional}
							>
								<input
									type={field.input}
									inputMode={field.input === "number" ? "numeric" : undefined}
									min={field.input === "number" ? 0 : undefined}
									required={!field.optional}
									value={form.attrs[field.key] ?? ""}
									aria-label={field.label}
									aria-invalid={Boolean(fieldErrors[field.key])}
									aria-describedby={`${field.key}-error`}
									onChange={(e) => setAttr(field.key, e.target.value)}
									className={`${inputClass} ${field.input === "number" ? "text-right" : ""}`}
								/>
								<InlineFieldError id={`${field.key}-error`} message={fieldErrors[field.key]} />
							</Field>
						))}
					</div>
				</Section>
			) : null}
			{error ? (
				<p
					className="rounded-[10px] bg-[#fff5f5] px-3 py-2 text-sm text-destructive"
					role="alert"
				>
					{error}
				</p>
			) : null}

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
			<span className="text-base font-medium text-foreground">
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
	ariaLabel,
	ariaInvalid,
	ariaDescribedBy,
}: {
	value: string;
	onChange: (v: string) => void;
	options: { value: string; label: string }[];
	placeholder: string;
	required?: boolean;
	ariaLabel?: string;
	ariaInvalid?: boolean;
	ariaDescribedBy?: string;
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
				aria-label={ariaLabel}
				aria-invalid={ariaInvalid || undefined}
				aria-describedby={ariaDescribedBy}
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

function InlineFieldError({ id, message }: { id: string; message?: string }) {
	return message ? (
		<p id={id} className="text-sm text-destructive" role="alert">
			{message}
		</p>
	) : null;
}
