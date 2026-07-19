"use client";

import {
	ArrowLeft,
	CalendarClock,
	Check,
	Clock,
	FlaskConical,
	Leaf,
	Lightbulb,
	Lock,
	Pencil,
	Pill,
	Plus,
	Stethoscope,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDate, formatVND } from "@/lib/format";
import {
	type Disease,
	fieldBadgeClass,
	fieldLabel,
	type Suggestion,
	suggestProducts,
	suggestReasonLabel,
	typeBadgeClass,
	typeLabel,
} from "@/lib/handbook";
import {
	getStockStatus,
	stockStatusBadgeClass,
	stockStatusLabel,
} from "@/lib/products";

/**
 * Chi tiết một mục Sổ tay (DESIGN.md §24 — trang riêng, không modal).
 * Card thông tin bệnh + kinh nghiệm xử lý, rồi khối "Thuốc gợi ý" từ suggestProducts.
 * Nút "Thêm vào đơn" chỉ giao diện (toast) — FE-only, chưa nối luồng bán hàng.
 * Nút Sửa dính đáy trên mobile (§7) → trang chỉnh sửa.
 */
export function DiseaseDetail({ disease }: { disease: Disease }) {
	const router = useRouter();
	const [toast, setToast] = useState<string | null>(null);

	const suggestions = suggestProducts(disease);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 2600);
		return () => clearTimeout(t);
	}, [toast]);

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-28 lg:mx-0 lg:pb-0">
			{/* Header */}
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/so-tay")}
					aria-label="Quay lại danh sách"
					className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div className="flex flex-1 items-start gap-3">
					<span
						className="flex size-12 shrink-0 items-center justify-center rounded-[12px]"
						style={{ backgroundColor: "#5cad45" }}
					>
						<Leaf className="size-6 text-white" aria-hidden />
					</span>
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							{disease.name}
						</h1>
						<div className="flex flex-wrap items-center gap-1.5">
							<span
								className={`rounded-full px-3 py-1 text-sm font-semibold ${fieldBadgeClass[disease.field]}`}
							>
								{fieldLabel[disease.field]}
							</span>
							<span
								className={`rounded-full px-3 py-1 text-sm font-semibold ${typeBadgeClass[disease.type]}`}
							>
								{typeLabel[disease.type]}
							</span>
							<span className="text-sm text-[#9e9e9e]">
								{disease.code} · {disease.subject}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Thông tin bệnh */}
			<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<InfoBlock
					icon={Stethoscope}
					label="Triệu chứng"
					text={disease.symptom}
				/>
				{disease.aliases.length > 0 ? (
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-sm text-[#9e9e9e]">Còn gọi:</span>
						{disease.aliases.map((a) => (
							<span
								key={a}
								className="rounded-full bg-[#f5f5f5] px-2.5 py-0.5 text-sm text-[#616161]"
							>
								{a}
							</span>
						))}
					</div>
				) : null}
			</section>

			{/* Kinh nghiệm xử lý */}
			{disease.dosage || disease.timing || disease.note ? (
				<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
						Kinh nghiệm xử lý
					</h2>
					{disease.dosage ? (
						<InfoBlock
							icon={FlaskConical}
							label="Liều dùng"
							text={disease.dosage}
						/>
					) : null}
					{disease.timing ? (
						<InfoBlock
							icon={Clock}
							label="Thời điểm dùng"
							text={disease.timing}
						/>
					) : null}
					{disease.note ? (
						<InfoBlock icon={Lightbulb} label="Lưu ý" text={disease.note} />
					) : null}
				</section>
			) : null}

			{/* Thuốc gợi ý */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex items-center gap-2">
					<Pill className="size-5 text-[#2e7d32]" aria-hidden />
					<h2 className="text-base font-semibold text-foreground">
						Thuốc gợi ý
					</h2>
					<span className="rounded-full bg-[#e8f5e9] px-2.5 py-0.5 text-sm font-semibold text-[#2e7d32]">
						{suggestions.length}
					</span>
				</div>

				{suggestions.length === 0 ? (
					<div className="flex flex-col items-center gap-2 py-6 text-center">
						<span className="flex size-12 items-center justify-center rounded-full bg-[#f5f5f5]">
							<Pill className="size-6 text-[#9e9e9e]" aria-hidden />
						</span>
						<p className="text-base text-[#616161]">
							Chưa có thuốc phù hợp trong kho.
						</p>
						<p className="text-sm text-[#9e9e9e]">
							Ghim thuốc theo kinh nghiệm hoặc bổ sung hoạt chất khuyến nghị.
						</p>
					</div>
				) : (
					<ul className="flex flex-col gap-2.5">
						{suggestions.map((s) => (
							<SuggestionItem
								key={s.product.id}
								suggestion={s}
								onAdd={() => setToast(`Đã thêm vào đơn · ${s.product.name}`)}
							/>
						))}
					</ul>
				)}
			</section>

			{/* Cập nhật cuối */}
			<p className="flex items-center gap-1.5 px-1 text-sm text-[#9e9e9e]">
				<CalendarClock className="size-4" aria-hidden />
				Cập nhật {formatDate(disease.updatedAt)} · {disease.updatedBy}
			</p>

			{/* Nút Sửa — dính đáy trên mobile, inline trên desktop */}
			<div className="fixed inset-x-0 bottom-nav-safe z-30 border-t border-border bg-card px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
				<button
					type="button"
					onClick={() => router.push(`/so-tay/${disease.id}/sua`)}
					className="flex h-14 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] lg:h-12 lg:w-auto lg:px-8"
				>
					<Pencil className="size-5.5" aria-hidden />
					Sửa sổ tay
				</button>
			</div>

			{/* Toast phản hồi tức thì (DESIGN.md §21) */}
			{toast ? (
				<div
					role="status"
					className="pointer-events-none fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4 lg:bottom-6"
				>
					<span className="flex items-center gap-2 rounded-full bg-[#2e7d32] px-5 py-3 text-base font-semibold text-white shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
						<Check className="size-5" aria-hidden />
						{toast}
					</span>
				</div>
			) : null}
		</div>
	);
}

