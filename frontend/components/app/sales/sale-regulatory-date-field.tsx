"use client";

import type { OrderLine } from "@/lib/orders";

/**
 * Ngày sự kiện pháp lý bắt buộc gửi lên API bán hàng.
 * PESTICIDE cần ngày dự kiến thu hoạch (gate PHI/REI), VET_DRUG cần ngày kết
 * thúc cách ly (gate withdrawal). Loại khác không hiện ô nào.
 */

type RegulatoryField = {
	name: "harvestDate" | "withdrawalEndDate";
	label: string;
	hint: string;
};

const FIELD_BY_KIND: Record<string, RegulatoryField> = {
	PESTICIDE: {
		name: "harvestDate",
		label: "Ngày dự kiến thu hoạch",
		hint: "Dùng để kiểm tra thời gian cách ly trước thu hoạch.",
	},
	VET_DRUG: {
		name: "withdrawalEndDate",
		label: "Ngày kết thúc cách ly",
		hint: "Dùng để kiểm tra thời gian ngưng sử dụng thuốc thú y.",
	},
};

export function resolveRegulatoryField(
	productKind: string | null | undefined,
): RegulatoryField | undefined {
	return productKind ? FIELD_BY_KIND[productKind] : undefined;
}

export function SaleRegulatoryDateField({
	line,
	onChange,
}: {
	line: OrderLine;
	onChange: (
		productId: string,
		field: RegulatoryField["name"],
		value: string,
	) => void;
}) {
	const field = resolveRegulatoryField(line.productKind);
	if (!field) return null;
	const inputId = `${field.name}-${line.productId}`;
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={inputId} className="text-sm font-semibold text-[#616161]">
				{field.label}
			</label>
			<input
				id={inputId}
				type="date"
				value={line[field.name] ?? ""}
				onChange={(e) => onChange(line.productId, field.name, e.target.value)}
				className="h-12 w-full rounded-[10px] border border-border bg-white px-4 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
			/>
			<p className="text-sm text-[#9e9e9e]">{field.hint}</p>
		</div>
	);
}
