"use client";

import { ChevronDown, FlaskConical, Leaf, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProtocolEditor } from "@/components/app/handbook/protocol-editor";
import {
	categoryLabel,
	type Disease,
	type DiseaseType,
	type HandbookCategoryId,
	SELECTABLE_HANDBOOK_CATEGORY_IDS,
	typeLabel,
} from "@/lib/handbook";
import {
	createHandbookEntry,
	type Protocol,
	type ProtocolInput,
	replaceHandbookProtocols,
	toApiDiseaseType,
	updateHandbookEntry,
} from "@/lib/tenant-handbook-api";
import { listTenantProducts } from "@/lib/tenant-products-api";

/**
 * Form Thêm/Sửa mục Sổ tay (base_spec §21.2, DESIGN.md §8, §24 — trang riêng).
 * Mobile-first: chia section, nút Lưu dính đáy full-width (§7).
 * Submit POST/PATCH /tenant/handbook; lỗi hiển thị trên form.
 */

type FormMode = "create" | "edit";

const categoryOptions: HandbookCategoryId[] = [
	...SELECTABLE_HANDBOOK_CATEGORY_IDS,
];

const typeOptions: DiseaseType[] = ["disease", "pest", "weed", "epidemic"];

type FormState = {
	name: string;
	subject: string;
	category: HandbookCategoryId;
	type: DiseaseType;
	symptom: string;
	aliases: string[];
	recommendedIngredients: string[];
	note: string;
};

function toFormState(d?: Disease): FormState {
	return {
		name: d?.name ?? "",
		subject: d?.subject ?? "",
		category: d?.category ?? "CROP_PROTECTION_AND_FERTILIZER",
		type: d?.type ?? "disease",
		symptom: d?.symptom ?? "",
		aliases: d?.aliases ?? [],
		recommendedIngredients: d?.recommendedIngredients ?? [],
		note: d?.note ?? "",
	};
}

/** Server rejects a drug line with neither product nor ingredient; drop blanks first. */
function toProtocolPayload(protocols: ProtocolInput[]): ProtocolInput[] {
	return protocols
		.map((protocol) => ({
			...protocol,
			name: protocol.name.trim(),
			note: protocol.note?.trim() || undefined,
			items: protocol.items
				.filter(
					(item) => item.productId || (item.activeIngredient ?? "").trim(),
				)
				.map((item) => ({
					...item,
					activeIngredient: item.activeIngredient?.trim() || undefined,
					doseUnit: item.doseUnit.trim(),
					mixing: item.mixing?.trim() || undefined,
					usage: item.usage?.trim() || undefined,
				})),
		}))
		.filter((protocol) => protocol.name && protocol.items.length > 0);
}

