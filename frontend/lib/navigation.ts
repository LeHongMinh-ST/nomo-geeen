import type { LucideIcon } from "lucide-react";
import {
	BarChart3,
	HandCoins,
	House,
	PackagePlus,
	Package,
	Settings,
	ShoppingCart,
	Truck,
	Users,
	Warehouse,
} from "lucide-react";

/**
 * Cấu hình điều hướng dùng chung cho sidebar (desktop) và bottom nav (mobile).
 * Màu tile theo DESIGN.md §3 "Module Accent" — chỉ dùng cho icon tile, không cho nút/text/badge.
 */

export type NavItem = {
	label: string;
	href: string;
	icon: LucideIcon;
	/** Màu tile module accent (chỉ icon tile). */
	tile: string;
};

export type NavGroup = {
	heading: string;
	items: NavItem[];
};

export const navGroups: NavGroup[] = [
	{
		heading: "Bán hàng",
		items: [
			{
				label: "Bán nhanh",
				href: "/ban-nhanh",
				icon: ShoppingCart,
				tile: "#43a047",
			},
			{
				label: "Đơn bán hàng",
				href: "/don-ban-hang",
				icon: Package,
				tile: "#43a047",
			},
		],
	},
	{
		heading: "Kho & Hàng hóa",
		items: [
			{ label: "Sản phẩm", href: "/san-pham", icon: Package, tile: "#9e9d24" },
			{
				label: "Nhập hàng",
				href: "/nhap-hang",
				icon: PackagePlus,
				tile: "#26a69a",
			},
			{ label: "Tồn kho", href: "/ton-kho", icon: Warehouse, tile: "#3949ab" },
		],
	},
	{
		heading: "Đối tác",
		items: [
			{ label: "Khách hàng", href: "/khach-hang", icon: Users, tile: "#1e88e5" },
			{
				label: "Nhà cung cấp",
				href: "/nha-cung-cap",
				icon: Truck,
				tile: "#7e57c2",
			},
			{ label: "Công nợ", href: "/cong-no", icon: HandCoins, tile: "#f4511e" },
		],
	},
	{
		heading: "Khác",
		items: [
			{ label: "Báo cáo", href: "/bao-cao", icon: BarChart3, tile: "#546e7a" },
			{ label: "Thiết lập", href: "/thiet-lap", icon: Settings, tile: "#9e9e9e" },
		],
	},
];

/** 4 mục điều hướng + nút "+ Bán" ở giữa (DESIGN.md §10.1). */
export const bottomNavItems: NavItem[] = [
	{ label: "Trang chủ", href: "/trang-chu", icon: House, tile: "#43a047" },
	{
		label: "Bán hàng",
		href: "/don-ban-hang",
		icon: Package,
		tile: "#43a047",
	},
	{ label: "Công nợ", href: "/cong-no", icon: HandCoins, tile: "#f4511e" },
	{ label: "Khác", href: "/khac", icon: Settings, tile: "#546e7a" },
];
