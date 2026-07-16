"use client";

import { Bell, Menu, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { adminNavGroups } from "@/lib/admin-navigation";

/**
 * Khung khu quản trị nội bộ: sidebar (desktop) + drawer (mobile) + topbar.
 * Identity Slate (#546e7a) để phân biệt rõ với app chủ cửa hàng (Brand Green).
 * Điều hướng theo DESIGN.md §10.2/§10.3; icon tile màu module accent (§3).
 */

const ADMIN_SLATE = "#546e7a";

function isActive(pathname: string, href: string) {
	if (href === "/admin") return pathname === "/admin";
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const [drawerOpen, setDrawerOpen] = useState(false);

	return (
		<div className="min-h-[100dvh] bg-background">
			{/* Sidebar — desktop cố định */}
			<aside className="fixed inset-y-0 left-0 hidden w-[260px] flex-col border-r border-border bg-sidebar lg:flex">
				<SidebarBrand />
				<SidebarNav pathname={pathname} />
				<SidebarFooter />
			</aside>

			{/* Drawer — mobile off-canvas */}
			{drawerOpen ? (
				<div className="fixed inset-0 z-50 lg:hidden">
					<button
						type="button"
						aria-label="Đóng menu"
						onClick={() => setDrawerOpen(false)}
						className="absolute inset-0 bg-black/40"
					/>
					<aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-border bg-sidebar">
						<div className="flex items-center justify-between pr-3">
							<SidebarBrand />
							<button
								type="button"
								aria-label="Đóng menu"
								onClick={() => setDrawerOpen(false)}
								className="flex size-10 items-center justify-center rounded-[10px] text-[#616161] transition-colors hover:bg-[#f5f5f5]"
							>
								<X className="size-5" aria-hidden />
							</button>
						</div>
						<SidebarNav
							pathname={pathname}
							onNavigate={() => setDrawerOpen(false)}
						/>
						<SidebarFooter />
					</aside>
				</div>
			) : null}

			{/* Cột nội dung */}
			<div className="flex min-h-[100dvh] flex-col lg:pl-[260px]">
				{/* Topbar */}
				<header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
					{/* Toggle drawer — mobile */}
					<button
						type="button"
						aria-label="Mở menu"
						onClick={() => setDrawerOpen(true)}
						className="flex size-11 items-center justify-center rounded-[10px] text-[#616161] transition-colors hover:bg-[#f5f5f5] lg:hidden"
					>
						<Menu className="size-6" aria-hidden />
					</button>

					{/* Nhãn khu vực — mobile */}
					<span className="flex items-center gap-2 lg:hidden">
						<Image
							src="/images/logo2.png"
							alt="NomoGreen"
							width={36}
							height={36}
							className="size-9 rounded-[10px] object-contain"
						/>
						<span className="text-base font-bold tracking-tight text-foreground">
							Quản trị
						</span>
					</span>

					{/* Tìm kiếm — desktop */}
					<div className="relative hidden max-w-sm flex-1 lg:block">
						<Search
							className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]"
							aria-hidden
						/>
						<input
							type="search"
							placeholder="Tìm cửa hàng, người dùng, giao dịch..."
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

						{/* Avatar + vai trò */}
						<div className="flex items-center gap-2.5 pl-1">
							<span
								className="flex size-10 items-center justify-center rounded-full text-base font-semibold text-white"
								style={{ backgroundColor: ADMIN_SLATE }}
							>
								QT
							</span>
							<div className="hidden flex-col leading-tight sm:flex">
								<span className="text-sm font-semibold text-foreground">
									Quản trị viên
								</span>
								<span className="text-xs text-[#9e9e9e]">Toàn quyền</span>
							</div>
						</div>
					</div>
				</header>

				{/* Nội dung trang */}
				<main className="flex-1 px-4 pb-10 pt-5 lg:px-6 lg:pt-6">
					{children}
				</main>
			</div>
		</div>
	);
}

function SidebarBrand() {
	return (
		<div className="flex h-16 items-center gap-3 px-5">
			<Image
				src="/images/logo2.png"
				alt="NomoGreen"
				width={40}
				height={40}
				className="size-10 shrink-0 rounded-[10px] object-contain"
				priority
			/>
			<span className="flex min-w-0 flex-col leading-tight">
				<span className="truncate text-lg font-bold tracking-tight text-foreground">
					NomoGreen
				</span>
				<span className="truncate text-sm text-[#9e9e9e]">Khu quản trị</span>
			</span>
		</div>
	);
}

function SidebarNav({
	pathname,
	onNavigate,
}: {
	pathname: string;
	onNavigate?: () => void;
}) {
	return (
		<nav className="flex-1 overflow-y-auto px-3 pb-6">
			{adminNavGroups.map((group) => (
				<div key={group.heading} className="mb-5">
					<p className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-[#9e9e9e]">
						{group.heading}
					</p>
					<ul className="flex flex-col gap-1">
						{group.items.map((item) => {
							const active = isActive(pathname, item.href);
							return (
								<li key={item.href}>
									<Link
										href={item.href}
										onClick={onNavigate}
										className={`relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-base font-medium transition-colors duration-200 ease-out ${
											active
												? "bg-accent text-accent-foreground"
												: "text-[#616161] hover:bg-[#f5f5f5]"
										}`}
									>
										{active ? (
											<span
												aria-hidden
												className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary"
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
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</nav>
	);
}

function SidebarFooter() {
	return (
		<div className="border-t border-border px-5 py-4">
			<Link
				href="/dang-nhap"
				className="text-sm font-medium text-[#616161] transition-colors hover:text-foreground"
			>
				← Về khu cửa hàng
			</Link>
		</div>
	);
}
