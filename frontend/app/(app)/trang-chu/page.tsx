import {
	AlertTriangle,
	ArrowUpRight,
	CalendarClock,
	HandCoins,
	PackagePlus,
	PackageX,
	ShoppingCart,
	TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RevenueChart } from "@/components/app/revenue-chart";
import { formatVND } from "@/lib/format";

export const metadata: Metadata = {
	title: "Trang chủ · NomoGreen",
};

/* Dữ liệu mẫu (mock) — sẽ thay bằng API ở task backend. */
const kpis = [
	{ label: "Doanh thu hôm nay", value: 12_480_000, delta: "+8%", up: true },
	{ label: "Doanh thu tháng này", value: 284_600_000, delta: "+12%", up: true },
];

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

const shortcuts: { icon: LucideIcon; label: string; href: string; tile: string }[] =
	[
		{
			icon: ShoppingCart,
			label: "Bán hàng",
			href: "/ban-nhanh",
			tile: "#43a047",
		},
		{
			icon: PackagePlus,
			label: "Nhập hàng",
			href: "/nhap-hang",
			tile: "#26a69a",
		},
		{ icon: HandCoins, label: "Thu nợ", href: "/cong-no", tile: "#f4511e" },
	];

const bestSellers = [
	{ name: "Phân bón NPK Đầu Trâu 20-20-15", sold: 148, revenue: 37_000_000 },
	{ name: "Thuốc trừ sâu Regent 800WG", sold: 96, revenue: 14_400_000 },
	{ name: "Hạt giống lúa OM5451", sold: 72, revenue: 10_800_000 },
	{ name: "Vôi bột nông nghiệp", sold: 65, revenue: 3_250_000 },
];

export default function TrangChuPage() {
	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
			{/* Lời chào */}
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight text-foreground">
					Chào anh Tâm 👋
				</h1>
				<p className="text-base text-[#616161]">
					Đây là tình hình cửa hàng hôm nay.
				</p>
			</div>

			{/* 1. KPI */}
			<section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{kpis.map((kpi) => (
					<div
						key={kpi.label}
						className="flex flex-col gap-2 rounded-[16px] border border-border bg-card p-5 shadow-card"
					>
						<span className="text-sm text-[#616161]">{kpi.label}</span>
						<div className="flex items-end justify-between gap-3">
							<span className="text-3xl font-bold tracking-tight text-foreground">
								{formatVND(kpi.value)}
								<span className="ml-1 text-xl">₫</span>
							</span>
							<span className="flex items-center gap-1 rounded-full bg-[#e8f5e9] px-2.5 py-1 text-sm font-semibold text-[#2e7d32]">
								<TrendingUp className="size-4" aria-hidden />
								{kpi.delta}
							</span>
						</div>
					</div>
				))}
			</section>

			{/* 2. Cảnh báo */}
			<section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{alerts.map((alert) => {
					const toneClass =
						alert.tone === "error"
							? "bg-[#ffebee] text-[#c62828]"
							: "bg-[#fff8e1] text-[#f57f17]";
					return (
						<Link
							key={alert.label}
							href={alert.href}
							className="group flex items-center gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card transition-shadow duration-200 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
						>
							<span
								className={`flex size-12 shrink-0 items-center justify-center rounded-[10px] ${toneClass}`}
							>
								<alert.icon className="size-6" aria-hidden />
							</span>
							<div className="flex flex-col">
								<span className="text-2xl font-bold text-foreground">
									{alert.count}
								</span>
								<span className="text-sm text-[#616161]">{alert.label}</span>
							</div>
							<ArrowUpRight className="ml-auto size-5 text-[#9e9e9e] transition-colors group-hover:text-primary" />
						</Link>
					);
				})}
			</section>

			{/* 3. Lối tắt nhanh */}
			<section className="flex flex-col gap-3">
				<h2 className="text-lg font-semibold text-foreground">Lối tắt nhanh</h2>
				<div className="grid grid-cols-3 gap-3 sm:gap-4">
					{shortcuts.map((s) => (
						<Link
							key={s.label}
							href={s.href}
							className="flex flex-col items-center gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card transition-shadow duration-200 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
						>
							<span
								className="flex size-12 items-center justify-center rounded-[12px]"
								style={{ backgroundColor: s.tile }}
							>
								<s.icon className="size-7 text-white" aria-hidden />
							</span>
							<span className="text-center text-base font-semibold text-foreground">
								{s.label}
							</span>
						</Link>
					))}
				</div>
			</section>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{/* 4. Biểu đồ doanh thu */}
				<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-foreground">
							Doanh thu 7 ngày
						</h2>
						<span className="text-sm text-[#616161]">Đơn vị: nghìn ₫</span>
					</div>
					<RevenueChart />
				</section>

				{/* 5. Bán chạy trong tháng */}
				<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<h2 className="text-lg font-semibold text-foreground">
						Bán chạy trong tháng
					</h2>
					<ul className="flex flex-col">
						{bestSellers.map((item, index) => (
							<li
								key={item.name}
								className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
							>
								<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-sm font-bold text-[#616161]">
									{index + 1}
								</span>
								<div className="min-w-0 flex-1">
									<p className="truncate text-base font-medium text-foreground">
										{item.name}
									</p>
									<p className="text-sm text-[#616161]">
										Đã bán {item.sold}
									</p>
								</div>
								<span className="shrink-0 text-base font-bold text-foreground">
									{formatVND(item.revenue)}₫
								</span>
							</li>
						))}
					</ul>
				</section>
			</div>
		</div>
	);
}
