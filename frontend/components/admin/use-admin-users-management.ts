"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/stores/admin-auth-store";
import {
	type AdminPublicShape,
	type CreateAdminInput,
	type ListAdminsResult,
	type UpdateAdminInput,
	createAdmin,
	deactivateAdmin,
	listAdmins,
	reactivateAdmin,
	resetPassword,
	updateAdmin,
} from "@/lib/admin-api/admin-users";

/**
 * Hook cho /admin/admin-users.
 * `pageSize` co dinh 10 theo DESIGN.md §12.3 desktop. Mobile dung accumulator
 * tang dan (`mobileItems`) tu cung mot page=1 response (API hien tai khong
 * ho tro filter server-side, nen giam sat client-side).
 */
const PAGE_SIZE = 10;
const MOBILE_BATCH = 8;

export type AdminUserStatusFilter = "ACTIVE" | "DISABLED" | "";

export function useAdminUsersManagement() {
	const accessToken = useAdminAuth((s) => s.accessToken);
	const [result, setResult] = useState<ListAdminsResult | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filter state
	const [q, setQ] = useState("");
	const [status, setStatus] = useState<AdminUserStatusFilter>("");

	// Pagination
	const [page, setPage] = useState(1);

	// Mobile accumulator
	const [mobileItems, setMobileItems] = useState<AdminPublicShape[]>([]);
	const [mobileTotal, setMobileTotal] = useState(0);
	const [mobileCount, setMobileCount] = useState(MOBILE_BATCH);
	const [mobileLoading, setMobileLoading] = useState(false);

	const refresh = useCallback(
		async (nextPage = page) => {
			if (!accessToken) return;
			setLoading(true);
			setError(null);
			try {
				const r = await listAdmins(accessToken, nextPage, PAGE_SIZE);
				setResult(r);
				setPage(r.page);
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setLoading(false);
			}
		},
		[accessToken, page],
	);

	// Load full page 1 (server co the khong ho tro filter). Client-side filter
	// duoc thuc hien o component de khong can sua backend DTO.
	const loadFull = useCallback(async () => {
		if (!accessToken) return;
		setLoading(true);
		setError(null);
		try {
			const r = await listAdmins(accessToken, 1, PAGE_SIZE);
			setResult(r);
			setPage(1);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [accessToken]);

	useEffect(() => {
		void loadFull();
	}, [loadFull]);

	const loadMobile = useCallback(
		async (count: number) => {
			if (!accessToken) return;
			setMobileLoading(true);
			try {
				// API tra 1 page size = count; nho so pageSize nen goi 1 lan du.
				const r = await listAdmins(accessToken, 1, Math.max(count, PAGE_SIZE));
				setMobileItems(r.items);
				setMobileTotal(r.total);
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setMobileLoading(false);
			}
		},
		[accessToken],
	);

	// Reload mobile khi filter thay doi.
	useEffect(() => {
		setMobileCount(MOBILE_BATCH);
		void loadMobile(MOBILE_BATCH);
	}, [loadMobile, q, status]);

	const loadMoreMobile = useCallback(() => {
		setMobileCount((c) => {
			const next = c + MOBILE_BATCH;
			void loadMobile(next);
			return next;
		});
	}, [loadMobile]);

	const applyFilters = useCallback(
		async (next: { q?: string; status?: AdminUserStatusFilter }) => {
			setQ((prev) => (next.q !== undefined ? next.q : prev));
			setStatus((prev) => (next.status !== undefined ? next.status : prev));
			setPage(1);
		},
		[],
	);

	const changePage = useCallback(
		async (nextPage: number) => {
			await refresh(nextPage);
		},
		[refresh],
	);

	const handleCreate = useCallback(
		async (input: CreateAdminInput) => {
			if (!accessToken) return;
			await createAdmin(accessToken, input);
			await loadFull();
		},
		[accessToken, loadFull],
	);

	const handleUpdate = useCallback(
		async (id: string, input: UpdateAdminInput) => {
			if (!accessToken) return;
			await updateAdmin(accessToken, id, input);
			await loadFull();
		},
		[accessToken, loadFull],
	);

	const handleDeactivate = useCallback(
		async (id: string) => {
			if (!accessToken) return;
			await deactivateAdmin(accessToken, id);
			await loadFull();
		},
		[accessToken, loadFull],
	);

	const handleReactivate = useCallback(
		async (id: string) => {
			if (!accessToken) return;
			await reactivateAdmin(accessToken, id);
			await loadFull();
		},
		[accessToken, loadFull],
	);

	const handleResetPassword = useCallback(
		async (id: string, newPassword: string) => {
			if (!accessToken) return;
			await resetPassword(accessToken, id, newPassword);
		},
		[accessToken],
	);

	return {
		items: (result?.items ?? []) as AdminPublicShape[],
		total: result?.total ?? 0,
		page: result?.page ?? 1,
		pageSize: PAGE_SIZE,
		loading,
		error,
		q,
		status,
		mobileItems,
		mobileTotal,
		mobileLoading,
		applyFilters,
		changePage,
		loadMoreMobile,
		refresh: loadFull,
		handleCreate,
		handleUpdate,
		handleDeactivate,
		handleReactivate,
		handleResetPassword,
	};
}
