"use client";

import { Bell, CheckCheck, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
	NotificationEmpty,
	NotificationError,
	NotificationList,
	NotificationLoading,
} from "@/components/app/notifications/notification-list";
import {
	getTenantNotificationUnreadCount,
	listTenantNotifications,
	markAllTenantNotificationsRead,
	markTenantNotificationRead,
	syncTenantNotifications,
	type TenantNotification,
} from "@/lib/tenant-notifications-api";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { useTenantNotificationStream } from "@/lib/use-tenant-notification-stream";
import { useUserAuth } from "@/stores/user-auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

/**
 * Header bell: desktop popover + mobile full sheet (DESIGN.md §10).
 * Data from GET /tenant/notifications — no mock payload.
 */
export function NotificationBell() {
	const panelId = useId();
	const rootRef = useRef<HTMLDivElement>(null);
	const accessToken = useUserAuth((state) => state.accessToken);
	const hasHydrated = useUserAuth((state) => state.hasHydrated);

	const [open, setOpen] = useState(false);
	const [items, setItems] = useState<TenantNotification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [listState, setListState] = useState<LoadState>("idle");
	const [busyId, setBusyId] = useState<string | null>(null);
	const [markingAll, setMarkingAll] = useState(false);

	const refreshUnread = useCallback(async () => {
		if (!accessToken) {
			setUnreadCount(0);
			return;
		}
		try {
			const result = await getTenantNotificationUnreadCount();
			setUnreadCount(result.count);
		} catch {
			// Badge stays on last known count; list surface shows retry.
		}
	}, [accessToken]);

	const loadList = useCallback(async () => {
		if (!accessToken) return;
		setListState("loading");
		try {
			// Best-effort producers; inbox still loads if sync fails.
			await syncTenantNotifications().catch(() => null);
			const result = await listTenantNotifications({ limit: 30 });
			setItems(result.items);
			setUnreadCount(result.unreadCount);
			setListState("ready");
		} catch {
			setListState("error");
		}
	}, [accessToken]);

	useEffect(() => {
		if (!hasHydrated || !accessToken) return;
		void refreshUnread();
	}, [hasHydrated, accessToken, refreshUnread]);

	useEffect(() => {
		if (!open) return;
		void loadList();
	}, [open, loadList]);

	// SSE live hints + reconnect re-fetch + polling fallback (list/unread = source of truth).
	const openRef = useRef(open);
	openRef.current = open;
	useTenantNotificationStream({
		accessToken,
		enabled: hasHydrated && Boolean(accessToken),
		onChanged: () => {
			void refreshUnread();
			if (openRef.current) void loadList();
		},
		onReconnect: () => {
			void refreshUnread();
			if (openRef.current) void loadList();
		},
	});

	// Desktop: close on outside click / Esc.
	useEffect(() => {
		if (!open) return;
		function onPointer(event: MouseEvent) {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		}
		function onKey(event: KeyboardEvent) {
			if (event.key === "Escape") setOpen(false);
		}
		window.addEventListener("mousedown", onPointer);
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("mousedown", onPointer);
			window.removeEventListener("keydown", onKey);
		};
	}, [open]);

	// Mobile sheet locks background scroll.
	useScrollLock(open);

	async function handleMarkRead(id: string) {
		setBusyId(id);
		try {
			const updated = await markTenantNotificationRead(id);
			setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
			setUnreadCount((count) => Math.max(0, count - 1));
		} catch {
			// Keep previous unread state; user can retry.
		} finally {
			setBusyId(null);
		}
	}

	async function handleMarkAll() {
		if (unreadCount === 0 || markingAll) return;
		setMarkingAll(true);
		try {
			const result = await markAllTenantNotificationsRead();
			setUnreadCount(result.unreadCount);
			const now = new Date().toISOString();
			setItems((prev) =>
				prev.map((item) => (item.readAt ? item : { ...item, readAt: now })),
			);
		} catch {
			// Leave list as-is.
		} finally {
			setMarkingAll(false);
		}
	}

	const badgeLabel =
		unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

	return (
		<div ref={rootRef} className="relative">
			<button
				type="button"
				aria-label={
					unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo"
				}
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-controls={open ? panelId : undefined}
				onClick={() => setOpen((value) => !value)}
				className="relative flex size-12 items-center justify-center rounded-[10px] text-[#616161] transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
			>
				<Bell className="size-5.5" aria-hidden />
				{badgeLabel ? (
					<span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
						{badgeLabel}
					</span>
				) : null}
			</button>

			{/* Desktop popover */}
			{open ? (
				<div
					id={panelId}
					role="dialog"
					aria-label="Thông báo"
					className="absolute right-0 top-[calc(100%+8px)] z-50 hidden w-[min(100vw-2rem,380px)] overflow-hidden rounded-[16px] border border-border bg-card shadow-[0_12px_40px_rgba(27,31,27,0.14)] lg:block"
				>
					<PanelHeader
						unreadCount={unreadCount}
						markingAll={markingAll}
						onMarkAll={handleMarkAll}
						onClose={() => setOpen(false)}
						showClose={false}
					/>
					<div className="max-h-[min(70vh,420px)] overflow-y-auto overscroll-contain">
						<PanelBody
							listState={listState}
							items={items}
							busyId={busyId}
							onMarkRead={handleMarkRead}
							onRetry={() => void loadList()}
							compact
						/>
					</div>
					<div className="border-t border-border p-2">
						<Link
							href="/thong-bao"
							onClick={() => setOpen(false)}
							className="flex min-h-12 items-center justify-center rounded-[12px] text-base font-semibold text-primary hover:bg-[#e8f5e9]"
						>
							Xem tất cả
						</Link>
					</div>
				</div>
			) : null}

			{/* Mobile full sheet */}
			<div
				className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
				aria-hidden={!open}
			>
				<button
					type="button"
					aria-label="Đóng thông báo"
					onClick={() => setOpen(false)}
					className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ease-out ${
						open ? "opacity-100" : "opacity-0"
					}`}
				/>
				<div
					role="dialog"
					aria-modal="true"
					aria-label="Thông báo"
					className={`absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-[18px] bg-card transition-transform duration-300 ease-out ${
						open ? "translate-y-0" : "translate-y-full"
					}`}
				>
					<div className="relative flex items-center justify-center pb-1 pt-3">
						<span className="h-1.5 w-10 rounded-full bg-[#e0e0e0]" />
					</div>
					<PanelHeader
						unreadCount={unreadCount}
						markingAll={markingAll}
						onMarkAll={handleMarkAll}
						onClose={() => setOpen(false)}
						showClose
					/>
					<div className="pb-safe min-h-0 flex-1 overflow-y-auto overscroll-contain">
						<PanelBody
							listState={listState}
							items={items}
							busyId={busyId}
							onMarkRead={handleMarkRead}
							onRetry={() => void loadList()}
							compact
						/>
						<div className="border-t border-border p-3">
							<Link
								href="/thong-bao"
								onClick={() => setOpen(false)}
								className="flex min-h-12 items-center justify-center rounded-[12px] bg-[#e8f5e9] text-base font-semibold text-primary"
							>
								Mở trang thông báo
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function PanelHeader({
	unreadCount,
	markingAll,
	onMarkAll,
	onClose,
	showClose,
}: {
	unreadCount: number;
	markingAll: boolean;
	onMarkAll: () => void;
	onClose: () => void;
	showClose: boolean;
}) {
	return (
		<div className="flex items-center gap-2 border-b border-border px-4 py-3">
			<div className="min-w-0 flex-1">
				<p className="text-lg font-bold text-foreground">Thông báo</p>
				<p className="text-sm text-[#616161]">
					{unreadCount > 0
						? `${unreadCount} chưa đọc`
						: "Không có thông báo mới"}
				</p>
			</div>
			<button
				type="button"
				onClick={onMarkAll}
				disabled={unreadCount === 0 || markingAll}
				className="flex min-h-12 items-center gap-1.5 rounded-[12px] px-3 text-sm font-semibold text-primary transition-colors hover:bg-[#e8f5e9] disabled:cursor-not-allowed disabled:opacity-40"
			>
				<CheckCheck className="size-4" aria-hidden />
				Đọc hết
			</button>
			{showClose ? (
				<button
					type="button"
					onClick={onClose}
					aria-label="Đóng"
					className="flex size-12 items-center justify-center rounded-[10px] text-[#616161] hover:bg-[#f5f5f5]"
				>
					<X className="size-5" aria-hidden />
				</button>
			) : null}
		</div>
	);
}

function PanelBody({
	listState,
	items,
	busyId,
	onMarkRead,
	onRetry,
	compact,
}: {
	listState: LoadState;
	items: TenantNotification[];
	busyId: string | null;
	onMarkRead: (id: string) => void;
	onRetry: () => void;
	compact: boolean;
}) {
	if (listState === "loading" || listState === "idle") {
		return <NotificationLoading rows={4} />;
	}
	if (listState === "error") {
		return <NotificationError onRetry={onRetry} />;
	}
	if (items.length === 0) {
		return <NotificationEmpty />;
	}
	return (
		<NotificationList
			items={items}
			busyId={busyId}
			onMarkRead={onMarkRead}
			compact={compact}
		/>
	);
}