function InfoBlock({
	icon: Icon,
	label,
	text,
}: {
	icon: typeof Stethoscope;
	label: string;
	text: string;
}) {
	return (
		<div className="flex items-start gap-3">
			<span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#efebe9]">
				<Icon className="size-5 text-[#5cad45]" aria-hidden />
			</span>
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="text-sm font-medium text-[#9e9e9e]">{label}</span>
				<span className="text-base text-foreground">{text}</span>
			</div>
		</div>
	);
}

/** Một dòng thuốc gợi ý — tồn kho + nút Thêm vào đơn (chỉ UI). */
function SuggestionItem({
	suggestion,
	onAdd,
}: {
	suggestion: Suggestion;
	onAdd: () => void;
}) {
	const { product, reason } = suggestion;
	const status = getStockStatus(product);
	const sellable = !product.locked && status !== "out-of-stock";

	return (
		<li className="flex items-center gap-3 rounded-[12px] border border-border bg-card p-3">
			<span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-[#eceff1]">
				<Pill className="size-5.5 text-[#5cad45]" aria-hidden />
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="truncate text-base font-semibold text-foreground">
					{product.name}
				</span>
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
					{product.agro?.activeIngredient ? (
						<span className="text-[#616161]">
							{product.agro.activeIngredient}
						</span>
					) : null}
					<span className="text-[#9e9e9e]">
						{formatVND(product.salePrice)}₫/{product.baseUnit}
					</span>
					<span className="rounded-full bg-[#eceff1] px-2 py-0.5 text-xs font-medium text-[#5cad45]">
						{suggestReasonLabel[reason]}
					</span>
				</div>
			</div>
			<div className="flex shrink-0 flex-col items-end gap-1.5">
				<span
					className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${stockStatusBadgeClass[status]}`}
				>
					{stockStatusLabel[status]}
				</span>
				{sellable ? (
					<button
						type="button"
						onClick={onAdd}
						className="flex h-9 items-center gap-1 whitespace-nowrap rounded-[10px] bg-primary px-3 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
					>
						<Plus className="size-4" aria-hidden />
						Thêm vào đơn
					</button>
				) : (
					<span className="flex h-9 items-center gap-1 whitespace-nowrap px-1 text-sm font-medium text-[#9e9e9e]">
						<Lock className="size-4" aria-hidden />
						{product.locked ? "Đã khóa" : "Hết hàng"}
					</span>
				)}
			</div>
		</li>
	);
}
