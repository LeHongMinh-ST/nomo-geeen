import type { LucideIcon } from "lucide-react";
import {
	Activity,
	Building2,
	CreditCard,
	Layers3,
	LayoutDashboard,
	ScrollText,
	Settings,
	Users,
} from "lucide-react";

/**
 * Điều hướng khu quản trị nội bộ (admin) — quản lý nền tảng SaaS NomoGreen.
 * Tách biệt với app chủ cửa hàng (lib/navigation.ts).
 * Màu tile theo DESIGN.md §3 "Module Accent" — chỉ dùng cho icon tile.
 *
 * R7.8: `permission` is the admin.* permission code that gates this nav item.
 * SUPER_ADMIN (R4.2) bypasses all permission checks. Items without
 * `permission` (legacy / always-visible) are shown to everyone authenticated.
 */

export type AdminNavItem = {
	label: string;
	href: string;
	icon: LucideIcon;
	/** Màu tile module accent (chỉ icon tile). */
	tile: string;
	/** R7.8: admin.* permission code required to see this item. */
	permission?: string;
};

export type AdminNavGroup = {
	heading: string;
	items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
	{
		heading: "Tổng quan",
		items: [
			{
				label: "Bảng điều khiển",
				href: "/admin",
				icon: LayoutDashboard,
				tile: "#546e7a",
			},
		],
	},
	{
		heading: "Quản lý",
		items: [
			{
				label: "Cửa hàng",
				href: "/admin/tenants",
				icon: Building2,
				tile: "#43a047",
				permission: "admin.tenant:view",
			},
			{
				label: "Gói dịch vụ",
				href: "/admin/plans",
				icon: Layers3,
				tile: "#7e57c2",
				permission: "admin.plan:view",
			},
		],
	},
	{
		heading: "Vận hành",
		items: [
			{
				label: "Giao dịch",
				href: "/admin/transactions",
				icon: CreditCard,
				tile: "#f4511e",
				permission: "admin.billing:view",
			},
			{
				label: "Nhật ký hệ thống",
				href: "/admin/audit-log",
				icon: ScrollText,
				tile: "#3949ab",
				permission: "admin.audit:view",
			},
		],
	},
	{
		heading: "Hệ thống",
		items: [
			{
				label: "Tài khoản",
				href: "/admin/admin-users",
				icon: Users,
				tile: "#1e88e5",
				permission: "admin.user:view",
			},
			{
				label: "Tình trạng",
				href: "/admin/status",
				icon: Activity,
				tile: "#26a69a",
			},
			{
				label: "Thiết lập",
				href: "/admin/settings",
				icon: Settings,
				tile: "#9e9e9e",
			},
		],
	},
];
