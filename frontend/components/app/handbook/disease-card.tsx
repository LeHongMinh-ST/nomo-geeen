"use client";

import { BookOpen, Leaf, Pill } from "lucide-react";
import Link from "next/link";
import {
	availableSuggestionCount,
	type Disease,
	fieldBadgeClass,
	fieldLabel,
	typeBadgeClass,
	typeLabel,
} from "@/lib/handbook";

/**
 * Thẻ một mục Sổ tay cho danh sách mobile (DESIGN.md §12.1).
 * Dòng đầu: tên bệnh + badge lĩnh vực/loại.
 * Dòng giữa: đối tượng + triệu chứng ngắn.
 * Đáy: số thuốc gợi ý đang còn hàng — thông tin bán được ngay.
 */
export function DiseaseCard({ disease }: { disease: Disease }) {
	const available = availableSuggestionCount(disease);

	return (
		<Link
			href={`/so-tay/${disease.id}`}
			className="flex flex-col gap-2.5 rounded-[16px] border border-border bg-card p-4 shadow-card transition-colors duration-200 ease-out active:bg-[#f5f5f5]"
		>
			<div className="flex items-start gap-3">
				<span
					className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
					style={{ backgroundColor: "#5cad45" }}
				>
					<Leaf className="size-5.5 text-white" aria-hidden />
				</span>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<span className="truncate text-lg font-semibold text-foreground">
						{disease.name}
					</span>
					<div className="flex flex-wrap items-center gap-1.5">
						<span
							className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${fieldBadgeClass[disease.field]}`}
						>
							{fieldLabel[disease.field]}
						</span>
						<span
							className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${typeBadgeClass[disease.type]}`}
						>
							{typeLabel[disease.type]}
						</span>
						<span className="text-sm text-[#9e9e9e]">{disease.subject}</span>
					</div>
				</div>
			</div>

			<p className="line-clamp-2 text-base text-[#616161]">{disease.symptom}</p>

			<div className="flex items-center gap-1.5 border-t border-border pt-2.5 text-sm font-medium text-[#2e7d32]">
				<Pill className="size-4" aria-hidden />
				{available > 0 ? (
					<span>{available} thuốc gợi ý còn hàng</span>
				) : (
					<span className="text-[#9e9e9e]">Chưa có thuốc gợi ý còn hàng</span>
				)}
			</div>
		</Link>
	);
}

/** Icon dùng chung cho empty/loading nếu cần tái sử dụng ngoài card. */
export const handbookIcon = BookOpen;
