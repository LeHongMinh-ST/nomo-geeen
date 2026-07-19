import type { LucideIcon } from "lucide-react";
import {
	BarChart3,
	BookOpen,
	HandCoins,
	House,
	Package,
	PackagePlus,
	Settings,
	ShoppingCart,
	Truck,
	Users,
	Warehouse,
} from "lucide-react";

/**
 * Điều hướng app chủ cửa hàng.
 * Icon tile = 2 màu logo: Green (#5CAD45) + Blue (#1A6FA8) — xen kẽ theo nhóm nghiệp vụ.
 */

/** Brand Green — bán hàng, kho, hành động chính. */
export const USER_TILE_GREEN = "#5cad45";
/** Brand Blue (NOMO) — đối tác, báo cáo, thiết lập. */
export const USER_TILE_BLUE = "#1a6fa8";
/** Alias mặc định = green (nút / tile hành động). */
export const USER_TILE = USER_TILE_GREEN;

/**
 * Nền + chữ khi mục điều hướng active — ăn theo màu tile của chính mục đó
 * (không cố định xanh lá) để tránh lệch màu giữa nền active và icon tile.
 * Blue dùng lại đúng cặp Info Soft đã có sẵn ở badge (vd. debt-list.tsx).
 */
export const USER_TILE_ACTIVE: Record<string, { bg: string; fg: string }> = {
	[USER_TILE_GREEN]: { bg: "#f3f8f1", fg: "#3f8530" },
	[USER_TILE_BLUE]: { bg: "#e3f2fd", fg: "#1565c0" },
};

export type NavItem = {
	label: string;
	href: string;
	icon: LucideIcon;
	/** Màu tile icon (green hoặc blue logo). */
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
				tile: USER_TILE_GREEN,
			},
			{
				label: "Đơn bán hàng",
				href: "/don-ban-hang",
				icon: Package,
				tile: USER_TILE_GREEN,
			},
			{
				label: "Sổ tay",
				href: "/so-tay",
				icon: BookOpen,
				tile: USER_TILE_GREEN,
			},
		],
	},
	{
		heading: "Kho & Hàng hóa",
		items: [
			{
				label: "Sản phẩm",
				href: "/san-pham",
				icon: Package,
				tile: USER_TILE_GREEN,
			},
			{
				label: "Nhập hàng",
				href: "/nhap-hang",
				icon: PackagePlus,
				tile: USER_TILE_GREEN,
			},
			{
				label: "Tồn kho",
				href: "/ton-kho",
				icon: Warehouse,
				tile: USER_TILE_GREEN,
			},
		],
	},
	{
		heading: "Đối tác",
		items: [
			{
				label: "Khách hàng",
				href: "/khach-hang",
				icon: Users,
				tile: USER_TILE_BLUE,
			},
			{
				label: "Nhà cung cấp",
				href: "/nha-cung-cap",
				icon: Truck,
				tile: USER_TILE_BLUE,
			},
			{
				label: "Công nợ",
				href: "/cong-no",
				icon: HandCoins,
				tile: USER_TILE_BLUE,
			},
		],
	},
	{
		heading: "Khác",
		items: [
			{
				label: "Báo cáo",
				href: "/bao-cao",
				icon: BarChart3,
				tile: USER_TILE_BLUE,
			},
			{
				label: "Thiết lập",
				href: "/thiet-lap",
				icon: Settings,
				tile: USER_TILE_BLUE,
			},
		],
	},
];

/** 4 mục điều hướng + nút "+ Bán" ở giữa (DESIGN.md §10.1). */
export const bottomNavItems: NavItem[] = [
	{ label: "Trang chủ", href: "/", icon: House, tile: USER_TILE_GREEN },
	{
		label: "Đơn hàng",
		href: "/don-ban-hang",
		icon: Package,
		tile: USER_TILE_GREEN,
	},
	{
		label: "Sổ tay",
		href: "/so-tay",
		icon: BookOpen,
		tile: USER_TILE_GREEN,
	},
	{ label: "Khác", href: "/khac", icon: Settings, tile: USER_TILE_BLUE },
];
