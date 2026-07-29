"use client";

import type { LucideIcon } from "lucide-react";
import {
	AlertTriangle,
	ArrowRight,
	CalendarClock,
	HandCoins,
	PackagePlus,
	PackageX,
	RefreshCw,
	ShoppingCart,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardSkeleton } from "@/components/app/dashboard-skeleton";

const RevenueChart = dynamic(
	() =>
		import("@/components/app/revenue-chart").then((mod) => mod.RevenueChart),
	{ ssr: false, loading: () => <div className="h-44" aria-hidden /> },
);

import { formatVND } from "@/lib/format";
import { USER_TILE_BLUE, USER_TILE_GREEN } from "@/lib/navigation";
import { mapTenantApiError } from "@/lib/sales-api-error";
import {
	getTenantHomeSummary,
	type HomeDashboardSummary,
	moneyNumber,
	revenueDelta,
} from "@/lib/tenant-dashboard-api";
import { useUserAuth } from "@/stores/user-auth-store";

const shortcuts: {
	icon: LucideIcon;
	label: string;
	href: string;
	tile: string;
}[] = [
	{
		icon: ShoppingCart,
		label: "Bán hàng",
		href: "/ban-nhanh",
		tile: USER_TILE_GREEN,
	},
	{
		icon: PackagePlus,
		label: "Nhập hàng",
		href: "/nhap-hang",
		tile: USER_TILE_GREEN,
	},
	{ icon: HandCoins, label: "Công nợ", href: "/cong-no", tile: USER_TILE_BLUE },
];

function greetingDateLabel(now = new Date()): string {
	return new Intl.DateTimeFormat("vi-VN", {
		timeZone: "Asia/Ho_Chi_Minh",
		weekday: "long",
		day: "numeric",
		month: "long",
	}).format(now);
}

/** Vietnamese given name is usually the last token. */
function givenName(fullName?: string | null): string {
	const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
	return parts.at(-1) ?? "bạn";
}

function AlertCards({
	alerts,
}: {
	alerts: {
		icon: LucideIcon;
		label: string;
		count: number;
		href: string;
		tone: "warning" | "error";
	}[];
}) {
	return (
		<>
			<ul className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
				{alerts.map((alert) => {
					const tone =
						alert.tone === "error"
							? {
									bg: "#fdecea",
									fg: "#c62828",
									ring: "border-[#f5c6c4]",
								}
							: {
									bg: "#fff4e0",
									fg: "#b26a00",
									ring: "border-[#f0d9a8]",
								};
					return (
						<li key={alert.label} className="snap-start">
							<Link
								href={alert.href}
								className={`flex w-[min(72vw,260px)] items-center gap-3 rounded-[16px] border bg-card p-4 shadow-card transition-transform duration-150 ease-out active:scale-[0.98] ${tone.ring}`}
							>
								<span
									className="flex size-12 shrink-0 items-center justify-center rounded-[12px]"
									style={{ backgroundColor: tone.bg, color: tone.fg }}
								>
									<alert.icon className="size-6" aria-hidden />
								</span>
								<span className="flex min-w-0 flex-1 flex-col gap-0.5">
									<span
										className="text-2xl font-bold leading-none tabular-nums"
										style={{ color: tone.fg }}
									>
										{alert.count}
									</span>
									<span className="truncate text-sm text-muted-foreground">
										{alert.label}
									</span>
								</span>
								<ArrowRight
									className="size-5 shrink-0 text-[#bdbdbd]"
									aria-hidden
								/>
							</Link>
						</li>
					);
				})}
			</ul>

			<ul className="hidden gap-3 sm:grid sm:grid-cols-3">
				{alerts.map((alert) => {
					const tone =
						alert.tone === "error"
							? { bg: "#fdecea", fg: "#c62828" }
							: { bg: "#fff4e0", fg: "#b26a00" };
					return (
						<li key={alert.label}>
							<Link
								href={alert.href}
								className="group flex items-center gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card transition-colors duration-200 ease-out hover:bg-[#fafafa] active:scale-[0.99]"
							>
								<span
									className="flex size-12 shrink-0 items-center justify-center rounded-[12px]"
									style={{ backgroundColor: tone.bg, color: tone.fg }}
								>
									<alert.icon className="size-6" aria-hidden />
								</span>
								<span className="flex min-w-0 flex-1 flex-col gap-0.5">
									<span
										className="text-2xl font-bold leading-none tabular-nums"
										style={{ color: tone.fg }}
									>
										{alert.count}
									</span>
									<span className="truncate text-sm text-muted-foreground">
										{alert.label}
									</span>
								</span>
								<ArrowRight
									className="size-5 shrink-0 text-[#bdbdbd] transition-transform duration-200 ease-out group-hover:translate-x-0.5"
									aria-hidden
								/>
							</Link>
						</li>
					);
				})}
			</ul>
		</>
	);
}

