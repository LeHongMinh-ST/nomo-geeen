"use client";

export type SaleAdvisorySource = {
	phiDays?: number | null;
	reiHours?: number | null;
	phi?: number | null;
	rei?: number | null;
	/** Nested agro from Product */
	agro?: {
		phi?: number | null;
		rei?: number | null;
	} | null;
	attrs?: Record<string, unknown> | null;
};

export type SaleAdvisoryChip = {
	key: string;
	label: string;
};

function num(v: unknown): number | undefined {
	if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
	if (typeof v === "string" && v.trim() !== "") {
		const n = Number(v);
		if (Number.isFinite(n) && n > 0) return n;
	}
	return undefined;
}

/** Collect display-only PHI/REI/withdrawal chips from loose product/line meta. */
export function collectSaleAdvisories(
	source: SaleAdvisorySource | null | undefined,
): SaleAdvisoryChip[] {
	if (!source) return [];
	const chips: SaleAdvisoryChip[] = [];
	const phi =
		num(source.phiDays) ??
		num(source.phi) ??
		num(source.agro?.phi) ??
		num(source.attrs?.phiDays) ??
		num(source.attrs?.phi);
	const rei =
		num(source.reiHours) ??
		num(source.rei) ??
		num(source.agro?.rei) ??
		num(source.attrs?.reiDays) ??
		num(source.attrs?.rei);
	if (phi != null) {
		chips.push({ key: "phi", label: `PHI ${phi} ngày` });
	}
	if (rei != null) {
		chips.push({ key: "rei", label: `REI ${rei} giờ` });
	}
	const withdrawal =
		source.attrs?.withdrawalNote ??
		source.attrs?.withdrawal ??
		source.attrs?.withdrawalPeriod;
	if (typeof withdrawal === "string" && withdrawal.trim()) {
		chips.push({ key: "withdrawal", label: withdrawal.trim() });
	} else {
		const wd = num(source.attrs?.withdrawalDays);
		if (wd != null) {
			chips.push({ key: "withdrawal", label: `Cách ly ${wd} ngày` });
		}
	}
	return chips;
}

/**
 * Non-blocking advisory chips (catalog §11.3 display-only).
 * Renders null when no meta — never blocks checkout.
 */
export function SaleAdvisoriesStrip({
	source,
	className = "",
}: {
	source: SaleAdvisorySource | null | undefined;
	className?: string;
}) {
	const chips = collectSaleAdvisories(source);
	if (chips.length === 0) return null;
	return (
		<div
			className={`flex flex-wrap gap-1.5 ${className}`.trim()}
			data-testid="sale-advisories-strip"
		>
			{chips.map((c) => (
				<span
					key={c.key}
					className="rounded-full border border-[#e6a817]/40 bg-[#fff8e1] px-2 py-0.5 text-xs font-medium text-[#8a6d00]"
				>
					{c.label}
				</span>
			))}
		</div>
	);
}
