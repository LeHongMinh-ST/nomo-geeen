"use client";

import { useState } from "react";
import { formatVND } from "@/lib/format";

/**
 * Biểu đồ cột doanh thu nền tảng 6 tháng — đơn giản theo DESIGN.md §17.
 * Một màu Brand Green, nhãn số rõ ràng, không phụ thuộc thư viện.
 */

type Month = { label: string; value: number };

const data: Month[] = [
	{ label: "T2", value: 142_000_000 },
	{ label: "T3", value: 168_000_000 },
	{ label: "T4", value: 155_000_000 },
	{ label: "T5", value: 201_000_000 },
	{ label: "T6", value: 234_000_000 },
	{ label: "T7", value: 268_000_000 },
];

const max = Math.max(...data.map((d) => d.value));

export function PlatformChart() {
	const [active, setActive] = useState<number | null>(null);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex h-48 items-end justify-between gap-2">
				{data.map((month, index) => {
					const heightPct = Math.round((month.value / max) * 100);
					const isActive = active === index;
					return (
						<button
							type="button"
							key={month.label}
							onPointerEnter={() => setActive(index)}
							onPointerLeave={() => setActive(null)}
							onFocus={() => setActive(index)}
							onBlur={() => setActive(null)}
							className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
							aria-label={`Tháng ${month.label}: ${formatVND(month.value)} đồng`}
						>
							<span
								className={`text-xs font-semibold transition-opacity duration-200 ${
									isActive ? "opacity-100" : "opacity-0"
								} text-foreground`}
							>
								{Math.round(month.value / 1_000_000)}tr
							</span>
							<span
								className="w-full rounded-t-[6px] bg-primary transition-all duration-200 ease-out group-hover:bg-[#43a047]"
								style={{
									height: `${heightPct}%`,
									opacity: isActive || active === null ? 1 : 0.55,
								}}
							/>
							<span className="text-sm text-[#616161]">{month.label}</span>
						</button>
					);
				})}
			</div>
			<div className="flex items-center justify-between border-t border-border pt-3 text-sm">
				<span className="text-[#616161]">Cao nhất 6 tháng</span>
				<span className="font-bold text-foreground">{formatVND(max)}₫</span>
			</div>
		</div>
	);
}
