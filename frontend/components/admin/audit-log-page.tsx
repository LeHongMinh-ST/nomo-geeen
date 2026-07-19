"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, RefreshCw, Search, X } from "lucide-react";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
	getAuditLog,
	listAuditLogs,
	type AuditActorType,
	type AuditLogItem,
	type AuditLogQuery,
	type AuditLogResult,
} from "@/lib/admin-api/audit-logs";
import { useAdminAuth } from "@/stores/admin-auth-store";

const ACTIONS = ["ADMIN_CREATE", "ADMIN_UPDATE", "ADMIN_DEACTIVATE", "ADMIN_REACTIVATE", "ADMIN_RESET_PASSWORD", "ADMIN_ROLE_ASSIGN", "ADMIN_ROLE_REVOKE", "ROLE_CREATE", "ROLE_UPDATE", "ROLE_DELETE", "ROLE_PERMISSION_GRANT", "ROLE_PERMISSION_REVOKE", "LOGIN", "LOGOUT", "REFRESH_REUSE_DETECTED", "TENANT_UPDATE", "TENANT_STATUS_CHANGE", "TENANT_EXPORT", "TENANT_CREATE", "USER_CREATE", "PLAN_CREATE", "PLAN_UPDATE", "PLAN_ACTIVATE", "PLAN_DEACTIVATE", "SUBSCRIPTION_ASSIGN", "SUBSCRIPTION_CHANGE", "SUBSCRIPTION_RENEW", "SUBSCRIPTION_CANCEL"];

function pretty(value: unknown): string {
	return value == null ? "—" : JSON.stringify(value, null, 2);
}

