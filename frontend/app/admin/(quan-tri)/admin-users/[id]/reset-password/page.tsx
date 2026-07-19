"use client";

import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";
import { useAdminUserResetPassword } from "@/components/admin/use-admin-user-detail";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";

export default function AdminUserResetPasswordPage() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const id = params?.id ?? "";
	const allowed = useHasPermission("admin.user:reset-password");
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);
	const { admin, loading, submitting, error, handleSubmit } =
		useAdminUserResetPassword(id);
	const [step, setStep] = useState<"confirm" | "input">("confirm");
	const [password, setPassword] = useState("");
	const [localError, setLocalError] = useState<string | null>(null);

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [hasHydrated, allowed, router]);

	if (!hasHydrated || !allowed) return null;
	if (loading && !admin) return <ListSkeleton withToolbar={false} rows={4} />;

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLocalError(null);
		try {
			await handleSubmit(password);
		} catch (err) {
			setLocalError((err as Error).message);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<Link
					href={`/admin/admin-users/${id}`}
					className="inline-flex size-11 items-center justify-center rounded-[10px] border border-border bg-card text-muted-foreground hover:bg-soft"
					aria-label="Quay lại chi tiết"
				>
					<ArrowLeft className="size-4" aria-hidden />
				</Link>
				<div>
					<h1 className="text-[26px] font-bold tracking-tight">
						Đặt lại mật khẩu
					</h1>
					{admin ? (
						<p className="mt-1 text-sm text-muted-foreground">
							Đặt mật khẩu mới cho <strong>{admin.email}</strong>.
						</p>
					) : null}
				</div>
			</div>

			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive"
				>
					Lỗi: {error}
				</div>
			) : null}

			{step === "confirm" ? (
				<section className="space-y-4 rounded-[16px] border border-border bg-card p-5">
					<p className="text-sm text-foreground">
						Bạn sắp đặt lại mật khẩu cho <strong>{admin?.email}</strong>. Tất cả
						phiên đăng nhập hiện tại của tài khoản này sẽ bị thu hồi.
					</p>
					<div className="flex items-center justify-end gap-2">
						<Link
							href={`/admin/admin-users/${id}`}
							className="inline-flex h-11 items-center gap-1.5 rounded-[10px] border border-border bg-card px-4 text-sm font-semibold hover:bg-soft"
						>
							Hủy
						</Link>
						<button
							type="button"
							onClick={() => setStep("input")}
							className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
						>
							<KeyRound className="size-4" aria-hidden />
							Tiếp tục
						</button>
					</div>
				</section>
			) : (
				<form
					onSubmit={(e) => void onSubmit(e)}
					className="space-y-3 rounded-[16px] border border-border bg-card p-5"
				>
					<label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Mật khẩu mới
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={12}
							autoFocus
							maxLength={128}
							className="mt-1.5 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
							placeholder="Tối thiểu 12 ký tự"
						/>
					</label>
					{localError ? (
						<div
							role="alert"
							className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
						>
							{localError}
						</div>
					) : null}
					<div className="flex items-center justify-end gap-2 pt-2">
						<Link
							href={`/admin/admin-users/${id}`}
							className="inline-flex h-11 items-center gap-1.5 rounded-[10px] border border-border bg-card px-4 text-sm font-semibold hover:bg-soft"
						>
							Hủy
						</Link>
						<button
							type="submit"
							disabled={submitting || password.length < 12}
							className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
						>
							{submitting ? "Đang đặt lại…" : "Đặt lại mật khẩu"}
						</button>
					</div>
				</form>
			)}
		</div>
	);
}
