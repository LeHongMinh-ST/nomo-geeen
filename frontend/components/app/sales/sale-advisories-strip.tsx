"use client";

export type SaleAdvisorySource = {
	phiDays?: number | null;
	reiDays?: number | null;
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

/** Withdrawal chips read the contract keys (camelCase + snake_case aliases)
 * mirrored from backend SALE_ADVISORY_ATTR_KEYS. */
const WITHDRAWAL_CHIPS = [
	{
		key: "withdrawalMeat",
		aliases: ["withdrawalMeatDays", "withdrawal_meat_days"],
		label: "Cách ly thịt",
	},
	{
		key: "withdrawalMilk",
		aliases: ["withdrawalMilkDays", "withdrawal_milk_days"],
		label: "Cách ly sữa",
	},
	{
		key: "withdrawalEgg",
		aliases: ["withdrawalEggDays", "withdrawal_egg_days"],
		label: "Cách ly trứng",
	},
] as const;

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
		num(source.attrs?.phi_days) ??
		num(source.attrs?.phi);
	const rei =
		num(source.reiDays) ??
		num(source.rei) ??
		num(source.agro?.rei) ??
		num(source.attrs?.reiDays) ??
		num(source.attrs?.rei_days) ??
		num(source.attrs?.rei);
	if (phi != null) {
		chips.push({ key: "phi", label: `PHI ${phi} ngày` });
	}
	if (rei != null) {
		chips.push({ key: "rei", label: `REI ${rei} ngày` });
	}
	for (const chip of WITHDRAWAL_CHIPS) {
		const days = chip.aliases.reduce<number | undefined>(
			(found, alias) => found ?? num(source.attrs?.[alias]),
			undefined,
		);
		if (days != null) {
			chips.push({ key: chip.key, label: `${chip.label} ${days} ngày` });
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
