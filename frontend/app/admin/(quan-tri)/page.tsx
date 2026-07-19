import type { LucideIcon } from "lucide-react";
import {
	ArrowUpRight,
	Building2,
	CircleCheck,
	CreditCard,
	MoreVertical,
	ServerCog,
	TrendingUp,
	TriangleAlert,
	UserPlus,
	Users,
	Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlatformChart } from "@/components/admin/platform-chart";
import { formatVND } from "@/lib/format";

export const metadata: Metadata = {
	title: "Bảng điều khiển · Quản trị NomoGreen",
	robots: { index: false, follow: false },
};

/* Dữ liệu mẫu (mock) — sẽ thay bằng API ở task backend. */
const kpis: {
	label: string;
	value: string;
	unit?: string;
	delta: string;
	up: boolean;
	icon: LucideIcon;
	tile: string;
}[] = [
	{
		label: "Cửa hàng đang hoạt động",
		value: "1.284",
		delta: "+42",
		up: true,
		icon: Building2,
		tile: "#43a047",
	},
	{
		label: "Người dùng",
		value: "3.916",
		delta: "+128",
		up: true,
		icon: Users,
		tile: "#1e88e5",
	},
	{
		label: "Doanh thu nền tảng tháng này",
		value: formatVND(268_000_000),
		unit: "₫",
		delta: "+14%",
		up: true,
		icon: Wallet,
		tile: "#7e57c2",
	},
	{
		label: "Giao dịch hôm nay",
		value: "8.472",
		delta: "+6%",
		up: true,
		icon: CreditCard,
		tile: "#f4511e",
	},
];

const alerts: {
	icon: LucideIcon;
	label: string;
	count: number;
	href: string;
	tone: "warning" | "error";
}[] = [
	{
		icon: TriangleAlert,
		label: "Gói sắp hết hạn",
		count: 18,
		href: "/admin/goi-dich-vu",
		tone: "warning",
	},
	{
		icon: Wallet,
		label: "Hóa đơn quá hạn",
		count: 7,
		href: "/admin/transactions",
		tone: "error",
	},
	{
		icon: ServerCog,
		label: "Cảnh báo hệ thống",
		count: 2,
		href: "/admin/status",
		tone: "error",
	},
];

const recentStores: {
	name: string;
	owner: string;
	plan: string;
	joined: string;
	status: "active" | "trial" | "overdue";
}[] = [
	{
		name: "Vật tư Minh Tâm",
		owner: "Nguyễn Minh Tâm",
		plan: "Gói Chuyên nghiệp",
		joined: "17/07/2026",
		status: "active",
	},
	{
		name: "Nông sản Ba Miền",
		owner: "Trần Văn Bảy",
		plan: "Gói Cơ bản",
		joined: "16/07/2026",
		status: "trial",
	},
	{
		name: "Đại lý Phú Nông",
		owner: "Lê Thị Hoa",
		plan: "Gói Chuyên nghiệp",
		joined: "15/07/2026",
		status: "active",
	},
	{
		name: "Vật tư Đồng Xanh",
		owner: "Phạm Quốc Cường",
		plan: "Gói Cơ bản",
		joined: "14/07/2026",
		status: "overdue",
	},
	{
		name: "Cửa hàng Hạt Vàng",
		owner: "Võ Thị Mai",
		plan: "Gói Dùng thử",
		joined: "13/07/2026",
		status: "trial",
	},
];

const activities: {
	icon: LucideIcon;
	tone: string;
	text: string;
	time: string;
}[] = [
	{
		icon: UserPlus,
		tone: "#1e88e5",
		text: "Cửa hàng “Nông sản Ba Miền” vừa đăng ký dùng thử",
		time: "5 phút trước",
	},
	{
		icon: CircleCheck,
		tone: "#43a047",
		text: "“Đại lý Phú Nông” nâng cấp lên Gói Chuyên nghiệp",
		time: "38 phút trước",
	},
	{
		icon: CreditCard,
		tone: "#7e57c2",
		text: "Thu 2.400.000₫ phí gói từ “Vật tư Minh Tâm”",
		time: "1 giờ trước",
	},
	{
		icon: TriangleAlert,
		tone: "#f9a825",
		text: "“Vật tư Đồng Xanh” có hóa đơn quá hạn 5 ngày",
		time: "3 giờ trước",
	},
];

const statusBadge: Record<
	"active" | "trial" | "overdue",
	{ label: string; className: string }
> = {
	active: {
		label: "Đang hoạt động",
		className: "bg-[#e8f5e9] text-[#2e7d32]",
	},
	trial: { label: "Dùng thử", className: "bg-[#fff8e1] text-[#f57f17]" },
	overdue: { label: "Quá hạn", className: "bg-[#ffebee] text-[#c62828]" },
};

