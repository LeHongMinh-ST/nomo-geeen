"use client";

import {
	Bell,
	ChevronDown,
	Loader2,
	LogOut,
	Menu,
	Search,
	X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-api/fetch";
import {
	type AdminNotificationView,
	listAdminNotifications,
	markAdminNotificationRead,
	markAllAdminNotificationsRead,
	unreadAdminNotificationsCount,
} from "@/lib/admin-api/notifications";
import { adminNavGroups } from "@/lib/admin-navigation";
import { SUPER_ADMIN_ROLE_CODE } from "@/lib/admin-rbac";
import { useAdminAuth } from "@/stores/admin-auth-store";

const ADMIN_SLATE = "#546e7a";

type SearchResult = {
	type: "tenant" | "admin-user" | "invoice";
	id: string;
	label: string;
	subLabel?: string;
	href: string;
};

function isActive(pathname: string, href: string) {
	if (href === "/admin") return pathname === "/admin";
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const admin = useAdminAuth((s) => s.admin);
	const logout = useAdminAuth((s) => s.logout);
	const accessToken = useAdminAuth((s) => s.accessToken);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Search state
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchLoading, setSearchLoading] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const initials = admin?.fullName
		? admin.fullName
				.split(/\s+/)
				.map((part) => part[0])
				.slice(0, 2)
				.join("")
				.toUpperCase()
		: "AD";

	useEffect(() => {
		if (!menuOpen) return;
		function handlePointerDown(event: PointerEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		}
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") setMenuOpen(false);
		}
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [menuOpen]);

	// Search effect with debounce
	useEffect(() => {
		if (!searchQuery.trim() || searchQuery.length < 2) {
			setSearchResults([]);
			setSearchOpen(false);
			return;
		}
		if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		searchDebounceRef.current = setTimeout(async () => {
			setSearchLoading(true);
			try {
				if (accessToken) {
					const results = await adminFetch<SearchResult[]>(
						`/admin/search?q=${encodeURIComponent(searchQuery)}`,
						{
							accessToken,
						},
					);
					setSearchResults(results);
					setSearchOpen(results.length > 0);
				}
			} catch {
				setSearchResults([]);
				setSearchOpen(false);
			} finally {
				setSearchLoading(false);
			}
		}, 250);
		return () => {
			if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
		};
	}, [searchQuery, accessToken]);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchQuery(value);
	};

	const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Escape") {
			setSearchQuery("");
			setSearchResults([]);
			setSearchOpen(false);
			searchInputRef.current?.blur();
		} else if (e.key === "Enter" && searchResults.length > 0) {
			router.push(searchResults[0].href);
			setSearchQuery("");
			setSearchResults([]);
			setSearchOpen(false);
		}
	};

	const handleSearchBlur = () => {
		// Delay to allow click on result
		setTimeout(() => setSearchOpen(false), 200);
	};

	const handleResultClick = (href: string) => {
		router.push(href);
		setSearchQuery("");
		setSearchResults([]);
		setSearchOpen(false);
	};

	// Notifications state
	const [notifications, setNotifications] = useState<AdminNotificationView[]>(
		[],
	);
	const [unreadCount, setUnreadCount] = useState(0);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [notificationsLoading, setNotificationsLoading] = useState(false);
	const notificationsDropdownRef = useRef<HTMLDivElement>(null);

	// Load notifications on mount and when accessToken changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: notification loaders are memoized for the current access token.
	useEffect(() => {
		if (!accessToken) return;
		loadNotifications();
		loadUnreadCount();
	}, [accessToken]);

	const loadNotifications = useCallback(async () => {
		if (!accessToken) return;
		setNotificationsLoading(true);
		try {
			const result = await listAdminNotifications(accessToken, {
				pageSize: 20,
			});
			setNotifications(result.items);
		} catch {
			setNotifications([]);
		} finally {
			setNotificationsLoading(false);
		}
	}, [accessToken]);

	const loadUnreadCount = useCallback(async () => {
		if (!accessToken) return;
		try {
			const result = await unreadAdminNotificationsCount(accessToken);
			setUnreadCount(result.count);
		} catch {
			setUnreadCount(0);
		}
	}, [accessToken]);

	const handleMarkRead = useCallback(
		async (notificationId: string) => {
			if (!accessToken) return;
			try {
				await markAdminNotificationRead(accessToken, notificationId);
				await loadNotifications();
				await loadUnreadCount();
			} catch {
				// ignore
			}
		},
		[accessToken, loadNotifications, loadUnreadCount],
	);

	const handleMarkAllRead = useCallback(async () => {
		if (!accessToken) return;
		try {
			await markAllAdminNotificationsRead(accessToken);
			await loadNotifications();
			await loadUnreadCount();
		} catch {
			// ignore
		}
	}, [accessToken, loadNotifications, loadUnreadCount]);

	// Close dropdowns on outside click
	useEffect(() => {
		if (!notificationsOpen) return;
		function handlePointerDown(event: PointerEvent) {
			if (
				notificationsDropdownRef.current &&
				!notificationsDropdownRef.current.contains(event.target as Node)
			) {
				setNotificationsOpen(false);
			}
		}
		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [notificationsOpen]);

	async function handleLogout() {
		setMenuOpen(false);
		await logout();
		router.push("/admin/login");
	}

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
							ref={searchInputRef}
							type="search"
							value={searchQuery}
							onChange={handleSearchChange}
							onKeyDown={handleSearchKeyDown}
							onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
							onBlur={handleSearchBlur}
							placeholder="Tìm cửa hàng, người dùng, giao dịch..."
							className="h-11 w-full rounded-[10px] border border-border bg-white pl-10 pr-4 text-base text-foreground placeholder:text-[#9e9e9e] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
						/>
						{searchLoading && (
							<div className="absolute right-3 top-1/2 -translate-y-1/2">
								<Search
									className="size-4.5 animate-spin text-[#9e9e9e]"
									aria-hidden
								/>
							</div>
						)}
						{searchOpen && searchResults.length > 0 && (
							<div
								role="listbox"
								className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-[10px] border border-border bg-card shadow-lg"
							>
								{searchResults.map((result) => (
									<button
										key={result.id}
										type="button"
										role="option"
										onClick={() => handleResultClick(result.href)}
										className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent focus:outline-none focus:bg-accent"
									>
										<span className="flex min-w-0 flex-col">
											<span className="truncate font-medium text-foreground">
												{result.label}
											</span>
											{result.subLabel && (
												<span className="truncate text-xs text-muted-foreground">
													{result.subLabel}
												</span>
											)}
										</span>
										<span className="ml-auto text-xs text-muted-foreground capitalize">
											{result.type}
										</span>
									</button>
								))}
							</div>
						)}
					</div>

					<div className="ml-auto flex items-center gap-2 lg:gap-3">
						{/* Chuông thông báo — real admin notifications */}
						<div className="relative" ref={notificationsDropdownRef}>
							<button
								type="button"
								aria-label="Thông báo"
								onClick={() => setNotificationsOpen((open) => !open)}
								aria-expanded={notificationsOpen}
								aria-haspopup="menu"
								className="relative flex size-11 items-center justify-center rounded-[10px] text-[#616161] transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
							>
								<Bell className="size-5.5" aria-hidden />
								{unreadCount > 0 && (
									<span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-destructive" />
								)}
							</button>

							{notificationsOpen && (
								<div
									role="menu"
									className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-[10px] border border-border bg-card shadow-lg"
								>
									<div className="flex items-center justify-between px-4 py-3 border-b border-border">
										<h3 className="font-semibold">Thông báo</h3>
										{unreadCount > 0 && (
											<button
												type="button"
												onClick={handleMarkAllRead}
												className="text-xs text-primary hover:underline"
											>
												Đánh dấu tất cả đã đọc
											</button>
										)}
									</div>
									{notificationsLoading ? (
										<div className="flex items-center justify-center py-8">
											<Loader2
												className="size-5 animate-spin text-muted-foreground"
												aria-hidden
											/>
										</div>
									) : notifications.length === 0 ? (
										<div className="px-4 py-6 text-center text-sm text-muted-foreground">
											Không có thông báo
										</div>
									) : (
										<div className="max-h-96 overflow-y-auto">
											{notifications.map((notification) => (
												<button
													key={notification.id}
													type="button"
													role="menuitem"
													onClick={() => handleMarkRead(notification.id)}
													className={`w-full flex items-start gap-3 px-4 py-3 text-left text-sm transition-colors ${
														notification.readAt
															? "hover:bg-accent/50"
															: "bg-primary/5 hover:bg-primary/10"
													}`}
												>
													<div className="flex min-w-0 flex-col">
														<span
															className={`truncate font-medium ${notification.readAt ? "text-foreground" : "font-semibold text-foreground"}`}
														>
															{notification.title}
														</span>
														{notification.body && (
															<span className="truncate text-xs text-muted-foreground">
																{notification.body}
															</span>
														)}
														<span className="mt-1 text-xs text-muted-foreground">
															{new Date(notification.createdAt).toLocaleString(
																"vi-VN",
															)}
														</span>
													</div>
													{!notification.readAt && (
														<span className="mt-1 size-2 rounded-full bg-primary shrink-0" />
													)}
												</button>
											))}
										</div>
									)}
								</div>
							)}
						</div>
						{/* Avatar + vai trò — dropdown Thông tin / Đăng xuất */}
						<div className="relative pl-1" ref={menuRef}>
							<button
								type="button"
								onClick={() => setMenuOpen((open) => !open)}
								aria-haspopup="menu"
								aria-expanded={menuOpen}
								className="flex items-center gap-2 rounded-[10px] py-1 pr-1.5 transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
							>
								<span
									className="flex size-10 items-center justify-center rounded-full text-base font-semibold text-white"
									style={{ backgroundColor: ADMIN_SLATE }}
								>
									{initials}
								</span>
								<div className="hidden flex-col items-start leading-tight sm:flex">
									<span className="text-sm font-semibold text-foreground">
										{admin?.fullName ?? "Quản trị viên"}
									</span>
									<span className="text-xs text-[#9e9e9e]">
										{admin?.role ?? "Toàn quyền"}
									</span>
								</div>
								<ChevronDown
									className={`hidden size-4 shrink-0 text-[#9e9e9e] transition-transform duration-200 ease-out sm:block ${
										menuOpen ? "rotate-180" : ""
									}`}
									aria-hidden
								/>
							</button>

							{menuOpen ? (
								<div
									role="menu"
									className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-[10px] border border-border bg-card shadow-lg"
								>
									{/* Thông tin — tóm tắt danh tính, không điều hướng */}
									<div className="flex items-center gap-3 px-4 py-3">
										<span
											className="flex size-10 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
											style={{ backgroundColor: ADMIN_SLATE }}
										>
											{initials}
										</span>
										<div className="flex min-w-0 flex-col leading-tight">
											<span className="truncate text-sm font-semibold text-foreground">
												{admin?.fullName ?? "Quản trị viên"}
											</span>
											<span className="truncate text-xs text-[#9e9e9e]">
												{admin?.email ?? admin?.role ?? "Toàn quyền"}
											</span>
										</div>
									</div>
									<div className="border-t border-border" />
									{/* Đăng xuất */}
									<button
										type="button"
										role="menuitem"
										onClick={handleLogout}
										className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-destructive transition-colors duration-200 ease-out hover:bg-[#ffebee]"
									>
										<LogOut className="size-4.5" aria-hidden />
										Đăng xuất
									</button>
								</div>
							) : null}
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
		<div className="flex h-16 items-center justify-start gap-3 px-5">
			<Image
				src="/images/logo.png"
				alt="NomoGreen"
				width={108}
				height={36}
				priority
				className="h-9 w-auto object-contain"
			/>
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
	const admin = useAdminAuth((s) => s.admin);
	const roleCodes = admin?.roleCodes ?? [];
	const permissions = admin?.permissions ?? [];
	const isSuperAdmin = roleCodes.includes(SUPER_ADMIN_ROLE_CODE);

	// R7.8: filter nav items by permission. Items without `permission` are
	// always-visible to authenticated admins.
	const filteredGroups = adminNavGroups
		.map((group) => ({
			...group,
			items: group.items.filter((item) => {
				if (!item.permission) return true;
				if (isSuperAdmin) return true;
				return permissions.includes(item.permission);
			}),
		}))
		.filter((group) => group.items.length > 0);

	return (
		<nav className="flex-1 overflow-y-auto px-3 pb-6">
			{filteredGroups.map((group) => (
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

/**
 * BootScreen khong con dung (AuthGuard wrap layout). Giu export de tranh
 * import loi neu file khac con tham chieu; co the xoa sau.
 */
export function BootScreen() {
	return (
		<div
			className="flex min-h-[100dvh] w-full items-center justify-center bg-background"
			aria-busy="true"
			aria-live="polite"
		>
			<div className="flex flex-col items-center gap-3 text-[#9e9e9e]">
				<span className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
				<span className="text-sm">Đang xác thực...</span>
			</div>
		</div>
	);
}
