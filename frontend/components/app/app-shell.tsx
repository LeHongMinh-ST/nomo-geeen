"use client";

import type { LucideIcon } from "lucide-react";
import { Bell, House, Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useUserAuth } from "@/stores/user-auth-store";
import { MoreSheet } from "@/components/app/more-sheet";
import {
	bottomNavItems,
	navGroups,
	USER_TILE_ACTIVE,
	USER_TILE_GREEN,
} from "@/lib/navigation";

/**
 * Khung ứng dụng: sidebar (desktop) + topbar + bottom nav (mobile).
 * Điều hướng theo DESIGN.md §10. Icon tile dùng màu module accent (§3).
 */

function isActive(pathname: string, href: string) {
	return pathname === href;
}

function initials(name?: string) {
	const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
	return words.slice(-2).map((word) => word[0]).join("").toUpperCase() || "NT";
}

function roleLabel(role?: string) {
	return role === "OWNER" ? "Chủ cửa hàng" : role === "MANAGER" ? "Quản lý" : "Nhân viên";
}

export function AppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const [moreOpen, setMoreOpen] = useState(false);
	const user = useUserAuth((state) => state.user);
	const displayName = user?.fullName ?? "Minh Tâm";
	const displayRole = roleLabel(user?.role);

	return (
		<div className="min-h-[100dvh] bg-background">
			{/* Sidebar — chỉ desktop */}
			<aside className="fixed inset-y-0 left-0 hidden w-[260px] flex-col border-r border-border bg-sidebar lg:flex">
				<div className="flex flex-col items-start gap-2 border-b border-border px-5 py-4">
					<Image
						src="/images/logo.png"
						alt="NomoGreen"
						width={108}
						height={36}
						priority
						className="h-9 w-auto object-contain"
					/>
					<span className="flex min-w-0 flex-col leading-tight">
						<span className="truncate text-base font-bold tracking-tight text-foreground">
							{user?.tenantName ?? "Vật tư Minh Tâm"}
						</span>
						<span className="truncate text-sm text-[#9e9e9e]">
							Cửa hàng
						</span>
					</span>
				</div>

				<nav className="flex-1 overflow-y-auto px-3 pb-6">
					{/* Trang chủ — mục nổi bật đầu tiên */}
					<SidebarLink
						item={{
							label: "Trang chủ",
							href: "/",
							icon: House,
							tile: USER_TILE_GREEN,
						}}
						active={isActive(pathname, "/")}
						className="mb-2 mt-3"
					/>

					{navGroups.map((group) => (
						<div key={group.heading} className="mb-5">
							<p className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-[#9e9e9e]">
								{group.heading}
							</p>
							<ul className="flex flex-col gap-1">
								{group.items.map((item) => (
									<li key={item.href}>
										<SidebarLink
											item={item}
											active={isActive(pathname, item.href)}
										/>
									</li>
								))}
							</ul>
						</div>
					))}
				</nav>
			</aside>

			{/* Cột nội dung */}
			<div className="flex min-h-[100dvh] flex-col lg:pl-[260px]">
				{/* Topbar */}
				<header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
					{/* Logo + tên cửa hàng — mobile */}
					<Link
						href="/"
						className="flex items-center gap-2.5 lg:hidden"
					>
						<span className="flex size-10 items-center justify-center rounded-full bg-accent text-base font-semibold text-accent-foreground">
							{initials(user?.fullName)}
						</span>
						<span className="flex flex-col leading-tight">
							<span className="text-base font-bold tracking-tight text-foreground">
								{displayName}
							</span>
							<span className="text-xs text-[#9e9e9e]">{displayRole}</span>
						</span>
					</Link>

					{/* Tìm kiếm — desktop */}
					<div className="relative hidden max-w-sm flex-1 lg:block">
						<Search
							className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]"
							aria-hidden
						/>
						<input
							type="search"
							placeholder="Tìm sản phẩm, khách hàng..."
							className="h-11 w-full rounded-[10px] border border-border bg-white pl-10 pr-4 text-base text-foreground placeholder:text-[#9e9e9e] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
						/>
					</div>

					<div className="ml-auto flex items-center gap-2 lg:gap-3">
						{/* Chuông thông báo */}
						<button
							type="button"
							aria-label="Thông báo"
							className="relative flex size-11 items-center justify-center rounded-[10px] text-[#616161] transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
						>
							<Bell className="size-5.5" aria-hidden />
							<span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-destructive" />
						</button>

						{/* Avatar + vai trò (desktop) */}
						<Link
							href="/thiet-lap"
							className="hidden items-center gap-2.5 rounded-[10px] pl-1 pr-2 transition-colors duration-200 ease-out hover:bg-[#f5f5f5] lg:flex"
						>
							<span className="flex size-10 items-center justify-center rounded-full bg-accent text-base font-semibold text-accent-foreground">
								{initials(user?.fullName)}
							</span>
							<div className="flex flex-col leading-tight">
								<span className="text-sm font-semibold text-foreground">
									{displayName}
								</span>
								<span className="text-xs text-[#9e9e9e]">{displayRole}</span>
							</div>
						</Link>
					</div>
				</header>

				{/* Nội dung trang — khung chung max-w-6xl, căn giữa cột nội dung */}
				<main className="flex-1 px-4 pb-28 pt-5 lg:px-6 lg:pb-10 lg:pt-6">
					<div className="mx-auto w-full max-w-6xl">{children}</div>
				</main>
			</div>

			{/* Bottom nav — chỉ mobile */}
			<nav className="pb-safe fixed inset-x-0 bottom-0 z-40 grid h-[68px] grid-cols-5 items-center border-t border-border bg-white [height:calc(68px+env(safe-area-inset-bottom,0px))] lg:hidden">
				{bottomNavItems.slice(0, 2).map((item) => (
					<BottomLink
						key={item.href}
						item={item}
						active={isActive(pathname, item.href)}
					/>
				))}

				{/* Nút + Bán nổi ở giữa */}
				<div className="flex items-center justify-center">
					<Link
						href="/ban-nhanh"
						className="flex size-14 -translate-y-3 select-none flex-col items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_20px_rgba(76,175,80,0.4)] transition-transform duration-150 ease-out active:scale-90 active:bg-[#3f8530]"
						aria-label="Bán nhanh"
					>
						<Plus className="size-7" aria-hidden />
					</Link>
				</div>

				{bottomNavItems.slice(2).map((item) => {
					// Mục "Khác" mở Sheet thay vì điều hướng.
					if (item.href === "/khac") {
						const activeColor = (
							USER_TILE_ACTIVE[item.tile] ?? USER_TILE_ACTIVE[USER_TILE_GREEN]
						).fg;
						return (
							<button
								key={item.href}
								type="button"
								onClick={() => setMoreOpen(true)}
								className="group flex h-full select-none flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150 ease-out active:bg-[#f5f5f5]"
								style={{ color: moreOpen ? activeColor : "#9e9e9e" }}
							>
								<item.icon
									className="size-6 transition-transform duration-150 ease-out group-active:scale-90"
									aria-hidden
								/>
								{item.label}
							</button>
						);
					}
					return (
						<BottomLink
							key={item.href}
							item={item}
							active={isActive(pathname, item.href)}
						/>
					);
				})}
			</nav>

			<MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
		</div>
	);
}