export function DiseaseForm({
	mode,
	disease,
	initialProtocols = [],
}: {
	mode: FormMode;
	disease?: Disease;
	initialProtocols?: Protocol[];
}) {
	const router = useRouter();
	const [form, setForm] = useState<FormState>(() => toFormState(disease));
	const [protocols, setProtocols] = useState<ProtocolInput[]>(() =>
		initialProtocols.map((protocol) => ({
			name: protocol.name,
			note: protocol.note ?? "",
			isDefault: protocol.isDefault,
			isActive: protocol.isActive,
			items: protocol.items.map((item) => ({
				productId: item.productId ?? undefined,
				activeIngredient: item.activeIngredient ?? "",
				doseAmount: item.doseAmount,
				doseUnit: item.doseUnit,
				perAreaAmount: item.perAreaAmount,
				perAreaUnit: item.perAreaUnit,
				mixing: item.mixing ?? "",
				usage: item.usage ?? "",
			})),
		})),
	);
	const [products, setProducts] = useState<Array<{ id: string; name: string }>>(
		[],
	);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		listTenantProducts()
			.then((rows) =>
				setProducts(rows.map((row) => ({ id: row.id, name: row.name }))),
			)
			.catch(() => setProducts([]));
	}, []);

	function set<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setSaving(true);
		setError(null);
		const category = form.category;
		if (category === "UNCATEGORIZED") {
			setError("Chọn một danh mục hợp lệ.");
			setSaving(false);
			return;
		}
		const payload = {
			name: form.name.trim(),
			category,
			subject: form.subject.trim() || undefined,
			type: toApiDiseaseType(form.type),
			symptom: form.symptom.trim() || undefined,
			note: form.note.trim() || undefined,
			aliases: form.aliases,
			recommendedIngredients: form.recommendedIngredients,
		};
		try {
			const entryId =
				mode === "edit" && disease
					? (await updateHandbookEntry(disease.id, payload)).id
					: (await createHandbookEntry(payload)).id;
			// Protocols live on their own replace-all endpoint, so save them after the entry.
			await replaceHandbookProtocols(entryId, toProtocolPayload(protocols));
			router.push(`/so-tay/${entryId}`);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Không lưu được sổ tay. Kiểm tra quyền handbook:create/edit.",
			);
			setSaving(false);
		}
	}

	const submitLabel = mode === "create" ? "Thêm sổ tay" : "Lưu thay đổi";

	return (
		<form
			onSubmit={handleSubmit}
			className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-[calc(148px+env(safe-area-inset-bottom,0px))] lg:mx-0 lg:pb-6"
		>
			{error ? (
				<p className="rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] px-3 py-2 text-sm text-[#c62828]">
					{error}
				</p>
			) : null}
			{/* Section 1: Thông tin bệnh */}
			<Section icon={Leaf} tile="#5cad45" title="Thông tin bệnh / vấn đề">
				<Field label="Tên bệnh / vấn đề" required>
					<input
						type="text"
						required
						value={form.name}
						onChange={(e) => set("name", e.target.value)}
						placeholder="VD: Đạo ôn, Rầy nâu, Dịch tả lợn..."
						className={inputClass}
					/>
				</Field>

				<Field label="Danh mục" required>
					<div className="grid grid-cols-1 gap-1 rounded-[12px] bg-[#f0f2f1] p-1 sm:grid-cols-2">
						{categoryOptions.map((c) => (
							<button
								key={c}
								type="button"
								onClick={() => set("category", c)}
								className={`min-h-12 rounded-[9px] px-2 py-2 text-left text-sm font-semibold transition-colors duration-200 ease-out ${
									form.category === c
										? "bg-card text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
										: "text-[#616161] hover:text-foreground"
								}`}
							>
								{categoryLabel[c]}
							</button>
						))}
					</div>
				</Field>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label="Đối tượng" required>
						<input
							type="text"
							required
							value={form.subject}
							onChange={(e) => set("subject", e.target.value)}
							placeholder="VD: Lúa, Lợn, Tôm..."
							className={inputClass}
						/>
					</Field>
					<Field label="Loại" required>
						<div className="relative">
							<select
								value={form.type}
								onChange={(e) => set("type", e.target.value as DiseaseType)}
								className={`${inputClass} appearance-none pr-10`}
							>
								{typeOptions.map((t) => (
									<option key={t} value={t}>
										{typeLabel[t]}
									</option>
								))}
							</select>
							<ChevronDown
								className="pointer-events-none absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]"
								aria-hidden
							/>
						</div>
					</Field>
				</div>

				<Field label="Triệu chứng" required>
					<textarea
						required
						value={form.symptom}
						onChange={(e) => set("symptom", e.target.value)}
						placeholder="Mô tả ngắn gọn, dễ hiểu để nhận biết tại quầy."
						rows={3}
						className={textareaClass}
					/>
				</Field>

				<TagInput
					label="Tên gọi khác / từ khóa tìm"
					placeholder="Gõ rồi Enter để thêm (VD: cháy lá)"
					values={form.aliases}
					onChange={(v) => set("aliases", v)}
				/>
			</Section>

			{/* Section 2: Gợi ý & kinh nghiệm */}
			<Section
				icon={FlaskConical}
				tile="#5cad45"
				title="Gợi ý thuốc & kinh nghiệm"
			>
				<TagInput
					label="Hoạt chất khuyến nghị"
					placeholder="Gõ rồi Enter để thêm (VD: Fipronil)"
					values={form.recommendedIngredients}
					onChange={(v) => set("recommendedIngredients", v)}
					hint="Sản phẩm có hoạt chất trùng sẽ tự động vào danh sách gợi ý."
				/>

				<Field label="Lưu ý">
					<textarea
						value={form.note}
						onChange={(e) => set("note", e.target.value)}
						placeholder="Ghi chú kinh nghiệm, cảnh báo an toàn..."
						rows={2}
						className={textareaClass}
					/>
				</Field>
			</Section>

			{/* Section 3: Bộ thuốc khuyến nghị */}
			<Section icon={FlaskConical} tile="#5cad45" title="Bộ thuốc khuyến nghị">
				<p className="text-sm text-[#616161]">
					Mỗi bộ thuốc gồm nhiều thuốc với liều theo diện tích. Thêm bộ thuốc
					thay thế để dùng khi thuốc chính hết hàng.
				</p>
				<ProtocolEditor
					protocols={protocols}
					onChange={setProtocols}
					products={products}
				/>
			</Section>

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
					{saving ? "Đang lưu..." : submitLabel}
				</button>
			</div>

			{/* Hành động — mobile dính đáy full-width */}
			<div className="fixed inset-x-0 bottom-nav-safe z-40 border-t border-border bg-card p-3 lg:hidden">
				<button
					type="submit"
					disabled={saving}
					className="flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-base font-semibold text-white transition-colors duration-200 ease-out active:bg-[#3f8530] disabled:opacity-60"
				>
					{saving ? "Đang lưu..." : submitLabel}
				</button>
			</div>
		</form>
	);
}