export function HomeDashboard() {
	const user = useUserAuth((state) => state.user);
	const hasHydrated = useUserAuth((state) => state.hasHydrated);
	const accessToken = useUserAuth((state) => state.accessToken);
	const [data, setData] = useState<HomeDashboardSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [tick, setTick] = useState(0);

	const load = useCallback(() => {
		setLoading(true);
		setError(null);
		return getTenantHomeSummary()
			.then((summary) => {
				setData(summary);
				setLoading(false);
			})
			.catch((reason) => {
				setData(null);
				setLoading(false);
				setError(
					mapTenantApiError(
						reason,
						"Không thể tải trang chủ. Vui lòng thử lại.",
					),
				);
			});
	}, []);

	useEffect(() => {
		if (!hasHydrated) return;
		if (!accessToken) {
			setLoading(false);
			setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
			return;
		}
		let active = true;
		void tick;
		setLoading(true);
		setError(null);
		getTenantHomeSummary()
			.then((summary) => {
				if (active) {
					setData(summary);
					setLoading(false);
				}
			})
			.catch((reason) => {
				if (active) {
					setData(null);
					setLoading(false);
					setError(
						mapTenantApiError(
							reason,
							"Không thể tải trang chủ. Vui lòng thử lại.",
						),
					);
				}
			});
		return () => {
			active = false;
		};
	}, [hasHydrated, accessToken, tick]);

	const greetingDate = useMemo(() => greetingDateLabel(), []);
	const name = givenName(user?.fullName);

	const alerts = useMemo(() => {
		const source = data?.alerts;
		return [
			{
				icon: PackageX,
				label: "Hàng sắp hết",
				count: source?.lowStock ?? 0,
				href: "/ton-kho",
				tone: "warning" as const,
			},
			{
				icon: CalendarClock,
				// Real debt API has no dueDate yet — show open customer balances.
				label: "Khách đang nợ",
				count: source?.debtOwing ?? 0,
				href: "/cong-no",
				tone: "error" as const,
			},
			{
				icon: AlertTriangle,
				label: "Hàng sắp hết hạn",
				count: source?.nearExpiry ?? 0,
				href: "/ton-kho",
				tone: "warning" as const,
			},
		];
	}, [data]);

	const alertTotal = alerts.reduce((sum, a) => sum + a.count, 0);
	const todayDelta = data
		? revenueDelta(data.today.revenue, data.today.previousRevenue)
		: null;
	const monthDelta = data
		? revenueDelta(data.month.revenue, data.month.previousRevenue)
		: null;
	const chartData = (data?.last7Days ?? []).map((day) => ({
		label: day.label,
		value: moneyNumber(day.revenue),
	}));
	const topProducts = data?.topProducts ?? [];

	if (!hasHydrated || loading) {
		return <DashboardSkeleton />;
	}

	if (error) {
		return (
			<div className="flex w-full flex-col items-start gap-4 rounded-[16px] border border-border bg-card p-6 shadow-card">
				<p role="alert" className="text-base text-[#c62828]">
					{error}
				</p>
				<button
					type="button"
					onClick={() => {
						setTick((n) => n + 1);
						void load();
					}}
					className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-primary px-4 text-base font-semibold text-white"
				>
					<RefreshCw className="size-4" aria-hidden />
					Thử lại
				</button>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="rounded-[16px] border border-border bg-card p-6 text-base text-muted-foreground shadow-card">
				Chưa có dữ liệu trang chủ.
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-5 pb-2 lg:gap-6">
			<header className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-0.5">
					<p className="text-sm font-medium text-muted-foreground">
						{greetingDate}
					</p>
					<h1 className="text-[26px] font-bold leading-tight tracking-tight text-foreground lg:text-[28px]">
						Chào {name}
					</h1>
				</div>
			</header>

			<section
				aria-label="Doanh thu hôm nay"
				className="relative overflow-hidden rounded-[18px] border border-[#d7e8d2] bg-[#f3f8f1] p-5 shadow-card lg:p-6"
			>
				<div
					aria-hidden
					className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full bg-[radial-gradient(circle_at_center,rgba(104,192,72,0.18)_0%,transparent_70%)]"
				/>
				<div className="relative flex flex-col gap-3">
					<div className="flex items-center justify-between gap-2">
						<span className="text-sm font-medium text-[#5c635c]">
							Doanh thu hôm nay
						</span>
						{todayDelta ? (
							<span
								className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${
									todayDelta.up
										? "bg-white/80 text-[#2e7d32]"
										: "bg-white/80 text-[#c62828]"
								}`}
							>
								{todayDelta.up ? (
									<TrendingUp className="size-4" aria-hidden />
								) : (
									<TrendingDown className="size-4" aria-hidden />
								)}
								{todayDelta.text}
							</span>
						) : null}
					</div>
					<p className="text-[32px] font-bold leading-none tracking-tight text-foreground tabular-nums lg:text-[36px]">
						{formatVND(moneyNumber(data.today.revenue))}
						<span className="ml-1 text-[22px] font-bold text-[#5c635c]">₫</span>
					</p>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#5c635c]">
						<span>so với hôm qua</span>
						<span aria-hidden className="text-[#d0d5d0]">
							·
						</span>
						<span className="font-medium text-foreground">
							{data.today.orders} đơn
						</span>
					</div>
				</div>
			</section>

			<section
				aria-label="Số liệu tháng và công nợ"
				className="grid grid-cols-2 gap-3"
			>
				<div className="flex flex-col gap-1.5 rounded-[16px] border border-border bg-card p-4 shadow-card">
					<span className="text-sm text-muted-foreground">Doanh thu tháng</span>
					<span className="text-lg font-bold leading-snug tracking-tight text-foreground tabular-nums sm:text-xl">
						{formatVND(moneyNumber(data.month.revenue))}
						<span className="ml-0.5 text-base">₫</span>
					</span>
					{monthDelta ? (
						<span
							className={`inline-flex w-fit items-center gap-0.5 text-sm font-semibold ${
								monthDelta.up ? "text-[#2e7d32]" : "text-[#c62828]"
							}`}
						>
							{monthDelta.up ? (
								<TrendingUp className="size-3.5" aria-hidden />
							) : (
								<TrendingDown className="size-3.5" aria-hidden />
							)}
							{monthDelta.text}
						</span>
					) : (
						<span className="text-sm text-muted-foreground">
							so với tháng trước
						</span>
					)}
				</div>
				<Link
					href="/cong-no"
					className="group flex flex-col gap-1.5 rounded-[16px] border border-border bg-card p-4 shadow-card transition-colors duration-200 ease-out hover:bg-[#fafbfa] active:scale-[0.99]"
				>
					<span className="text-sm text-muted-foreground">Phải thu</span>
					<span className="text-lg font-bold leading-snug tracking-tight text-foreground tabular-nums sm:text-xl">
						{formatVND(moneyNumber(data.receivable.balance))}
						<span className="ml-0.5 text-base">₫</span>
					</span>
					<span className="inline-flex items-center gap-1 text-sm font-medium text-[#1a6fa8]">
						{data.receivable.customers} khách
						<ArrowRight
							className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
							aria-hidden
						/>
					</span>
				</Link>
			</section>

			<section className="flex flex-col gap-3" aria-label="Cần chú ý">
				<div className="flex items-center justify-between gap-2">
					<h2 className="text-base font-semibold text-foreground">Cần chú ý</h2>
					{alertTotal > 0 ? (
						<span className="rounded-full bg-[#fff4e0] px-2.5 py-0.5 text-sm font-semibold text-[#b26a00]">
							{alertTotal} việc
						</span>
					) : (
						<span className="text-sm text-muted-foreground">
							Không có cảnh báo
						</span>
					)}
				</div>
				{alertTotal === 0 ? (
					<p className="rounded-[16px] border border-border bg-card p-4 text-sm text-muted-foreground shadow-card">
						Kho và công nợ đang ổn định.
					</p>
				) : (
					<AlertCards alerts={alerts} />
				)}
			</section>

			<section className="flex flex-col gap-3" aria-label="Lối tắt nhanh">
				<h2 className="text-base font-semibold text-foreground">
					Lối tắt nhanh
				</h2>
				<div className="grid grid-cols-3 gap-3">
					{shortcuts.map((s) => (
						<Link
							key={s.label}
							href={s.href}
							className="group flex min-h-[96px] flex-col items-center justify-center gap-2.5 rounded-[16px] border border-border bg-card px-2 py-3 shadow-card transition-all duration-200 ease-out hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.97]"
						>
							<span
								className="flex size-12 items-center justify-center rounded-[12px] transition-transform duration-200 ease-out group-hover:scale-105 group-active:scale-95"
								style={{ backgroundColor: s.tile }}
							>
								<s.icon className="size-6 text-white" aria-hidden />
							</span>
							<span className="text-center text-sm font-semibold text-foreground">
								{s.label}
							</span>
						</Link>
					))}
				</div>
			</section>

			<div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
				<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<div className="flex items-center justify-between gap-2">
						<h2 className="text-base font-semibold text-foreground">
							Doanh thu 7 ngày
						</h2>
						<span className="text-sm text-muted-foreground">nghìn ₫</span>
					</div>
					<RevenueChart data={chartData} />
				</section>

				<section className="flex flex-col gap-1 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<div className="mb-2 flex items-center justify-between gap-2">
						<h2 className="text-base font-semibold text-foreground">
							Bán chạy trong tháng
						</h2>
					</div>
					{topProducts.length === 0 ? (
						<p className="py-6 text-sm text-muted-foreground">
							Chưa có sản phẩm bán chạy trong tháng này.
						</p>
					) : (
						<ul className="flex flex-col">
							{topProducts.map((item, index) => (
								<li
									key={item.productId}
									className="flex items-center gap-3 border-b border-border py-3.5 last:border-b-0"
								>
									<span
										className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
											index === 0
												? "bg-primary text-white"
												: "bg-[#f3f8f1] text-[#3f8530]"
										}`}
									>
										{index + 1}
									</span>
									<div className="flex min-w-0 flex-1 flex-col gap-0.5">
										<p className="truncate text-base font-medium text-foreground">
											{item.name}
										</p>
										<p className="text-sm text-muted-foreground">
											Đã bán {formatVND(moneyNumber(item.qtyBase))}
										</p>
									</div>
									<span className="shrink-0 text-base font-bold tabular-nums text-foreground">
										{formatVND(moneyNumber(item.total))}₫
									</span>
								</li>
							))}
						</ul>
					)}
				</section>
			</div>
		</div>
	);
}
