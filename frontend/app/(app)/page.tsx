import {
	AlertTriangle,
	ArrowRight,
	CalendarClock,
	HandCoins,
	PackagePlus,
	PackageX,
	ShoppingCart,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DashboardSkeleton } from "@/components/app/dashboard-skeleton";
import { RevenueChart } from "@/components/app/revenue-chart";
import { LoadingGate } from "@/components/ui/loading-gate";
import { formatVND } from "@/lib/format";
import { USER_TILE_BLUE, USER_TILE_GREEN } from "@/lib/navigation";

export const metadata: Metadata = {
	title: "Trang chủ · NomoGreen",
};

/* Dữ liệu mẫu (mock) — sẽ thay bằng API ở task backend. */
const todayRevenue = {
	value: 12_480_000,
	delta: "+8%",
	up: true,
	hint: "so với hôm qua",
	orders: 27,
};

const monthRevenue = {
	value: 284_600_000,
	delta: "+12%",
	up: true,
	hint: "so với tháng trước",
};

const debtReceivable = {
	value: 48_350_000,
	customers: 12,
};

const alerts: {
	icon: LucideIcon;
	label: string;
	count: number;
	href: string;
	tone: "warning" | "error";
}[] = [
	{
		icon: PackageX,
		label: "Hàng sắp hết",
		count: 6,
		href: "/ton-kho",
		tone: "warning",
	},
	{
		icon: CalendarClock,
		label: "Nợ đến hạn",
		count: 4,
		href: "/cong-no",
		tone: "error",
	},
	{
		icon: AlertTriangle,
		label: "Hàng sắp hết hạn",
		count: 3,
		href: "/ton-kho",
		tone: "warning",
	},
];

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
	{ icon: HandCoins, label: "Thu nợ", href: "/cong-no", tile: USER_TILE_BLUE },
];

const bestSellers = [
	{ name: "Phân bón NPK Đầu Trâu 20-20-15", sold: 148, revenue: 37_000_000 },
	{ name: "Thuốc trừ sâu Regent 800WG", sold: 96, revenue: 14_400_000 },
	{ name: "Hạt giống lúa OM5451", sold: 72, revenue: 10_800_000 },
	{ name: "Vôi bột nông nghiệp", sold: 65, revenue: 3_250_000 },
];

/** Ngày hiển thị tiếng Việt — mock cố định để UI ổn định; API thay sau. */
const greetingDate = "Thứ Sáu, 18 tháng 7";