function SidebarLink({
	item,
	active,
	className = "",
}: {
	item: { label: string; href: string; icon: LucideIcon; tile: string };
	active: boolean;
	className?: string;
}) {
	const activeColor = USER_TILE_ACTIVE[item.tile] ?? USER_TILE_ACTIVE[USER_TILE_GREEN];
	return (
		<Link
			href={item.href}
			className={`relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-base font-medium transition-colors duration-200 ease-out ${
				active ? "" : "text-[#616161] hover:bg-[#f5f5f5]"
			} ${className}`}
			style={
				active
					? { backgroundColor: activeColor.bg, color: activeColor.fg }
					: undefined
			}
		>
			{active ? (
				<span
					aria-hidden
					className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full"
					style={{ backgroundColor: activeColor.fg }}
				/>
			) : null}
			<span
				className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
				style={{ backgroundColor: item.tile }}
			>
				<item.icon className="size-5 text-white" aria-hidden />
			</span>
			{item.label}
		</Link>
	);
}

function BottomLink({
	item,
	active,
}: {
	item: (typeof bottomNavItems)[number];
	active: boolean;
}) {
	const activeColor = (
		USER_TILE_ACTIVE[item.tile] ?? USER_TILE_ACTIVE[USER_TILE_GREEN]
	).fg;
	return (
		<Link
			href={item.href}
			className="group flex h-full select-none flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150 ease-out active:bg-[#f5f5f5]"
			style={{ color: active ? activeColor : "#9e9e9e" }}
		>
			<item.icon
				className="size-6 transition-transform duration-150 ease-out group-active:scale-90"
				aria-hidden
			/>
			{item.label}
		</Link>
	);
}
