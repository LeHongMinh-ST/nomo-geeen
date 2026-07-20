"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { TenantDetailPanel } from "@/components/admin/tenant-detail-panel";
import { TenantUsersPanel } from "@/components/admin/tenant-users-panel";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
	getTenant,
	type TenantDetail,
	type TenantStatus,
	transitionTenant,
	type UpdateTenantInput,
	updateTenant,
} from "@/lib/admin-api/tenants";
import { useAdminAuth } from "@/stores/admin-auth-store";

export default function AdminTenantDetailPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const allowed = useHasPermission("admin.tenant:view");
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);
	const accessToken = useAdminAuth((s) => s.accessToken);
	const [tenant, setTenant] = useState<TenantDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		if (!accessToken || !params.id) return;
		setLoading(true);
		setError(null);
		try {
			const t = await getTenant(accessToken, params.id);
			setTenant(t);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [accessToken, params.id]);

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [hasHydrated, allowed, router]);

	useEffect(() => {
		void load();
	}, [load]);

	if (!hasHydrated || !allowed) return null;

	async function handleSave(input: UpdateTenantInput) {
		if (!accessToken || !params.id) return;
		setSaving(true);
		setError(null);
		try {
			const next = await updateTenant(accessToken, params.id, input);
			setTenant(next);
		} catch (err) {
			setError((err as Error).message);
			throw err;
		} finally {
			setSaving(false);
		}
	}

	async function handleTransition(input: {
		status: TenantStatus;
		reason?: string | null;
	}) {
		if (!accessToken || !params.id) return;
		setSaving(true);
		setError(null);
		try {
			const next = await transitionTenant(accessToken, params.id, input);
			setTenant(next);
		} catch (err) {
			setError((err as Error).message);
			throw err;
		} finally {
			setSaving(false);
		}
	}

	if (loading && !tenant) {
		return <p className="text-sm text-muted-foreground">Đang tải cửa hàng…</p>;
	}

	if (!tenant) {
		return (
			<div className="space-y-2">
				<p className="text-sm text-muted-foreground">
					Không tìm thấy cửa hàng.
				</p>
				{error ? (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				) : null}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<TenantDetailPanel
				tenant={tenant}
				saving={saving}
				error={error}
				onSave={handleSave}
				onTransition={handleTransition}
			/>
			<TenantUsersPanel tenantId={tenant.id} />
		</div>
	);
}