export default function AdminDashboardPage() {
	return (
		<div className="flex w-full flex-col gap-6">
			{/* Page header */}
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight text-foreground">
					Bảng điều khiển
				</h1>
				<p className="text-base text-[#616161]">
					Tổng quan toàn nền tảng NomoGreen · cập nhật hôm nay 17/07/2026.
				</p>
			</div>

			{/* KPI */}
			<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{kpis.map((kpi) => (
					<div
						key={kpi.label}
						className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card"
					>
						<div className="flex items-center justify-between">
							<span
								className="flex size-11 items-center justify-center rounded-[10px]"
								style={{ backgroundColor: kpi.tile }}
							>
								<kpi.icon className="size-6 text-white" aria-hidden />
							</span>
							<span className="flex items-center gap-1 rounded-full bg-[#e8f5e9] px-2.5 py-1 text-sm font-semibold text-[#2e7d32]">
								<TrendingUp className="size-4" aria-hidden />
								{kpi.delta}
							</span>
						</div>
						<div className="flex flex-col gap-0.5">
							<span className="text-2xl font-bold tracking-tight text-foreground">
								{kpi.value}
								{kpi.unit ? (
									<span className="ml-1 text-lg">{kpi.unit}</span>
								) : null}
							</span>
							<span className="text-sm text-[#616161]">{kpi.label}</span>
						</div>
					</div>
				))}
			</section>

			{/* Cảnh báo */}
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

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Biểu đồ doanh thu nền tảng */}
				<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card lg:col-span-2">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-foreground">
							Doanh thu nền tảng 6 tháng
						</h2>
						<span className="text-sm text-[#616161]">Đơn vị: triệu ₫</span>
					</div>
					<PlatformChart />
				</section>

				{/* Nhật ký hoạt động */}
				<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<h2 className="text-lg font-semibold text-foreground">
						Hoạt động gần đây
					</h2>
					<ul className="flex flex-col gap-4">
						{activities.map((item) => (
							<li key={item.text} className="flex gap-3">
								<span
									className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
									style={{ backgroundColor: item.tone }}
								>
									<item.icon className="size-4.5" aria-hidden />
								</span>
								<div className="flex min-w-0 flex-col">
									<p className="text-base leading-snug text-foreground">
										{item.text}
									</p>
									<span className="text-sm text-[#9e9e9e]">{item.time}</span>
								</div>
							</li>
						))}
					</ul>
				</section>
			</div>

			{/* Cửa hàng mới — bảng (desktop) + thẻ (mobile) */}
			<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-foreground">
						Cửa hàng mới đăng ký
					</h2>
					<Link
						href="/admin/tenants"
						className="text-base font-semibold text-primary transition-colors hover:text-[#43a047]"
					>
						Xem tất cả
					</Link>
				</div>

				{/* Desktop: bảng */}
				<div className="hidden overflow-hidden rounded-[12px] border border-border lg:block">
					<table className="w-full border-collapse text-left">
						<thead>
							<tr className="bg-[#f5f5f5] text-sm text-[#616161]">
								<th className="px-4 py-3 font-semibold">Cửa hàng</th>
								<th className="px-4 py-3 font-semibold">Chủ cửa hàng</th>
								<th className="px-4 py-3 font-semibold">Gói dịch vụ</th>
								<th className="px-4 py-3 font-semibold">Ngày tham gia</th>
								<th className="px-4 py-3 font-semibold">Trạng thái</th>
								<th className="w-12 px-4 py-3" aria-label="Hành động" />
							</tr>
						</thead>
						<tbody>
							{recentStores.map((store) => {
								const badge = statusBadge[store.status];
								return (
									<tr
										key={store.name}
										className="border-t border-border transition-colors hover:bg-accent"
									>
										<td className="px-4 py-4 text-base font-medium text-foreground">
											{store.name}
										</td>
										<td className="px-4 py-4 text-base text-[#616161]">
											{store.owner}
										</td>
										<td className="px-4 py-4 text-base text-[#616161]">
											{store.plan}
										</td>
										<td className="px-4 py-4 text-base text-[#616161]">
											{store.joined}
										</td>
										<td className="px-4 py-4">
											<span
												className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}
											>
												{badge.label}
											</span>
										</td>
										<td className="px-4 py-4">
											<button
												type="button"
												aria-label="Hành động"
												className="flex size-9 items-center justify-center rounded-[10px] text-[#616161] transition-colors hover:bg-[#eeeeee]"
											>
												<MoreVertical className="size-5" aria-hidden />
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{/* Mobile: danh sách thẻ */}
				<ul className="flex flex-col gap-3 lg:hidden">
					{recentStores.map((store) => {
						const badge = statusBadge[store.status];
						return (
							<li
								key={store.name}
								className="flex flex-col gap-2 rounded-[12px] border border-border p-4"
							>
								<div className="flex items-start justify-between gap-2">
									<span className="text-base font-semibold text-foreground">
										{store.name}
									</span>
									<span
										className={`inline-flex shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}
									>
										{badge.label}
									</span>
								</div>
								<span className="text-sm text-[#616161]">{store.owner}</span>
								<div className="flex items-center justify-between text-sm text-[#616161]">
									<span>{store.plan}</span>
									<span>{store.joined}</span>
								</div>
							</li>
						);
					})}
				</ul>
			</section>
		</div>
	);
}
