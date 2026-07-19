"use client";

import { useState } from "react";
import { formatVND } from "@/lib/format";

/**
 * Biểu đồ cột doanh thu 7 ngày — đơn giản theo DESIGN.md §17.
 * Tối đa 1 màu (Brand Green), có nhãn số rõ ràng, không phụ thuộc thư viện.
 */

type Day = { label: string; value: number };

const data: Day[] = [
	{ label: "T2", value: 8_200_000 },
	{ label: "T3", value: 10_500_000 },
	{ label: "T4", value: 7_400_000 },
	{ label: "T5", value: 13_100_000 },
	{ label: "T6", value: 11_800_000 },
	{ label: "T7", value: 15_600_000 },
	{ label: "CN", value: 12_480_000 },
];

const max = Math.max(...data.map((d) => d.value));

const todayIndex = data.length - 1;

export function RevenueChart() {
	const [active, setActive] = useState<number | null>(todayIndex);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex h-44 items-end justify-between gap-1.5 sm:gap-2">
				{data.map((day, index) => {
					const heightPct = Math.max(8, Math.round((day.value / max) * 100));
					const isActive = active === index;
					const isToday = index === todayIndex;
					return (
						<button
							type="button"
							key={day.label}
							onPointerEnter={() => setActive(index)}
							onPointerLeave={() => setActive(todayIndex)}
							onFocus={() => setActive(index)}
							onBlur={() => setActive(todayIndex)}
							className="group flex h-full min-h-12 flex-1 flex-col items-center justify-end gap-1.5 touch-manipulation"
							aria-label={`${day.label}: ${formatVND(day.value)} đồng${isToday ? " (hôm nay)" : ""}`}
							aria-pressed={isActive}
						>
							<span
								className={`text-sm font-semibold tabular-nums transition-opacity duration-200 ${
									isActive ? "opacity-100" : "opacity-0"
								} text-foreground`}
							>
								{Math.round(day.value / 1000)}
							</span>
							<span
								className={`w-full max-w-10 rounded-t-[8px] transition-all duration-200 ease-out sm:max-w-none ${
									isToday || isActive
										? "bg-primary"
										: "bg-[#c8e0c0]"
								}`}
								style={{
									height: `${heightPct}%`,
									opacity: isActive || active === null ? 1 : 0.7,
								}}
							/>
							<span
								className={`text-sm ${
									isToday
										? "font-semibold text-primary"
										: "text-muted-foreground"
								}`}
							>
								{day.label}
							</span>
						</button>
					);
				})}
			</div>
			<div className="flex items-center justify-between border-t border-border pt-3 text-sm">
				<span className="text-muted-foreground">Cao nhất trong tuần</span>
				<span className="font-bold tabular-nums text-foreground">
					{formatVND(max)}₫
				</span>
			</div>
		</div>
	);
}