/* ---------- Thành phần con dùng lại trong form ---------- */

const inputClass =
	"h-12 w-full rounded-[10px] border border-border bg-white px-4 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11";

const textareaClass =
	"w-full rounded-[10px] border border-border bg-white px-4 py-3 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none";

function Section({
	icon: Icon,
	tile,
	title,
	children,
}: {
	icon: typeof Leaf;
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

/** Nhập nhiều giá trị dạng chip (alias, hoạt chất) — Enter để thêm. */
function TagInput({
	label,
	placeholder,
	values,
	onChange,
	hint,
}: {
	label: string;
	placeholder: string;
	values: string[];
	onChange: (v: string[]) => void;
	hint?: string;
}) {
	const [draft, setDraft] = useState("");

	function add() {
		const v = draft.trim();
		if (!v || values.includes(v)) {
			setDraft("");
			return;
		}
		onChange([...values, v]);
		setDraft("");
	}

	function remove(target: string) {
		onChange(values.filter((v) => v !== target));
	}

	return (
		<div className="flex flex-col gap-2">
			<span className="text-sm font-medium text-foreground">{label}</span>
			<input
				type="text"
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === ",") {
						e.preventDefault();
						add();
					}
				}}
				onBlur={add}
				placeholder={placeholder}
				className={inputClass}
			/>
			{hint ? <p className="text-sm text-[#9e9e9e]">{hint}</p> : null}
			{values.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{values.map((v) => (
						<span
							key={v}
							className="flex items-center gap-1.5 rounded-full bg-accent py-1.5 pl-3 pr-2 text-sm font-medium text-accent-foreground"
						>
							{v}
							<button
								type="button"
								aria-label={`Xóa ${v}`}
								onClick={() => remove(v)}
								className="flex size-5 items-center justify-center rounded-full text-accent-foreground/70 hover:bg-white/60 hover:text-accent-foreground"
							>
								<X className="size-3.5" aria-hidden />
							</button>
						</span>
					))}
				</div>
			) : null}
		</div>
	);
}
