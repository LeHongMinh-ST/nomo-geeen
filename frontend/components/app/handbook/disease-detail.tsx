"use client";

import {
	ArrowLeft,
	CalendarClock,
	FlaskConical,
	Leaf,
	Lightbulb,
	Pencil,
	Stethoscope,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import {
	categoryBadgeClass,
	categoryLabel,
	type Disease,
	typeBadgeClass,
	typeLabel,
} from "@/lib/handbook";
import {
	AREA_UNIT_OPTIONS,
	type AreaUnitId,
	type Protocol,
} from "@/lib/tenant-handbook-api";

function areaUnitLabel(unit: AreaUnitId): string {
	return AREA_UNIT_OPTIONS.find((option) => option.id === unit)?.label ?? unit;
}

export function DiseaseDetail({
	disease,
	protocols = [],
}: {
	disease: Disease;
	protocols?: Protocol[];
}) {
	const router = useRouter();

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-28 lg:mx-0 lg:pb-0">
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/so-tay")}
					aria-label="Quay lại danh sách"
					className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div className="flex min-w-0 flex-1 items-start gap-3">
					<span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#5cad45]">
						<Leaf className="size-6 text-white" aria-hidden />
					</span>
					<div className="min-w-0">
						<h1 className="text-2xl font-bold tracking-tight">
							{disease.name}
						</h1>
						<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
							<span
								className={`rounded-full px-3 py-1 text-sm font-semibold ${categoryBadgeClass[disease.category]}`}
							>
								{categoryLabel[disease.category]}
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

			<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<InfoBlock
					icon={Stethoscope}
					label="Triệu chứng"
					text={disease.symptom}
				/>
				{disease.aliases.length > 0 ? (
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-sm text-[#9e9e9e]">Còn gọi:</span>
						{disease.aliases.map((alias) => (
							<span
								key={alias}
								className="rounded-full bg-[#f5f5f5] px-2.5 py-0.5 text-sm text-[#616161]"
							>
								{alias}
							</span>
						))}
					</div>
				) : null}
			</section>

			{protocols.length > 0 ? (
				<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<div className="flex items-center gap-2">
						<FlaskConical className="size-5 text-[#2e7d32]" aria-hidden />
						<h2 className="text-base font-semibold">Bộ thuốc khuyến nghị</h2>
						<span className="rounded-full bg-[#e8f5e9] px-2.5 py-0.5 text-sm font-semibold text-[#2e7d32]">
							{protocols.length}
						</span>
					</div>
					{protocols.map((protocol) => (
						<article
							key={protocol.id}
							className="flex flex-col gap-2 rounded-[12px] border border-border p-4"
						>
							<div className="flex flex-wrap items-center gap-2">
								<h3 className="font-semibold">{protocol.name}</h3>
								<span
									className={`rounded-full px-2 py-0.5 text-xs font-medium ${
										protocol.isDefault
											? "bg-[#e3f2fd] text-[#1565c0]"
											: "bg-[#f5f5f5] text-[#616161]"
									}`}
								>
									{protocol.isDefault ? "Mặc định" : "Thay thế"}
								</span>
							</div>
							{protocol.note ? (
								<p className="text-sm text-[#616161]">{protocol.note}</p>
							) : null}
							<ol className="flex flex-col gap-2">
								{protocol.items.map((item, index) => (
									<li
										key={item.id}
										className="rounded-[10px] bg-[#fafafa] p-3 text-sm"
									>
										<p className="font-semibold">
											{index + 1}. {item.productName ?? "Sản phẩm chưa chọn"}
										</p>
										<p className="text-[#2e7d32]">
											Liều: {item.doseAmount} {item.doseUnit} /{" "}
											{item.perAreaAmount} {areaUnitLabel(item.perAreaUnit)}
										</p>
										{item.mixing ? (
											<p className="text-[#616161]">
												<strong>Cách pha:</strong> {item.mixing}
											</p>
										) : null}
										{item.usage ? (
											<p className="text-[#616161]">
												<strong>Cách dùng:</strong> {item.usage}
											</p>
										) : null}
									</li>
								))}
							</ol>
						</article>
					))}
				</section>
			) : null}

			{disease.note ? (
				<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
						Kinh nghiệm xử lý
					</h2>
					<InfoBlock icon={Lightbulb} label="Lưu ý" text={disease.note} />
				</section>
			) : null}

			<p className="flex items-center gap-1.5 px-1 text-sm text-[#9e9e9e]">
				<CalendarClock className="size-4" aria-hidden />
				Cập nhật {formatDate(disease.updatedAt)} · {disease.updatedBy}
			</p>
			<button
				type="button"
				onClick={() => router.push(`/so-tay/${disease.id}/sua`)}
				className="fixed inset-x-0 bottom-nav-safe z-30 flex h-14 items-center justify-center gap-2 border-t border-border bg-primary px-4 text-lg font-bold text-white lg:static lg:h-12 lg:w-auto lg:rounded-[10px]"
			>
				<Pencil className="size-5" aria-hidden />
				Sửa sổ tay
			</button>
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
			<div className="min-w-0 flex-1">
				<span className="block text-sm font-medium text-[#9e9e9e]">
					{label}
				</span>
				<span className="text-base">{text}</span>
			</div>
		</div>
	);
}
