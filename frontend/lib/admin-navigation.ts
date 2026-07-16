import type { LucideIcon } from "lucide-react";
import {
	Activity,
	Building2,
	CreditCard,
	LayoutDashboard,
	Package,
	ScrollText,
	Settings,
	Users,
} from "lucide-react";

/**
 * Điều hướng khu quản trị nội bộ (admin) — quản lý nền tảng SaaS NomoGreen.
 * Tách biệt với app chủ cửa hàng (lib/navigation.ts).
 * Màu tile theo DESIGN.md §3 "Module Accent" — chỉ dùng cho icon tile.
 */

export type AdminNavItem = {
	label: string;
	href: string;
	icon: LucideIcon;
	/** Màu tile module accent (chỉ icon tile). */
	tile: string;
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
				href: "/admin/cua-hang",
				icon: Building2,
				tile: "#43a047",
			},
			{
				label: "Người dùng",
				href: "/admin/nguoi-dung",
				icon: Users,
				tile: "#1e88e5",
			},
			{
				label: "Gói dịch vụ",
				href: "/admin/goi-dich-vu",
				icon: Package,
				tile: "#7e57c2",
			},
		],
	},
	{
		heading: "Vận hành",
		items: [
			{
				label: "Giao dịch",
				href: "/admin/giao-dich",
				icon: CreditCard,
				tile: "#f4511e",
			},
			{
				label: "Nhật ký hệ thống",
				href: "/admin/nhat-ky",
				icon: ScrollText,
				tile: "#3949ab",
			},
		],
	},
	{
		heading: "Hệ thống",
		items: [
			{
				label: "Tình trạng",
				href: "/admin/tinh-trang",
				icon: Activity,
				tile: "#26a69a",
			},
			{
				label: "Thiết lập",
				href: "/admin/thiet-lap",
				icon: Settings,
				tile: "#9e9e9e",
			},
		],
	},
];
