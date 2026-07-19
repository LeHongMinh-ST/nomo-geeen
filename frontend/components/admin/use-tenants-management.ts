"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminAuth } from "@/stores/admin-auth-store";
import {
	type ListTenantsQuery,
	type TenantDetail,
	type TenantListItem,
	type TenantStatus,
	type TransitionTenantInput,
	type UpdateTenantInput,
	exportTenantsCsv,
	getTenant,
	listTenants,
	transitionTenant,
	updateTenant,
} from "@/lib/admin-api/tenants";

const MOBILE_BATCH = 8;

export interface KpiCounts {
	total: number;
	active: number;
	suspended: number;
	locked: number;
}

export function useTenantsManagement() {
	const accessToken = useAdminAuth((s) => s.accessToken);
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);
	const [items, setItems] = useState<TenantListItem[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState<TenantStatus | "">("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [mobileItems, setMobileItems] = useState<TenantListItem[]>([]);
	const [mobileTotal, setMobileTotal] = useState(0);
	const [mobileCount, setMobileCount] = useState(MOBILE_BATCH);

	// KPI strip - DESIGN.md §18. Khi chua filter status, goi 3 query them
	// (pageSize=1) de lay total tung nhom. Khi da filter 1 status, chi
	// nhom do co so that; 2 nhom kia dat 0 (UI se hien "-").
	const [kpi, setKpi] = useState<KpiCounts | null>(null);

	const refresh = useCallback(
		async (overrides: Partial<ListTenantsQuery> = {}) => {
			if (!accessToken) return;
			const nextPage = overrides.page ?? page;
			const nextPageSize = overrides.pageSize ?? pageSize;
			const nextQ = overrides.q !== undefined ? overrides.q : q;
			const nextStatus =
				overrides.status !== undefined ? overrides.status : status || undefined;

			setLoading(true);
			setError(null);
			try {
				const r = await listTenants(accessToken, {
					page: nextPage,
					pageSize: nextPageSize,
					q: nextQ || undefined,
					status: nextStatus,
				});
				setItems(r.items);
				setTotal(r.total);
				setPage(r.page);
				setPageSize(r.pageSize);
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setLoading(false);
			}
		},
		[accessToken, page, pageSize, q, status],
	);

	const refreshRef = useRef(refresh);
	refreshRef.current = refresh;

	// Fetch ban dau + moi khi accessToken chuyen tu null -> co (sau khi
	// AuthBootstrapper hydrate xong). Truoc day chi `[]` nen neu bootstrap
	// cham hon mount cua hook, refresh() return som va trang bi ket o
	// skeleton vinh vien cho den lan soft-nav tiep theo.
	useEffect(() => {
		if (!hasHydrated) return;
		void refreshRef.current();
	}, [hasHydrated, accessToken]);

	const loadMobile = useCallback(
		async (count: number) => {
			if (!accessToken) return;
			try {
				const r = await listTenants(accessToken, {
					page: 1,
					pageSize: count,
					q: q || undefined,
					status: status || undefined,
				});
				setMobileItems(r.items);
				setMobileTotal(r.total);
			} catch (err) {
				setError((err as Error).message);
			}
		},
		[accessToken, q, status],
	);

	useEffect(() => {
		setMobileCount(MOBILE_BATCH);
		void loadMobile(MOBILE_BATCH);
	}, [loadMobile]);

	const loadMoreMobile = useCallback(() => {
		const next = mobileCount + MOBILE_BATCH;
		setMobileCount(next);
		void loadMobile(next);
	}, [mobileCount, loadMobile]);

	const applyFilters = useCallback(
		async (next: { q?: string; status?: TenantStatus | "" }) => {
			if (next.q !== undefined) setQ(next.q);
			if (next.status !== undefined) setStatus(next.status);
			await refresh({
				page: 1,
				q: next.q !== undefined ? next.q : q,
				status:
					next.status !== undefined
						? next.status || undefined
						: status || undefined,
			});
		},
		[q, refresh, status],
	);

	const changePage = useCallback(
		async (nextPage: number, nextPageSize = pageSize) => {
			setPage(nextPage);
			setPageSize(nextPageSize);
			await refresh({ page: nextPage, pageSize: nextPageSize });
		},
		[pageSize, refresh],
	);

	const handleExport = useCallback(async () => {
		if (!accessToken) return;
		const csv = await exportTenantsCsv(accessToken, {
			q: q || undefined,
			status: status || undefined,
		});
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "tenants.csv";
		a.click();
		URL.revokeObjectURL(url);
	}, [accessToken, q, status]);

	const handleGet = useCallback(
		async (id: string): Promise<TenantDetail | null> => {
			if (!accessToken) return null;
			return getTenant(accessToken, id);
		},
		[accessToken],
	);

	const handleUpdate = useCallback(
		async (id: string, input: UpdateTenantInput): Promise<TenantDetail> => {
			if (!accessToken) throw new Error("Chua dang nhap");
			const detail = await updateTenant(accessToken, id, input);
			await refresh();
			return detail;
		},
		[accessToken, refresh],
	);

	const handleTransition = useCallback(
		async (id: string, input: TransitionTenantInput): Promise<TenantDetail> => {
			if (!accessToken) throw new Error("Chua dang nhap");
			const detail = await transitionTenant(accessToken, id, input);
			await refresh();
			return detail;
		},
		[accessToken, refresh],
	);

	// Tai KPI song song sau khi co total tu list chinh. Bo qua khi dang
	// filter 1 status (chi can 1 call, dung total hien tai).
	useEffect(() => {
		let cancelled = false;
		async function run() {
			if (!accessToken) return;
			if (status !== "") {
				if (cancelled) return;
				setKpi({
					total: 0,
					active: status === "ACTIVE" ? total : 0,
					suspended: status === "SUSPENDED" ? total : 0,
					locked: status === "LOCKED" ? total : 0,
				});
				return;
			}
			try {
				const [a, s, l] = await Promise.all([
					listTenants(accessToken, { page: 1, pageSize: 1, status: "ACTIVE" }),
					listTenants(accessToken, {
						page: 1,
						pageSize: 1,
						status: "SUSPENDED",
					}),
					listTenants(accessToken, { page: 1, pageSize: 1, status: "LOCKED" }),
				]);
				if (cancelled) return;
				setKpi({
					total,
					active: a.total,
					suspended: s.total,
					locked: l.total,
				});
			} catch {
				// KPI la phan trang tri; loi khong chan list chinh.
			}
		}
		void run();
		return () => {
			cancelled = true;
		};
	}, [accessToken, status, total]);

	return {
		items,
		total,
		page,
		pageSize,
		q,
		status,
		loading,
		error,
		mobileItems,
		mobileTotal,
		loadMoreMobile,
		kpi,
		refresh,
		applyFilters,
		changePage,
		handleExport,
		handleGet,
		handleUpdate,
		handleTransition,
	};
}
