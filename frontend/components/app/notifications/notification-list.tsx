"use client";

import { AlertTriangle, Bell, Clock3, Package, Wallet } from "lucide-react";
import type {
	NotificationType,
	TenantNotification,
} from "@/lib/tenant-notifications-api";
import {
	formatNotificationTime,
	notificationTypeLabel,
} from "@/lib/tenant-notifications-api";

function typeIcon(type: NotificationType) {
	switch (type) {
		case "DEBT_DUE":
			return Wallet;
		case "LOW_STOCK":
			return Package;
		case "NEAR_EXPIRED":
			return Clock3;
		default:
			return Bell;
	}
}

function typeTone(type: NotificationType): string {
	switch (type) {
		case "DEBT_DUE":
			return "bg-[#fff3e0] text-[#ef6c00]";
		case "LOW_STOCK":
			return "bg-[#e8f5e9] text-[#2e7d32]";
		case "NEAR_EXPIRED":
			return "bg-[#fff8e1] text-[#f9a825]";
		default:
			return "bg-[#e8eaf6] text-[#3949ab]";
	}
}

export function NotificationList({
	items,
	busyId,
	onMarkRead,
	compact = false,
}: {
	items: TenantNotification[];
	busyId?: string | null;
	onMarkRead: (id: string) => void;
	compact?: boolean;
}) {
	return (
		<ul className={compact ? "flex flex-col" : "flex flex-col gap-2"}>
			{items.map((item) => {
				const Icon = typeIcon(item.type);
				const unread = !item.readAt;
				return (
					<li key={item.id}>
						<button
							type="button"
							disabled={Boolean(item.readAt) || busyId === item.id}
							onClick={() => {
								if (!item.readAt) onMarkRead(item.id);
							}}
							className={`flex w-full min-h-12 items-start gap-3 text-left transition-colors duration-150 ease-out ${
								compact
									? "border-b border-border px-4 py-3 hover:bg-[#fafafa]"
									: "rounded-[14px] border border-border bg-card p-4 hover:bg-[#fafafa]"
							} ${unread ? "" : "opacity-80"} disabled:cursor-default`}
							aria-label={
								unread
									? `Đánh dấu đã đọc: ${item.title}`
									: `Đã đọc: ${item.title}`
							}
						>
							<span
								className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-[12px] ${typeTone(item.type)}`}
							>
								<Icon className="size-5" aria-hidden />
							</span>
							<span className="min-w-0 flex-1">
								<span className="flex items-start gap-2">
									<span className="min-w-0 flex-1 text-base font-semibold text-foreground">
										{item.title}
									</span>
									{unread ? (
										<span
											className="mt-1.5 size-2.5 shrink-0 rounded-full bg-destructive"
											aria-hidden
										/>
									) : null}
								</span>
								{item.body ? (
									<span className="mt-1 block text-sm leading-5 text-[#616161]">
										{item.body}
									</span>
								) : null}
								<span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#9e9e9e]">
									<span
										className={`rounded-full px-2 py-0.5 font-medium ${typeTone(item.type)}`}
									>
										{notificationTypeLabel(item.type)}
									</span>
									<span>{formatNotificationTime(item.createdAt)}</span>
								</span>
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}

export function NotificationEmpty({ message }: { message?: string }) {
	return (
		<div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
			<span className="flex size-14 items-center justify-center rounded-full bg-[#e8f5e9] text-primary">
				<Bell className="size-6" aria-hidden />
			</span>
			<p className="text-base font-semibold text-foreground">
				Chưa có thông báo
			</p>
			<p className="max-w-xs text-sm text-[#616161]">
				{message ??
					"Khi có cảnh báo công nợ, tồn kho hoặc hạn dùng, thông báo sẽ hiện tại đây."}
			</p>
		</div>
	);
}

export function NotificationError({ onRetry }: { onRetry: () => void }) {
	return (
		<div
			role="alert"
			className="flex flex-col items-center gap-3 px-6 py-8 text-center"
		>
			<span className="flex size-12 items-center justify-center rounded-full bg-[#ffebee] text-destructive">
				<AlertTriangle className="size-5" aria-hidden />
			</span>
			<p className="text-base font-semibold text-foreground">
				Không tải được thông báo
			</p>
			<p className="text-sm text-[#616161]">
				Mất kết nối hoặc máy chủ bận. Thử lại giúp anh.
			</p>
			<button
				type="button"
				onClick={onRetry}
				className="mt-1 min-h-12 rounded-[12px] bg-primary px-5 text-base font-semibold text-white transition-colors hover:bg-[#3f8530]"
			>
				Thử lại
			</button>
		</div>
	);
}

export function NotificationLoading({ rows = 4 }: { rows?: number }) {
	return (
		<ul
			className="flex flex-col gap-2 p-3"
			aria-busy="true"
			aria-label="Đang tải thông báo"
		>
			{Array.from({ length: rows }, (_, index) => `skeleton-${index}`).map(
				(skeletonKey) => (
					<li
						key={skeletonKey}
						className="flex min-h-12 items-start gap-3 rounded-[12px] border border-border bg-card p-3"
					>
						<span className="size-11 shrink-0 animate-pulse rounded-[12px] bg-[#eeeeee]" />
						<span className="flex flex-1 flex-col gap-2 pt-1">
							<span className="h-4 w-[66%] animate-pulse rounded bg-[#eeeeee]" />
							<span className="h-3 w-full animate-pulse rounded bg-[#f5f5f5]" />
							<span className="h-3 w-[33%] animate-pulse rounded bg-[#f5f5f5]" />
						</span>
					</li>
				),
			)}
		</ul>
	);
}
