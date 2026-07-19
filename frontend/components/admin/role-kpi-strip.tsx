"use client";

/**
 * KPI strip editorial cho trang Vai trò (RoleTable).
 * 3 card monospace số liệu, hairline border, không shadow.
 */

interface Props {
	total: number;
	system: number;
	custom: number;
	granted: number;
}

export function RoleKpiStrip({ total, system, custom, granted }: Props) {
	void custom;
	return (
		<div className="grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border border-border/60 bg-border/60 sm:grid-cols-3">
			<KpiCard label="Tổng vai trò" value={total} hint="Bao gồm hệ thống và tuỳ chỉnh" />
			<KpiCard
				label="Hệ thống"
				value={system}
				hint="Không thể xoá, khoá mã"
			/>
			<KpiCard
				label="Quyền đang cấp"
				value={granted}
				hint="Tổng mã quyền duy nhất đã gán"
			/>
		</div>
	);
}

function KpiCard({
	label,
	value,
	hint,
}: {
	label: string;
	value: number;
	hint: string;
}) {
	return (
		<div className="flex flex-col gap-2 bg-card p-4">
			<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
				{label}
			</p>
			<p className="text-[28px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
				{value}
			</p>
			<p className="text-xs text-muted-foreground/80">{hint}</p>
		</div>
	);
}