export default function TrangChuPage() {
	const alertTotal = alerts.reduce((sum, a) => sum + a.count, 0);

	return (
		<LoadingGate skeleton={<DashboardSkeleton />}>
			<div className="flex w-full flex-col gap-5 pb-2 lg:gap-6">
				{/* 0. Lời chào — gọn, kiểu app native */}
				<header className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 flex-col gap-0.5">
						<p className="text-sm font-medium text-muted-foreground">
							{greetingDate}
						</p>
						<h1 className="text-[26px] font-bold leading-tight tracking-tight text-foreground lg:text-[28px]">
							Chào anh Tâm
						</h1>
					</div>
					<Link
						href="/ban-nhanh"
						className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-base font-semibold text-white shadow-[0_6px_16px_rgba(92,173,69,0.28)] transition-all duration-200 ease-out hover:bg-[#4f9c3a] active:scale-[0.97] active:bg-[#3f8530] lg:px-5"
					>
						<ShoppingCart className="size-5" aria-hidden />
						<span className="hidden sm:inline">Bán hàng</span>
						<span className="sm:hidden">Bán</span>
					</Link>
				</header>

				{/* 1. KPI hero — số lớn, 1 chạm đọc được (mobile banking) */}
				<section
					aria-label="Doanh thu hôm nay"
					className="relative overflow-hidden rounded-[18px] border border-[#d7e8d2] bg-[#f3f8f1] p-5 shadow-card lg:p-6"
				>
					{/* Soft brand orb — depth nhẹ, không rực */}
					<div
						aria-hidden
						className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full bg-[radial-gradient(circle_at_center,rgba(104,192,72,0.18)_0%,transparent_70%)]"
					/>
					<div className="relative flex flex-col gap-3">
						<div className="flex items-center justify-between gap-2">
							<span className="text-sm font-medium text-[#5c635c]">
								Doanh thu hôm nay
							</span>
							<span
								className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${
									todayRevenue.up
										? "bg-white/80 text-[#2e7d32]"
										: "bg-white/80 text-[#c62828]"
								}`}
							>
								{todayRevenue.up ? (
									<TrendingUp className="size-4" aria-hidden />
								) : (
									<TrendingDown className="size-4" aria-hidden />
								)}
								{todayRevenue.delta}
							</span>
						</div>
						<p className="text-[32px] font-bold leading-none tracking-tight text-foreground tabular-nums lg:text-[36px]">
							{formatVND(todayRevenue.value)}
							<span className="ml-1 text-[22px] font-bold text-[#5c635c]">
								₫
							</span>
						</p>
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#5c635c]">
							<span>{todayRevenue.hint}</span>
							<span aria-hidden className="text-[#d0d5d0]">
								·
							</span>
							<span className="font-medium text-foreground">
								{todayRevenue.orders} đơn
							</span>
						</div>
					</div>
				</section>

				{/* KPI phụ — 2 cột ngang, không chồng card */}
				<section
					aria-label="Số liệu tháng và công nợ"
					className="grid grid-cols-2 gap-3"
				>
					<div className="flex flex-col gap-1.5 rounded-[16px] border border-border bg-card p-4 shadow-card">
						<span className="text-sm text-muted-foreground">
							Doanh thu tháng
						</span>
						<span className="text-lg font-bold leading-snug tracking-tight text-foreground tabular-nums sm:text-xl">
							{formatVND(monthRevenue.value)}
							<span className="ml-0.5 text-base">₫</span>
						</span>
						<span
							className={`inline-flex w-fit items-center gap-0.5 text-sm font-semibold ${
								monthRevenue.up ? "text-[#2e7d32]" : "text-[#c62828]"
							}`}
						>
							{monthRevenue.up ? (
								<TrendingUp className="size-3.5" aria-hidden />
							) : (
								<TrendingDown className="size-3.5" aria-hidden />
							)}
							{monthRevenue.delta}
						</span>
					</div>
					<Link
						href="/cong-no"
						className="group flex flex-col gap-1.5 rounded-[16px] border border-border bg-card p-4 shadow-card transition-colors duration-200 ease-out hover:bg-[#fafbfa] active:scale-[0.99]"
					>
						<span className="text-sm text-muted-foreground">Phải thu</span>
						<span className="text-lg font-bold leading-snug tracking-tight text-foreground tabular-nums sm:text-xl">
							{formatVND(debtReceivable.value)}
							<span className="ml-0.5 text-base">₫</span>
						</span>
						<span className="inline-flex items-center gap-1 text-sm font-medium text-[#1a6fa8]">
							{debtReceivable.customers} khách
							<ArrowRight
								className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
								aria-hidden
							/>
						</span>
					</Link>
				</section>

				{/* 2. Cảnh báo — chip cuộn ngang (mobile) / grid (desktop) */}
				<section className="flex flex-col gap-3" aria-label="Cần chú ý">
					<div className="flex items-center justify-between gap-2">
						<h2 className="text-base font-semibold text-foreground">
							Cần chú ý
						</h2>
						{alertTotal > 0 ? (
							<span className="rounded-full bg-[#fff4e0] px-2.5 py-0.5 text-sm font-semibold text-[#b26a00]">
								{alertTotal} việc
							</span>
						) : null}
					</div>

					{/* Mobile: horizontal snap */}
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

					{/* sm+: grid */}
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
				</section>

				{/* 3. Lối tắt nhanh — tile FarmGo, chạm ≥ 48 */}
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

				{/* 4 + 5. Biểu đồ & Bán chạy */}
				<div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
					<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
						<div className="flex items-center justify-between gap-2">
							<h2 className="text-base font-semibold text-foreground">
								Doanh thu 7 ngày
							</h2>
							<span className="text-sm text-muted-foreground">nghìn ₫</span>
						</div>
						<RevenueChart />
					</section>

					<section className="flex flex-col gap-1 rounded-[16px] border border-border bg-card p-5 shadow-card">
						<div className="mb-2 flex items-center justify-between gap-2">
							<h2 className="text-base font-semibold text-foreground">
								Bán chạy trong tháng
							</h2>
							<Link
								href="/bao-cao"
								className="text-sm font-medium text-primary transition-opacity duration-150 hover:opacity-80"
							>
								Xem tất cả
							</Link>
						</div>
						<ul className="flex flex-col">
							{bestSellers.map((item, index) => (
								<li
									key={item.name}
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
											Đã bán {item.sold}
										</p>
									</div>
									<span className="shrink-0 text-base font-bold tabular-nums text-foreground">
										{formatVND(item.revenue)}₫
									</span>
								</li>
							))}
						</ul>
					</section>
				</div>
			</div>
		</LoadingGate>
	);
}
