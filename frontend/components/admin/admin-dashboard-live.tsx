"use client";

import {
	ArrowUpRight,
	Building2,
	CreditCard,
	ServerCog,
	TrendingUp,
	TriangleAlert,
	Users,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardActivityPreview } from "@/components/admin/dashboard-activity-preview";
import {
	type AdminDashboardSummary,
	getAdminDashboardSummary,
} from "@/lib/admin-api/dashboard";
import { formatDate, formatVND } from "@/lib/format";
import { useAdminAuth } from "@/stores/admin-auth-store";

const statusBadge = {
	active: { label: "Đang hoạt động", className: "bg-[#e8f5e9] text-[#2e7d32]" },
	trial: { label: "Dùng thử", className: "bg-[#fff8e1] text-[#f57f17]" },
	overdue: { label: "Quá hạn", className: "bg-[#ffebee] text-[#c62828]" },
} as const;

export function AdminDashboardLive() {
	const accessToken = useAdminAuth((state) => state.accessToken);
	const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		if (!accessToken) return;
		let cancelled = false;
		void getAdminDashboardSummary(accessToken)
			.then((result) => {
				if (!cancelled) setSummary(result);
			})
			.catch(() => {
				if (!cancelled) setError(true);
			});
		return () => {
			cancelled = true;
		};
	}, [accessToken]);

	if (error)
		return (
			<p
				role="alert"
				className="rounded-[16px] border border-[#ffcdd2] bg-[#ffebee] p-5 text-[#c62828]"
			>
				Không thể tải dữ liệu dashboard.
			</p>
		);
	if (!summary)
		return (
			<p
				role="status"
				className="rounded-[16px] border border-border bg-card p-5 text-[#616161]"
			>
				Đang tải dữ liệu dashboard...
			</p>
		);

	const kpis = [
		{
			label: "Cửa hàng đang hoạt động",
			value: summary.kpis.activeStores.toLocaleString("vi-VN"),
			delta: "Dữ liệu thật",
			icon: Building2,
			tile: "#43a047",
		},
		{
			label: "Người dùng",
			value: summary.kpis.users.toLocaleString("vi-VN"),
			delta: "Dữ liệu thật",
			icon: Users,
			tile: "#1e88e5",
		},
		{
			label: "Doanh thu nền tảng tháng này",
			value: formatVND(Number(summary.kpis.revenueThisMonth)),
			unit: "₫",
			delta: "Dữ liệu thật",
			icon: Wallet,
			tile: "#7e57c2",
		},
		{
			label: "Giao dịch hôm nay",
			value: summary.kpis.transactionsToday.toLocaleString("vi-VN"),
			delta: "Dữ liệu thật",
			icon: CreditCard,
			tile: "#f4511e",
		},
	];
	const alerts = [
		{
			icon: TriangleAlert,
			label: "Gói sắp hết hạn",
			count: summary.alerts.expiringSubscriptions,
			href: "/admin/goi-dich-vu",
			tone: "warning",
		},
		{
			icon: Wallet,
			label: "Hóa đơn quá hạn",
			count: summary.alerts.overdueInvoices,
			href: "/admin/transactions",
			tone: "error",
		},
		{
			icon: ServerCog,
			label: "Cảnh báo hệ thống",
			count: summary.alerts.systemWarnings,
			href: "/admin/status",
			tone: "error",
		},
	];
	const maxRevenue = Math.max(
		...summary.revenueByMonth.map((item) => Number(item.value)),
		1,
	);

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight text-foreground">
					Bảng điều khiển
				</h1>
				<p className="text-base text-[#616161]">
					Tổng quan toàn nền tảng NomoGreen · cập nhật{" "}
					{formatDate(summary.updatedAt)}.
				</p>
			</div>
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
								{kpi.unit && <span className="ml-1 text-lg">{kpi.unit}</span>}
							</span>
							<span className="text-sm text-[#616161]">{kpi.label}</span>
						</div>
					</div>
				))}
			</section>
			<section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{alerts.map((alert) => {
					const tone =
						alert.tone === "error"
							? "bg-[#ffebee] text-[#c62828]"
							: "bg-[#fff8e1] text-[#f57f17]";
					return (
						<Link
							key={alert.label}
							href={alert.href}
							className="group flex items-center gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card"
						>
							<span
								className={`flex size-12 shrink-0 items-center justify-center rounded-[10px] ${tone}`}
							>
								<alert.icon className="size-6" aria-hidden />
							</span>
							<div className="flex flex-col">
								<span className="text-2xl font-bold text-foreground">
									{alert.count.toLocaleString("vi-VN")}
								</span>
								<span className="text-sm text-[#616161]">{alert.label}</span>
							</div>
							<ArrowUpRight className="ml-auto size-5 text-[#9e9e9e]" />
						</Link>
					);
				})}
			</section>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card lg:col-span-2">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-foreground">
							Doanh thu nền tảng 6 tháng
						</h2>
						<span className="text-sm text-[#616161]">Đơn vị: triệu ₫</span>
					</div>
					<div className="flex h-48 items-end justify-between gap-2">
						{summary.revenueByMonth.map((month) => (
							<div
								key={month.label}
								className="flex h-full flex-1 flex-col items-center justify-end gap-2"
							>
								<span className="text-xs font-semibold text-foreground">
									{Math.round(Number(month.value) / 1_000_000)}tr
								</span>
								<span
									className="w-full rounded-t-[6px] bg-primary"
									style={{
										height: `${Math.max(4, Math.round((Number(month.value) / maxRevenue) * 100))}%`,
									}}
								/>
								<span className="text-sm text-[#616161]">{month.label}</span>
							</div>
						))}
					</div>
				</section>
				<DashboardActivityPreview />
			</div>
			<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-foreground">
						Cửa hàng mới đăng ký
					</h2>
					<Link
						href="/admin/tenants"
						className="text-base font-semibold text-primary"
					>
						Xem tất cả
					</Link>
				</div>
				<div className="overflow-hidden rounded-[12px] border border-border">
					<table className="w-full border-collapse text-left">
						<thead>
							<tr className="bg-[#f5f5f5] text-sm text-[#616161]">
								<th className="px-4 py-3">Cửa hàng</th>
								<th className="px-4 py-3">Chủ cửa hàng</th>
								<th className="px-4 py-3">Gói dịch vụ</th>
								<th className="px-4 py-3">Ngày tham gia</th>
								<th className="px-4 py-3">Trạng thái</th>
							</tr>
						</thead>
						<tbody>
							{summary.recentStores.map((store) => {
								const badge = statusBadge[store.status];
								return (
									<tr key={store.id} className="border-t border-border">
										<td className="px-4 py-4 font-medium text-foreground">
											{store.name}
										</td>
										<td className="px-4 py-4 text-[#616161]">{store.owner}</td>
										<td className="px-4 py-4 text-[#616161]">{store.plan}</td>
										<td className="px-4 py-4 text-[#616161]">
											{formatDate(store.joined)}
										</td>
										<td className="px-4 py-4">
											<span
												className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}
											>
												{badge.label}
											</span>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}
