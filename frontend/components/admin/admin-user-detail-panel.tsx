"use client";

import {
	ArrowLeft,
	Ban,
	KeyRound,
	RefreshCcw,
	Users as UsersIcon,
	X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { AdminPublicShape } from "@/lib/admin-api/admin-users";
import type { RolePublicShape } from "@/lib/admin-api/roles";
import { labelRoleCode } from "@/lib/admin-labels";
import { Can } from "./can-permission";
import {
	AdminUserEditorForm,
	type UpdateSubmit,
} from "./admin-user-editor-form";

const STATUS_LABEL: Record<AdminPublicShape["status"], string> = {
	ACTIVE: "Hoạt động",
	DISABLED: "Vô hiệu",
};

const STATUS_CLASS: Record<AdminPublicShape["status"], string> = {
	ACTIVE: "bg-[#e8f5e9] text-[#2e7d32]",
	DISABLED: "bg-[#f5f5f5] text-[#616161]",
};

interface Props {
	admin: AdminPublicShape;
	roles: RolePublicShape[];
	isSelf: boolean;
	saving: boolean;
	error: string | null;
	onUpdate: (id: string, input: UpdateSubmit) => Promise<void>;
	onDeactivate: (id: string) => Promise<void>;
	onReactivate: (id: string) => Promise<void>;
}

/**
 * Panel detail admin user (gop info + form sua + action nguy hiem) theo
 * pattern cua tenant-detail-panel.tsx. F-17 enforced o day: admin dang
 * dang nhap se thay form bi disabled voi ly do giai thich.
 */
export function AdminUserDetailPanel({
	admin,
	roles,
	isSelf,
	saving,
	error,
	onUpdate,
	onDeactivate,
	onReactivate,
}: Props) {
	const [pendingDeactivate, setPendingDeactivate] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);

	async function handleDeactivate() {
		setActionError(null);
		try {
			await onDeactivate(admin.id);
			setPendingDeactivate(false);
		} catch (err) {
			setActionError((err as Error).message);
			setPendingDeactivate(false);
		}
	}

	async function handleReactivate() {
		setActionError(null);
		try {
			await onReactivate(admin.id);
		} catch (err) {
			setActionError((err as Error).message);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<Link
						href="/admin/admin-users"
						className="inline-flex size-11 items-center justify-center rounded-[10px] border border-border bg-card text-muted-foreground hover:bg-soft"
						aria-label="Quay lại danh sách"
					>
						<ArrowLeft className="size-4" aria-hidden />
					</Link>
					<div>
						<h1 className="text-[26px] font-bold tracking-tight">
							{admin.fullName}
						</h1>
						<p className="font-mono text-xs text-muted-foreground">
							{admin.email}
						</p>
					</div>
				</div>
				<span
					className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[admin.status]}`}
				>
					{STATUS_LABEL[admin.status]}
				</span>
			</div>

			{(actionError ?? error) ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive"
				>
					{actionError ?? error}
				</div>
			) : null}

			<div className="grid gap-4 lg:grid-cols-3">
				<section className="space-y-3 rounded-[16px] border border-border bg-card p-4 lg:col-span-2">
					<h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
						Hồ sơ
					</h2>
					<Can permission="admin.user:edit">
						<AdminUserEditorForm
							mode="edit"
							admin={admin}
							roles={roles}
							disabled={isSelf}
							disabledReason="Bạn không thể tự chỉnh sửa hồ sơ của chính mình qua giao diện này. Liên hệ quản trị viên khác hoặc dùng endpoint auth/me."
							onSubmit={async (input) => {
								setActionError(null);
								try {
									await onUpdate(admin.id, input);
								} catch (err) {
									setActionError((err as Error).message);
									throw err;
								}
							}}
						/>
					</Can>
				</section>

				<section className="space-y-4">
					<div className="rounded-[16px] border border-border bg-card p-4">
						<h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
							Thống kê
						</h2>
						<ul className="mt-3 space-y-2 text-sm">
							<li className="flex justify-between">
								<span className="text-muted-foreground">Số vai trò</span>
								<span className="font-semibold">{admin.roles.length}</span>
							</li>
							<li className="flex justify-between">
								<span className="text-muted-foreground">Đăng nhập cuối</span>
								<span className="text-xs text-muted-foreground">
									{admin.lastLoginAt
										? new Date(admin.lastLoginAt).toLocaleString("vi-VN")
										: "Chưa đăng nhập"}
								</span>
							</li>
							<li className="flex justify-between">
								<span className="text-muted-foreground">Tạo lúc</span>
								<span className="text-xs text-muted-foreground">
									{new Date(admin.createdAt).toLocaleString("vi-VN")}
								</span>
							</li>
						</ul>
						{admin.roles.length > 0 ? (
							<div className="mt-3 flex flex-wrap gap-1">
								{admin.roles.map((code) => (
									<span
										key={code}
										className="inline-flex items-center rounded-full bg-soft px-2 py-0.5 text-[11px]"
										title={code}
									>
										{labelRoleCode(code)}
									</span>
								))}
							</div>
						) : null}
					</div>

					{!isSelf ? (
						<>
							<Can permission="admin.user:reset-password">
								<Link
									href={`/admin/admin-users/${admin.id}/reset-password`}
									className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card text-sm font-semibold hover:bg-soft"
								>
									<KeyRound className="size-4" aria-hidden />
									Đặt lại mật khẩu
								</Link>
							</Can>

							<div className="rounded-[16px] border border-destructive/30 bg-card p-4">
								<h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
									Nguy hiểm
								</h2>
								<Can permission="admin.user:deactivate">
									{admin.status === "ACTIVE" ? (
										pendingDeactivate ? (
											<div className="mt-3 flex items-center gap-2">
												<button
													type="button"
													onClick={() => setPendingDeactivate(false)}
													className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card text-sm font-semibold hover:bg-soft"
												>
													<X className="size-4" aria-hidden />
													Hủy
												</button>
												<button
													type="button"
													disabled={saving}
													onClick={() => void handleDeactivate()}
													className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-destructive text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-60"
												>
													<Ban className="size-4" aria-hidden />
													Xác nhận
												</button>
											</div>
										) : (
											<button
												type="button"
												onClick={() => setPendingDeactivate(true)}
												className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-destructive/30 bg-card text-sm font-semibold text-destructive hover:bg-destructive/10"
											>
												<Ban className="size-4" aria-hidden />
												Vô hiệu hoá tài khoản
											</button>
										)
									) : (
										<button
											type="button"
											disabled={saving}
											onClick={() => void handleReactivate()}
											className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#c8e6c9] bg-[#e8f5e9] text-sm font-semibold text-[#2e7d32] hover:bg-[#c8e6c9] disabled:opacity-60"
										>
											<RefreshCcw className="size-4" aria-hidden />
											Kích hoạt lại
										</button>
									)}
								</Can>
							</div>
						</>
					) : (
						<div className="rounded-[16px] border border-border bg-soft/50 p-4 text-xs text-muted-foreground">
							Một số thao tác bị chặn trên tài khoản của chính bạn (F-17).
						</div>
					)}
				</section>
			</div>
		</div>
	);
}

export function AdminUserDetailEmpty() {
	return (
		<div className="rounded-[16px] border border-border bg-card px-4 py-10 text-center text-muted-foreground">
			<div className="mx-auto flex max-w-xs flex-col items-center gap-2">
				<UsersIcon className="size-8 opacity-40" aria-hidden />
				<span>Không tìm thấy quản trị viên.</span>
			</div>
		</div>
	);
}
