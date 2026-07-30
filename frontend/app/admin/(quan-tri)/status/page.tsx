"use client";

import {
	AlertCircle,
	CheckCircle2,
	Database,
	RefreshCw,
	ServerCog,
	XCircle,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useHasPermission } from "@/hooks/use-has-permission";
import { adminFetch } from "@/lib/admin-api/fetch";
import { useAdminAuth } from "@/stores/admin-auth-store";

type StatusCheck = {
	status: "up" | "down" | "degraded";
	latencyMs?: number;
	error?: string;
};

type AdminStatusResponse = {
	overall: "ready" | "degraded" | "down";
	database: StatusCheck;
	redis: StatusCheck;
	timestamp: string;
};

const STATUS_ICON = {
	up: CheckCircle2,
	down: XCircle,
	degraded: AlertCircle,
	ready: CheckCircle2,
};

const STATUS_CLASS = {
	up: "text-[#2e7d32]",
	down: "text-[#c62828]",
	degraded: "text-[#f57f17]",
	ready: "text-[#2e7d32]",
};

const STATUS_LABEL = {
	up: "Hoạt động",
	down: "Sự cố",
	degraded: "Giảm sút",
	ready: "Sẵn sàng",
};

export default function AdminStatusPage() {
	const accessToken = useAdminAuth((s) => s.accessToken);
	const canView = useHasPermission("admin.system:view");
	const [data, setData] = useState<AdminStatusResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

	const load = useCallback(async () => {
		if (!accessToken || !canView) return;
		setLoading(true);
		setError(null);
		try {
			const result = await adminFetch<AdminStatusResponse>("/admin/status", {
				accessToken,
			});
			setData(result);
			setLastRefresh(new Date());
		} catch (cause) {
			setError(
				(cause as Error).message || "Không tải được tình trạng hệ thống",
			);
		} finally {
			setLoading(false);
		}
	}, [accessToken, canView]);

	useEffect(() => void load(), [load]);

	const handleRefresh = () => {
		void load();
	};

	if (!canView) return null;

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						Tình trạng hệ thống
					</h1>
					<p className="text-sm text-muted-foreground">
						Readiness checks (database, Redis) — không lộ lỗi nội bộ.
					</p>
				</div>
				<div className="flex items-center gap-2">
					{lastRefresh && (
						<span className="text-sm text-muted-foreground">
							Làm mới lúc {lastRefresh.toLocaleTimeString("vi-VN")}
						</span>
					)}
					<button
						type="button"
						onClick={handleRefresh}
						disabled={loading}
						className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-4 text-sm font-semibold hover:bg-soft disabled:opacity-60"
					>
						<RefreshCw
							className={`size-4 ${loading ? "animate-spin" : ""}`}
							aria-hidden
						/>
						Làm mới
					</button>
				</div>
			</div>

			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
				>
					{error}
				</div>
			) : null}

			{loading && !data ? (
				<div
					className="grid grid-cols-1 gap-4 sm:grid-cols-2"
					role="status"
					aria-busy="true"
					aria-label="Đang kiểm tra tình trạng"
				>
					{[1, 2].map((key) => (
						<div
							key={key}
							className="h-32 animate-pulse rounded-[12px] border border-border bg-muted"
						/>
					))}
				</div>
			) : data ? (
				<>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<StatusCard
							title="Cơ sở dữ liệu"
							icon={Database}
							check={data.database}
						/>
						<StatusCard title="Redis" icon={Zap} check={data.redis} />
					</div>

					<div className="rounded-[12px] border border-border bg-card p-4">
						<h3 className="text-sm font-semibold mb-3">Tổng thể</h3>
						<div className="flex items-center gap-3">
							<ServerCog
								className={`size-8 ${STATUS_CLASS[data.overall]}`}
								aria-hidden
							/>
							<div>
								<p className="text-lg font-semibold">
									{data.overall === "ready"
										? "Sẵn sàng"
										: data.overall === "degraded"
											? "Giảm sút"
											: "Ngừng hoạt động"}
								</p>
								<p className="text-sm text-muted-foreground">
									Cập nhật: {new Date(data.timestamp).toLocaleString("vi-VN")}
								</p>
							</div>
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}

function StatusCard({
	title,
	icon: Icon,
	check,
}: {
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	check: StatusCheck;
}) {
	const IconComponent = STATUS_ICON[check.status];
	return (
		<div className="rounded-[12px] border border-border bg-card p-4">
			<div className="flex items-center gap-3 mb-2">
				<Icon className="size-6 text-muted-foreground" aria-hidden />
				<h3 className="font-semibold">{title}</h3>
			</div>
			<div className="flex items-center gap-2">
				<IconComponent
					className={`size-5 ${STATUS_CLASS[check.status]}`}
					aria-hidden
				/>
				<span className="font-semibold">{STATUS_LABEL[check.status]}</span>
			</div>
			{check.latencyMs !== undefined && (
				<p className="mt-2 text-sm text-muted-foreground">
					Độ trễ: {check.latencyMs} ms
				</p>
			)}
			{check.error && (
				<p className="mt-2 text-sm text-destructive">Lỗi: {check.error}</p>
			)}
		</div>
	);
}