export function AuditLogPage() {
	const allowed = useHasPermission("admin.audit:view");
	const router = useRouter();
	const accessToken = useAdminAuth((state) => state.accessToken);
	const hasHydrated = useAdminAuth((state) => state.hasHydrated);
	const [query, setQuery] = useState<AuditLogQuery>({ page: 1, pageSize: 20 });
	const [draft, setDraft] = useState<AuditLogQuery>({});
	const [result, setResult] = useState<AuditLogResult | null>(null);
	const [selected, setSelected] = useState<AuditLogItem | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const requestSequence = useRef(0);
	const detailSequence = useRef(0);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	const load = useCallback(async () => {
		if (!accessToken || !allowed) return;
		const sequence = ++requestSequence.current;
		setLoading(true);
		setError(null);
		try {
			const next = await listAuditLogs(query, accessToken);
			if (sequence === requestSequence.current) setResult(next);
		} catch (cause) {
			if (sequence === requestSequence.current) setError(cause instanceof Error ? cause.message : "Không thể tải nhật ký hoạt động.");
		} finally {
			if (sequence === requestSequence.current) setLoading(false);
		}
	}, [accessToken, allowed, query]);

	useEffect(() => void load(), [load]);
	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [allowed, hasHydrated, router]);
	useEffect(() => {
		if (!selected) return;
		requestAnimationFrame(() => closeButtonRef.current?.focus());
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setSelected(null);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [selected]);

	async function openDetail(id: string) {
		if (!accessToken) return;
		const sequence = ++detailSequence.current;
		try {
			const detail = await getAuditLog(id, accessToken);
			if (sequence === detailSequence.current) setSelected(detail);
		} catch (cause) {
			if (sequence === detailSequence.current) setError(cause instanceof Error ? cause.message : "Không thể tải chi tiết.");
		}
	}

	const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 20)));
	const pageLabel = useMemo(() => `${result?.page ?? 1} / ${totalPages}`, [result?.page, totalPages]);
	if (!allowed) return null;

	return (
		<div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div><p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#3949ab]">Vận hành · kiểm tra</p><h1 className="mt-2 text-3xl font-bold text-[#1b1f1b]">Nhật ký hoạt động</h1><p className="mt-2 text-base text-[#6b716b]">Theo dõi các thao tác quản trị và sự kiện hệ thống.</p></div>
				<button type="button" onClick={() => void load()} className="inline-flex min-h-12 items-center gap-2 rounded-[10px] border border-[#e6eae6] bg-white px-4 font-semibold text-[#3949ab] shadow-sm hover:bg-[#f4f5f4] focus:outline-none focus:ring-2 focus:ring-[#3949ab]"><RefreshCw size={18} /> Làm mới</button>
			</header>

			<section aria-label="Bộ lọc nhật ký" className="rounded-2xl border border-[#e6eae6] bg-white p-4 shadow-sm">
				<div className="grid gap-3 md:grid-cols-4">
					<label className="text-sm font-semibold text-[#5c635c]">Tìm kiếm<input value={draft.q ?? ""} onChange={(e) => setDraft({ ...draft, q: e.target.value })} placeholder="Actor hoặc tài nguyên" className="mt-2 min-h-12 w-full rounded-[10px] border border-[#d0d5d0] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3949ab]" /></label>
					<label className="text-sm font-semibold text-[#5c635c]">Hành động<select value={draft.action ?? ""} onChange={(e) => setDraft({ ...draft, action: e.target.value })} className="mt-2 min-h-12 w-full rounded-[10px] border border-[#d0d5d0] bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3949ab]"><option value="">Tất cả</option>{ACTIONS.map((action) => <option key={action}>{action}</option>)}</select></label>
					<label className="text-sm font-semibold text-[#5c635c]">Loại actor<select value={draft.actorType ?? ""} onChange={(e) => setDraft({ ...draft, actorType: (e.target.value || undefined) as AuditActorType | undefined })} className="mt-2 min-h-12 w-full rounded-[10px] border border-[#d0d5d0] bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3949ab]"><option value="">Tất cả</option><option value="PLATFORM_ADMIN">Quản trị viên</option><option value="USER">Người dùng</option><option value="SYSTEM">Hệ thống</option></select></label>
					<label className="text-sm font-semibold text-[#5c635c]">Tài nguyên<input value={draft.resource ?? ""} onChange={(e) => setDraft({ ...draft, resource: e.target.value })} placeholder="tenant, role..." className="mt-2 min-h-12 w-full rounded-[10px] border border-[#d0d5d0] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3949ab]" /></label>
					<label className="text-sm font-semibold text-[#5c635c]">Từ ngày<input type="date" value={draft.from?.slice(0, 10) ?? ""} onChange={(e) => setDraft({ ...draft, from: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined })} className="mt-2 min-h-12 w-full rounded-[10px] border border-[#d0d5d0] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3949ab]" /></label>
					<label className="text-sm font-semibold text-[#5c635c]">Đến ngày<input type="date" value={draft.to?.slice(0, 10) ?? ""} onChange={(e) => setDraft({ ...draft, to: e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined })} className="mt-2 min-h-12 w-full rounded-[10px] border border-[#d0d5d0] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3949ab]" /></label>
					<label className="text-sm font-semibold text-[#5c635c]">Tenant ID<input value={draft.tenantId ?? ""} onChange={(e) => setDraft({ ...draft, tenantId: e.target.value })} placeholder="ID cửa hàng" className="mt-2 min-h-12 w-full rounded-[10px] border border-[#d0d5d0] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#3949ab]" /></label>
				</div>
				<div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => setQuery({ ...draft, page: 1, pageSize: 20 })} className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[#3949ab] px-5 font-semibold text-white hover:bg-[#303f9f] focus:outline-none focus:ring-2 focus:ring-[#3949ab]"> <Search size={18} /> Áp dụng</button><button type="button" onClick={() => { setDraft({}); setQuery({ page: 1, pageSize: 20 }); }} className="min-h-12 rounded-[10px] border border-[#e6eae6] px-5 font-semibold text-[#5c635c] hover:bg-[#f4f5f4] focus:outline-none focus:ring-2 focus:ring-[#3949ab]">Đặt lại</button></div>
			</section>

			{loading && <div role="status" className="rounded-2xl border border-[#e6eae6] bg-white p-8 text-center text-[#6b716b]">Đang tải nhật ký...</div>}
			{error && !loading && <div role="alert" className="rounded-2xl border border-[#f1c7c5] bg-[#fff7f6] p-5 text-[#a72d29]">{error}</div>}
			{!loading && !error && result?.items.length === 0 && <div className="rounded-2xl border border-dashed border-[#d0d5d0] bg-white p-10 text-center text-[#6b716b]">Chưa có hoạt động phù hợp.</div>}
			{!loading && !error && !!result?.items.length && <>
				<div className="hidden overflow-hidden rounded-2xl border border-[#e6eae6] bg-white shadow-sm md:block"><table className="w-full text-left"><thead className="bg-[#f8f9f8] text-sm text-[#5c635c]"><tr><th className="p-4">Thời gian</th><th className="p-4">Hành động</th><th className="p-4">Actor</th><th className="p-4">Tài nguyên</th><th className="p-4">Chi tiết</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.id} className="border-t border-[#e6eae6]"><td className="p-4 text-sm text-[#5c635c]">{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td className="p-4 font-semibold text-[#1b1f1b]">{item.action}</td><td className="p-4">{item.actorId ?? item.actorType}</td><td className="p-4">{item.resource ?? "—"} {item.resourceId ? `· ${item.resourceId}` : ""}</td><td className="p-4"><button type="button" aria-label={`Xem chi tiết ${item.action}`} onClick={() => void openDetail(item.id)} className="inline-flex min-h-12 items-center gap-2 rounded-[10px] px-3 text-[#3949ab] hover:bg-[#eef0ff] focus:outline-none focus:ring-2 focus:ring-[#3949ab]"><Eye size={18} /> Xem</button></td></tr>)}</tbody></table></div>
				<div className="grid gap-3 md:hidden">{result.items.map((item) => <article key={item.id} className="rounded-2xl border border-[#e6eae6] bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-[#6b716b]">{new Date(item.createdAt).toLocaleString("vi-VN")}</p><h2 className="mt-1 text-lg font-bold text-[#1b1f1b]">{item.action}</h2></div><button type="button" aria-label={`Xem chi tiết ${item.action}`} onClick={() => void openDetail(item.id)} className="min-h-12 rounded-[10px] p-3 text-[#3949ab] focus:outline-none focus:ring-2 focus:ring-[#3949ab]"><Eye size={20} /></button></div><p className="mt-3 text-base text-[#5c635c]">{item.actorId ?? item.actorType} · {item.resource ?? "Hệ thống"}</p></article>)}</div>
				<div className="flex items-center justify-between rounded-2xl border border-[#e6eae6] bg-white p-3"><span className="text-sm text-[#6b716b]">Trang {pageLabel} · {result?.total ?? 0} sự kiện</span><div className="flex gap-2"><button type="button" disabled={(result?.page ?? 1) <= 1} onClick={() => setQuery({ ...query, page: (result?.page ?? 1) - 1 })} className="min-h-12 rounded-[10px] border border-[#e6eae6] p-3 disabled:opacity-40" aria-label="Trang trước"><ChevronLeft /></button><button type="button" disabled={(result?.page ?? 1) >= totalPages} onClick={() => setQuery({ ...query, page: (result?.page ?? 1) + 1 })} className="min-h-12 rounded-[10px] border border-[#e6eae6] p-3 disabled:opacity-40" aria-label="Trang sau"><ChevronRight /></button></div></div>
			</>}

			{selected && <div role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" className="fixed inset-0 z-50 flex items-end justify-center bg-[#1b1f1b66] p-0 sm:items-center sm:p-6"><section className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"><div className="flex items-center justify-between"><h2 id="audit-detail-title" className="text-xl font-bold text-[#1b1f1b]">Chi tiết hoạt động</h2><button ref={closeButtonRef} type="button" onClick={() => setSelected(null)} aria-label="Đóng chi tiết" className="min-h-12 rounded-[10px] p-3 text-[#5c635c] focus:outline-none focus:ring-2 focus:ring-[#3949ab]"><X /></button></div><dl className="mt-5 grid gap-3 text-base sm:grid-cols-2"><div><dt className="text-sm text-[#6b716b]">Hành động</dt><dd className="font-semibold">{selected.action}</dd></div><div><dt className="text-sm text-[#6b716b]">Thời gian</dt><dd>{new Date(selected.createdAt).toLocaleString("vi-VN")}</dd></div><div><dt className="text-sm text-[#6b716b]">Actor</dt><dd>{selected.actorId ?? selected.actorType}</dd></div><div><dt className="text-sm text-[#6b716b]">Tài nguyên</dt><dd>{selected.resource ?? "—"}</dd></div></dl><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><h3 className="font-semibold">Trước</h3><pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-[#f8f9f8] p-3 text-xs">{pretty(selected.before)}</pre></div><div><h3 className="font-semibold">Sau</h3><pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-[#f8f9f8] p-3 text-xs">{pretty(selected.after)}</pre></div></div></section></div>}
		</div>
	);
}
