/**
 * Vocabulary cho cảnh báo hạn sử dụng theo tầng (catalog §5.1: mốc 180/90/30 ngày).
 *
 * Tier do server phân loại (backend `expiry-policy.ts`) và trả về trong payload
 * tồn kho — client chỉ render, không tự tính ngày trên trình duyệt.
 * Màu badge lấy từ bảng "Màu trạng thái" của DESIGN.md, dùng lại đúng các cặp
 * nền/chữ đã có sẵn trong app (success / warning / info / error / trung tính).
 */

import type { ExpiryTier } from "@/lib/tenant-inventory-api";

/** Thứ tự nghiêm trọng giảm dần — khớp `EXPIRY_TIERS` phía backend. */
export const EXPIRY_TIER_ORDER: readonly ExpiryTier[] = [
	"EXPIRED",
	"CRITICAL",
	"WARNING",
	"NOTICE",
	"FRESH",
	"NONE",
];

export const expiryTierLabel: Record<ExpiryTier, string> = {
	EXPIRED: "Đã hết hạn",
	CRITICAL: "Còn dưới 30 ngày",
	WARNING: "Còn dưới 90 ngày",
	NOTICE: "Còn dưới 180 ngày",
	FRESH: "Còn hạn",
	NONE: "Không HSD",
};

/**
 * DESIGN.md: Error = quá hạn, Warning = sắp đến hạn, Success = còn hạn.
 * CRITICAL và WARNING cùng họ "sắp đến hạn" nên dùng chung cặp warning;
 * nhãn ("Còn dưới 30/90 ngày") là thứ phân biệt mức độ.
 */
export const expiryTierBadgeClass: Record<ExpiryTier, string> = {
	EXPIRED: "bg-[#ffebee] text-[#c62828]",
	CRITICAL: "bg-[#fff8e1] text-[#f57f17]",
	WARNING: "bg-[#fff8e1] text-[#f57f17]",
	NOTICE: "bg-[#e3f2fd] text-[#1565c0]",
	FRESH: "bg-[#e8f5e9] text-[#2e7d32]",
	NONE: "bg-[#f5f5f5] text-[#616161]",
};

export type ExpiryFilter = "all" | ExpiryTier;

/** Chip lọc theo HSD cho danh sách tồn kho. */
export const expiryFilterOptions: Array<{
	value: ExpiryFilter;
	label: string;
}> = [
	{ value: "all", label: "Mọi HSD" },
	...EXPIRY_TIER_ORDER.map((tier) => ({
		value: tier as ExpiryFilter,
		label: expiryTierLabel[tier],
	})),
];

export type { ExpiryTier };
