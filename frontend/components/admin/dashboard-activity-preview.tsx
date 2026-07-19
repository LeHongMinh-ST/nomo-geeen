"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listAuditLogs, type AuditLogItem } from "@/lib/admin-api/audit-logs";
import { useAdminAuth } from "@/stores/admin-auth-store";

export function DashboardActivityPreview() {
	const accessToken = useAdminAuth((state) => state.accessToken);
	const [items, setItems] = useState<AuditLogItem[]>([]);
	const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");

	useEffect(() => {
		if (!accessToken) return;
		let cancelled = false;
		void listAuditLogs({ page: 1, pageSize: 5 }, accessToken)
			.then((result) => {
				if (cancelled) return;
				setItems(result.items);
				setState(result.items.length ? "ready" : "empty");
			})
			.catch(() => {
				if (!cancelled) setState("error");
			});
		return () => { cancelled = true; };
	}, [accessToken]);

	return <section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
		<div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-foreground">Hoạt động gần đây</h2><Link href="/admin/audit-log" className="text-sm font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary">Xem nhật ký hệ thống</Link></div>
		{state === "loading" && <p role="status" className="text-base text-[#616161]">Đang tải hoạt động...</p>}
		{state === "error" && <p role="alert" className="text-base text-[#c62828]">Không thể tải hoạt động. <Link href="/admin/audit-log" className="font-semibold underline">Mở nhật ký hệ thống</Link></p>}
		{state === "empty" && <p className="text-base text-[#616161]">Chưa có hoạt động nào được ghi nhận.</p>}
		{state === "ready" && <ul className="flex flex-col gap-4">{items.map((item) => <li key={item.id} className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#3949ab] text-white" aria-hidden>•</span><div className="flex min-w-0 flex-col"><p className="text-base leading-snug text-foreground">{item.action} · {item.resource ?? item.actorType}</p><span className="text-sm text-[#9e9e9e]">{new Date(item.createdAt).toLocaleString("vi-VN")}</span></div></li>)}</ul>}
	</section>;
}
