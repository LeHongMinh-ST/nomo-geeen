"use client";

import { BookOpen, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { filterSellableProducts } from "@/components/app/sales/product-picker";
import { ProtocolPicker } from "@/components/app/sales/protocol-picker";
import type { Product } from "@/lib/products";
import {
	type AreaUnitId,
	getQuickHandbookSuggestions,
	listHandbookEntries,
	type QuickHandbookResponse,
	type QuickHandbookSuggestion,
	type QuickProtocol,
	type QuickProtocolItem,
} from "@/lib/tenant-handbook-api";
import {
	getProductLookups,
	listTenantProducts,
	mapTenantProduct,
} from "@/lib/tenant-products-api";

type ConsultField = QuickHandbookResponse["consultFields"][number];

type FieldChoice = { label: string; value: string | number };

function fieldChoices(field: ConsultField): FieldChoice[] {
	if (
		!field.options ||
		typeof field.options !== "object" ||
		Array.isArray(field.options)
	)
		return [];
	const choices = (field.options as { choices?: unknown }).choices;
	if (!Array.isArray(choices)) return [];
	return choices.flatMap((choice) => {
		if (!choice || typeof choice !== "object") return [];
		const item = choice as { label?: unknown; value?: unknown };
		if (
			typeof item.label !== "string" ||
			(typeof item.value !== "string" && typeof item.value !== "number")
		)
			return [];
		return [{ label: item.label, value: item.value }];
	});
}

function fieldDefault(field: ConsultField): string {
	if (
		!field.options ||
		typeof field.options !== "object" ||
		Array.isArray(field.options)
	)
		return "";
	const value = (field.options as { default?: unknown }).default;
	return typeof value === "number"
		? String(value)
		: typeof value === "string"
			? value
			: "";
}

export function HandbookQuickPanel({
	onAddProduct,
	onAddSuggestion,
	onChangeMeta,
}: {
	onAddProduct: (product: Product) => void;
	onAddSuggestion: (
		suggestion: QuickHandbookSuggestion,
		quantity?: number,
	) => void;
	onChangeMeta: (meta: {
		diseaseId?: string;
		protocolId?: string;
		consultContext?: Record<string, unknown>;
		suggestedProductsMeta?: Array<Record<string, unknown>>;
		suggestedQtyMeta?: Record<string, unknown>;
	}) => void;
}) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<
		Array<{ id: string; name: string; symptom: string | null }>
	>([]);
	const [selected, setSelected] = useState<QuickHandbookResponse | null>(null);
	const [answers, setAnswers] = useState<Record<string, unknown>>({});
	const [area, setArea] = useState<{ value: string; unit: AreaUnitId }>({
		value: "",
		unit: "CONG_NAM",
	});
	const [loading, setLoading] = useState(false);
	const [products, setProducts] = useState<Product[]>([]);
	const [productsLoading, setProductsLoading] = useState(true);

	useEffect(() => {
		Promise.all([listTenantProducts(), getProductLookups()])
			.then(([rows, lookups]) =>
				setProducts(rows.map((row) => mapTenantProduct(row, lookups))),
			)
			.finally(() => setProductsLoading(false));
	}, []);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			if (!query.trim()) {
				setResults([]);
				return;
			}
			void listHandbookEntries({ search: query, page: 1, pageSize: 8 })
				.then((response) =>
					setResults(
						response.items.map((item) => ({
							id: item.id,
							name: item.name,
							symptom: item.symptom,
						})),
					),
				)
				.catch(() => setResults([]));
		}, 180);
		return () => window.clearTimeout(timer);
	}, [query]);

	// Re-price the protocols whenever the entered area changes.
	const diseaseId = selected?.disease.id;
	useEffect(() => {
		if (!diseaseId) return;
		const parsed = Number(area.value);
		if (!Number.isFinite(parsed) || parsed <= 0) return;
		const timer = window.setTimeout(() => {
			void getQuickHandbookSuggestions(diseaseId, {
				value: parsed,
				unit: area.unit,
			})
				.then(setSelected)
				.catch(() => undefined);
		}, 250);
		return () => window.clearTimeout(timer);
	}, [diseaseId, area.value, area.unit]);

	async function choose(id: string) {
		setLoading(true);
		try {
			const response = await getQuickHandbookSuggestions(id);
			setSelected(response);
			const defaults = Object.fromEntries(
				response.consultFields.map((field) => [
					field.fieldKey,
					fieldDefault(field),
				]),
			);
			setAnswers(defaults);
			onChangeMeta({
				diseaseId: response.disease.id,
				consultContext: defaults,
				suggestedProductsMeta: [],
			});
		} finally {
			setLoading(false);
		}
	}

	function updateAnswer(key: string, value: string) {
		const next = { ...answers, [key]: value };
		setAnswers(next);
		onChangeMeta({
			diseaseId: selected?.disease.id,
			consultContext: next,
		});
	}

	/** Only runs after the seller ticks lines and presses confirm. */
	function confirmProtocol(
		protocol: QuickProtocol,
		items: QuickProtocolItem[],
	) {
		if (!selected) return;
		for (const item of items) {
			if (!item.productId || !item.unitId) continue;
			onAddSuggestion(
				{
					productId: item.productId,
					name: item.productName ?? "",
					unitId: item.unitId,
					unit: item.unit ?? "",
					unitPrice: item.unitPrice ?? 0,
					availableQty: item.availableQty,
					available: item.inStock,
					reason: "PROTOCOL",
					warnings: [],
				},
				item.packs ?? 1,
			);
		}
		onChangeMeta({
			diseaseId: selected.disease.id,
			protocolId: protocol.id,
			consultContext: answers,
			suggestedProductsMeta: items.map((item) => ({
				productId: item.productId,
				activeIngredient: item.activeIngredient,
				reason: "PROTOCOL",
				available: item.inStock,
				needAmount: item.needAmount,
				needUnit: item.needUnit,
				packs: item.packs,
			})),
			suggestedQtyMeta: selected.area
				? {
						areaValue: selected.area.value,
						areaUnit: selected.area.unit,
						areaSquareMeters: selected.area.squareMeters,
						protocolStatus: protocol.status,
						source: "HANDBOOK_PROTOCOL",
					}
				: { protocolStatus: protocol.status, source: "HANDBOOK_PROTOCOL" },
		});
	}

	function clear() {
		setSelected(null);
		setQuery("");
		setAnswers({});
		setArea({ value: "", unit: "CONG_NAM" });
		onChangeMeta({});
	}

	const productResults = filterSellableProducts(products, query);

	return (
		<section className="flex flex-col gap-3 rounded-[16px] border border-[#c8e6c9] bg-[#f7fff7] p-4">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<BookOpen className="size-5 text-[#2e7d32]" aria-hidden />
					<h2 className="font-semibold text-foreground">Sổ tay quầy</h2>
				</div>
				{selected ? (
					<button
						type="button"
						onClick={clear}
						aria-label="Bỏ bệnh đã chọn"
						className="rounded-full p-1 text-[#616161] hover:bg-white"
					>
						<X className="size-4" aria-hidden />
					</button>
				) : null}
			</div>
			{!selected ? (
				<div className="relative">
					<Search
						className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9e9e9e]"
						aria-hidden
					/>
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Tìm bệnh, cây, triệu chứng..."
						className="h-11 w-full rounded-[10px] border border-border bg-white pl-9 pr-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
					{query.trim() && (productResults.length > 0 || results.length > 0) ? (
						<div className="absolute inset-x-0 top-[calc(100%+4px)] z-50 rounded-[10px] border border-border bg-white p-1 shadow-lg">
							{productsLoading ? (
								<p className="px-3 py-2 text-sm text-[#616161]">
									Đang tải sản phẩm...
								</p>
							) : null}
							{productResults.length > 0 ? (
								<div className="border-b border-border pb-1">
									<p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#2e7d32]">
										Sản phẩm
									</p>
									{productResults.map((product) => (
										<button
											key={product.id}
											type="button"
											onClick={() => {
												onAddProduct(product);
												setQuery("");
											}}
											className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-accent"
										>
											<span className="font-semibold">{product.name}</span>
											<span className="text-sm text-[#616161]">
												{product.sku} · Còn {product.stock} {product.baseUnit}
											</span>
										</button>
									))}
								</div>
							) : null}
							{results.length > 0 ? (
								<div className="pt-1">
									<p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#2e7d32]">
										Sổ tay
									</p>
									{results.map((item) => (
										<button
											key={item.id}
											type="button"
											onClick={() => void choose(item.id)}
											className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-accent"
										>
											<span className="font-semibold">{item.name}</span>
											<span className="text-sm text-[#616161]">
												{item.symptom || "Tra cứu theo mục Sổ tay"}
											</span>
										</button>
									))}
								</div>
							) : null}
						</div>
					) : null}
				</div>
			) : (
				<div className="flex flex-col gap-3">
					<div>
						<p className="font-semibold">{selected.disease.name}</p>
						<p className="text-sm text-[#616161]">
							{selected.disease.symptom || "Gợi ý tham khảo tại quầy"}
						</p>
					</div>
					{selected.consultFields.length > 0 ? (
						<div className="rounded-xl border border-[#b7ddb3] bg-white p-3">
							<p className="mb-2 text-base font-semibold text-[#2e7d32]">
								Tư vấn nhanh: nhập diện tích để tính số lượng
							</p>
							<div className="grid gap-2 sm:grid-cols-2">
								{selected.consultFields.map((field) => (
									<label
										htmlFor={`consult-${field.fieldKey}`}
										key={field.fieldKey}
										className="text-sm font-medium"
									>
										{field.label}
										{field.unit ? ` (${field.unit})` : ""}
										{fieldChoices(field).length > 0 ? (
											<select
												id={`consult-${field.fieldKey}`}
												required={field.required}
												value={String(answers[field.fieldKey] ?? "")}
												onChange={(event) =>
													updateAnswer(field.fieldKey, event.target.value)
												}
												className="mt-1 h-11 w-full rounded-lg border border-border bg-white px-3 text-base"
											>
												<option value="">Chọn quy mô</option>
												{fieldChoices(field).map((choice) => (
													<option
														key={`${field.fieldKey}-${choice.value}`}
														value={choice.value}
													>
														{choice.label}
													</option>
												))}
											</select>
										) : (
											<input
												id={`consult-${field.fieldKey}`}
												required={field.required}
												inputMode={
													field.fieldType === "NUMBER" ? "decimal" : undefined
												}
												value={String(answers[field.fieldKey] ?? "")}
												onChange={(event) =>
													updateAnswer(field.fieldKey, event.target.value)
												}
												className="mt-1 h-10 w-full rounded-lg border border-border bg-white px-3 text-base"
											/>
										)}
									</label>
								))}
							</div>
						</div>
					) : (
						<p className="text-sm text-[#616161]">
							Có thể bỏ qua tư vấn và chọn gợi ý bên dưới.
						</p>
					)}
					<ProtocolPicker
						protocols={selected.protocols ?? []}
						area={area}
						onAreaChange={setArea}
						onConfirm={confirmProtocol}
					/>
					<p className="text-xs text-[#616161]">
						Hoặc chọn thêm thuốc tham khảo bên dưới — người bán xác nhận trước
						khi thêm vào giỏ.
					</p>
					{loading ? (
						<p className="text-sm text-[#616161]">Đang tải gợi ý...</p>
					) : selected.suggestions.length === 0 ? (
						<p className="text-sm text-[#616161]">Chưa có sản phẩm phù hợp.</p>
					) : (
						<div className="flex flex-col gap-2">
							{selected.suggestions.slice(0, 8).map((suggestion) => (
								<div
									key={suggestion.productId}
									className="flex items-center gap-2 rounded-lg border border-border bg-white p-2"
								>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-semibold">
											{suggestion.name}
										</p>
										<p className="text-xs text-[#616161]">
											{suggestion.available
												? `Còn ${suggestion.availableQty} ${suggestion.unit}`
												: "Hết hàng / không bán được"}
										</p>
									</div>
									<button
										type="button"
										disabled={!suggestion.available}
										onClick={() => {
											onAddSuggestion(suggestion, 1);
											onChangeMeta({
												diseaseId: selected.disease.id,
												consultContext: answers,
												suggestedProductsMeta: [
													{
														productId: suggestion.productId,
														reason: suggestion.reason,
														available: suggestion.available,
														warnings: suggestion.warnings,
													},
												],
											});
										}}
										className="flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-lg bg-primary px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#bdbdbd]"
										aria-label={`Thêm ${suggestion.name}`}
									>
										<Plus className="size-4" aria-hidden />
										<span>Thêm</span>
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</section>
	);
}
