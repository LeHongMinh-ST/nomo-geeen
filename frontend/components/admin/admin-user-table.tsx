"use client";

import {
	Ban,
	KeyRound,
	Pencil,
	Plus,
	RefreshCcw,
	Search,
	Users as UsersIcon,
	X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminPublicShape } from "@/lib/admin-api/admin-users";
import type { RolePublicShape } from "@/lib/admin-api/roles";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { LoadMoreSentinel } from "@/components/app/shared/load-more-sentinel";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { labelRoleCode } from "@/lib/admin-labels";
import { Can } from "./can-permission";

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<AdminPublicShape["status"], string> = {
	ACTIVE: "Hoạt động",
	DISABLED: "Vô hiệu",
};

// DESIGN.md §13 — palette trang thai dong nhat voi tenant-list.tsx
// (frontend/lib/debts.ts la de-facto palette toan app).
const STATUS_CLASS: Record<AdminPublicShape["status"], string> = {
	ACTIVE: "bg-[#e8f5e9] text-[#2e7d32]", // Success
	DISABLED: "bg-[#f5f5f5] text-[#616161]", // Gray
};

const STATUS_FILTER_OPTIONS = [
	{ value: "", label: "Tất cả" },
	{ value: "ACTIVE", label: STATUS_LABEL.ACTIVE },
	{ value: "DISABLED", label: STATUS_LABEL.DISABLED },
];

interface Props {
	items: AdminPublicShape[];
	total: number;
	page: number;
	pageSize: number;
	loading: boolean;
	error: string | null;
	roles: RolePublicShape[];
	q: string;
	status: "" | "ACTIVE" | "DISABLED";
	mobileItems: AdminPublicShape[];
	mobileTotal: number;
	mobileLoading: boolean;
	onFilter: (next: { q?: string; status?: "" | "ACTIVE" | "DISABLED" }) => Promise<void>;
	onPageChange: (page: number) => Promise<void>;
	onLoadMoreMobile: () => void;
	onCreate: (input: {
		email: string;
		password: string;
		fullName: string;
		roleIds: string[];
	}) => Promise<void>;
	onUpdate: (
		id: string,
		input: { fullName?: string; roleIds?: string[] },
	) => Promise<void>;
	onDeactivate: (id: string) => Promise<void>;
	onReactivate: (id: string) => Promise<void>;
	onResetPassword: (id: string, newPassword: string) => Promise<void>;
}

/**
 * R7.1 admin user list — DESIGN.md compliant:
 * - Mobile card-list + tải dần (§12.1, §12.3)
 * - Desktop bảng anti-cramping + DataPagination (§12.2, §12.3)
 * - Filter theo trạng thái bằng ListFilterBar (§12.4)
 * - Badge ACTIVE/DISABLED theo palette Success/Gray (§13)
 * - Deactivate dung inline 2-step confirm (§21)
 * - F-17: hàng của current admin hiển thị badge "Bạn" + ẩn action nguy hiểm
 *   (deactivate/reactivate) tại list; guard day du ở detail route (Phase 2).
 */
export function AdminUserTable({
	items,
	total,
	page,
	pageSize,
	loading,
	error,
	roles,
	q,
	status,
	mobileItems,
	mobileTotal,
	mobileLoading,
	onFilter,
	onPageChange,
	onLoadMoreMobile,
	onDeactivate,
	onReactivate,
}: Props) {
	const [draftQ, setDraftQ] = useState(q);
	const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(
		null,
	);
	const [actionError, setActionError] = useState<string | null>(null);
	void roles; // giữ prop để tương thích page.tsx; Phase 2 dùng cho detail.

	const filteredItems = useMemo(() => {
		const term = q.trim().toLowerCase();
		return items.filter((a) => {
			if (status && a.status !== status) return false;
			if (!term) return true;
			return (
				a.email.toLowerCase().includes(term) ||
				a.fullName.toLowerCase().includes(term)
			);
		});
	}, [items, q, status]);

	const filteredMobile = useMemo(() => {
		const term = q.trim().toLowerCase();
		return mobileItems.filter((a) => {
			if (status && a.status !== status) return false;
			if (!term) return true;
			return (
				a.email.toLowerCase().includes(term) ||
				a.fullName.toLowerCase().includes(term)
			);
		});
	}, [mobileItems, q, status]);

	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	// Skeleton chỉ khi đang tải VÀ có tín hiệu dữ liệu (total > 0). Nếu total = 0
	// thì render bảng rỗng ngay (EmptyTable), tránh flash skeleton.
	const initialLoading =
		(loading && items.length === 0 && total > 0) ||
		(mobileLoading && mobileItems.length === 0 && mobileTotal > 0);

	async function submitSearch(e: React.FormEvent) {
		e.preventDefault();
		const next = draftQ.trim().slice(0, 100);
		setDraftQ(next);
		await onFilter({ q: next });
	}

	async function handleDeactivate(a: AdminPublicShape) {
		setActionError(null);
		try {
			await onDeactivate(a.id);
			setPendingDeactivateId(null);
		} catch (err) {
			setActionError((err as Error).message);
		}
	}

	async function handleReactivate(a: AdminPublicShape) {
		setActionError(null);
		try {
			await onReactivate(a.id);
		} catch (err) {
			setActionError((err as Error).message);
		}
	}

	if (initialLoading) {
		return <ListSkeleton withToolbar={false} rows={6} />;
	}

	if (error) {
		return (
			<div className="rounded-[14px] border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
				Lỗi: {error}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-[26px] font-bold tracking-tight">
						Tài khoản
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Quản lý tài khoản quản trị nội bộ và phân quyền truy cập.
					</p>
				</div>
				<Can permission="admin.user:create">
					<Link
						href="/admin/admin-users/new"
						className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-primary px-4 text-base font-semibold text-white transition-colors hover:bg-primary/90 active:scale-[0.99]"
					>
						<Plus className="size-5" aria-hidden />
						Tạo quản trị viên
					</Link>
				</Can>
			</div>

			<div className="flex flex-col gap-3 lg:flex-row lg:items-end">
				<form
					onSubmit={(e) => void submitSearch(e)}
					className="block flex-1"
				>
					<label className="block">
						<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Tìm kiếm
						</span>
						<div className="relative mt-1.5">
							<Search
								className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden
							/>
							<input
								type="search"
								value={draftQ}
								maxLength={100}
								onChange={(e) => setDraftQ(e.target.value)}
								placeholder="Email hoặc họ tên… — nhấn Enter để tìm"
								className="h-11 w-full rounded-[10px] border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
							/>
						</div>
					</label>
				</form>

				<label className="block lg:w-[260px]">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Trạng thái
					</span>
					<Select
						value={status}
						onValueChange={(v) =>
							void onFilter({ status: v as "" | "ACTIVE" | "DISABLED" })
						}
					>
						<SelectTrigger
							aria-label="Lọc theo trạng thái"
							className="mt-1.5 h-11 w-full"
						>
							<SelectValue placeholder="Tất cả" />
						</SelectTrigger>
						<SelectContent>
							{STATUS_FILTER_OPTIONS.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</label>
			</div>

			{actionError ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive"
				>
					{actionError}
				</div>
			) : null}

			{/* Mobile/tablet — card list (§12.1) */}
			<div className="flex flex-col gap-3 lg:hidden">
				{filteredMobile.length === 0 ? (
					<EmptyState />
				) : (
					<>
						{filteredMobile.map((a) => (
							<AdminUserCard
								key={a.id}
								admin={a}
								isPendingDeactivate={pendingDeactivateId === a.id}
								onRequestDeactivate={() => setPendingDeactivateId(a.id)}
								onCancelDeactivate={() => setPendingDeactivateId(null)}
								onConfirmDeactivate={() => handleDeactivate(a)}
								onReactivate={() => handleReactivate(a)}
							/>
						))}
						{filteredMobile.length < mobileTotal ? (
							<LoadMoreSentinel onReach={onLoadMoreMobile} />
						) : (
							<p className="py-2 text-center text-sm text-muted-foreground">
								Đã hiển thị tất cả {filteredMobile.length} quản trị viên
							</p>
						)}
					</>
				)}
			</div>

			{/* Desktop — bang (§12.2, §12.3). Luôn render <table> kể cả khi rỗng
			    — admin ưu tiên PC, nhìn header cột quen thuộc + 1 row colspan
			    chứa CTA "Tạo quản trị viên" ở giữa rõ ràng hơn card dashed. */}
			<div className="hidden flex-col gap-3 lg:flex">
				<div className="overflow-hidden rounded-[16px] border border-border bg-card">
					<table className="w-full border-collapse text-left">
						<thead>
							<tr className="bg-soft text-sm text-muted-foreground">
								<th
									scope="col"
									className="min-w-[220px] px-4 py-3 font-semibold"
								>
									Email
								</th>
								<th
									scope="col"
									className="min-w-[180px] px-4 py-3 font-semibold"
								>
									Họ tên
								</th>
								<th
									scope="col"
									className="min-w-[120px] whitespace-nowrap px-4 py-3 font-semibold"
								>
									Trạng thái
								</th>
								<th
									scope="col"
									className="min-w-[160px] px-4 py-3 font-semibold"
								>
									Vai trò
								</th>
								<th
									scope="col"
									className="min-w-[150px] whitespace-nowrap px-4 py-3 font-semibold"
								>
									Đăng nhập cuối
								</th>
								<th
									scope="col"
									className="min-w-[160px] whitespace-nowrap px-4 py-3 text-right font-semibold"
								>
									Hành động
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredItems.length === 0 ? (
								<tr>
									<td colSpan={6} className="p-0">
										<EmptyTable />
									</td>
								</tr>
							) : (
								filteredItems.map((a) => {
									const isPending = pendingDeactivateId === a.id;
									return (
										<tr
											key={a.id}
											className="border-t border-border align-middle"
										>
											<td className="px-4 py-3.5 font-mono text-sm">
												<Link
													href={`/admin/admin-users/${a.id}`}
													className="font-semibold text-foreground hover:text-primary hover:underline"
												>
													{a.email}
												</Link>
											</td>
											<td className="px-4 py-3.5 text-sm text-foreground">
												{a.fullName}
											</td>
											<td className="whitespace-nowrap px-4 py-3.5">
												<span
													className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${STATUS_CLASS[a.status]}`}
												>
													{STATUS_LABEL[a.status]}
												</span>
											</td>
											<td className="px-4 py-3.5">
												<div className="flex flex-wrap gap-1">
													{a.roles.map((code) => (
														<span
															key={code}
															className="inline-flex items-center rounded-full bg-soft px-2.5 py-0.5 text-sm"
															title={code}
														>
															{labelRoleCode(code)}
														</span>
													))}
												</div>
											</td>
											<td className="whitespace-nowrap px-4 py-3.5 text-sm text-muted-foreground">
												{a.lastLoginAt
													? new Date(a.lastLoginAt).toLocaleString("vi-VN")
													: "—"}
											</td>
											<td className="whitespace-nowrap px-4 py-3.5 text-right">
												{isPending ? (
													<div className="inline-flex items-center gap-2">
														<button
															type="button"
															onClick={() => setPendingDeactivateId(null)}
															className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-sm font-semibold hover:bg-soft"
														>
															<X className="size-4" aria-hidden />
															Hủy
														</button>
														<button
															type="button"
															onClick={() => handleDeactivate(a)}
															className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-destructive px-3 text-sm font-semibold text-white hover:bg-destructive/90"
														>
															<Ban className="size-4" aria-hidden />
															Xác nhận
														</button>
													</div>
												) : (
													<div className="inline-flex items-center gap-1">
														<Link
															href={`/admin/admin-users/${a.id}`}
															aria-label={`Sửa ${a.email}`}
															className="inline-flex size-10 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-soft"
														>
															<Pencil className="size-4" aria-hidden />
														</Link>
														{a.status === "ACTIVE" ? (
															<button
																type="button"
																onClick={() => setPendingDeactivateId(a.id)}
																aria-label={`Vô hiệu hoá ${a.email}`}
																className="inline-flex size-10 items-center justify-center rounded-[10px] text-destructive transition-colors hover:bg-destructive/10"
															>
																<Ban className="size-4" aria-hidden />
															</button>
														) : (
															<button
																type="button"
																onClick={() => handleReactivate(a)}
																aria-label={`Kích hoạt ${a.email}`}
																className="inline-flex size-10 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-soft"
															>
																<RefreshCcw className="size-4" aria-hidden />
															</button>
														)}
														<Link
															href={`/admin/admin-users/${a.id}/reset-password`}
															aria-label={`Đặt lại mật khẩu ${a.email}`}
															className="inline-flex size-10 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-soft"
														>
															<KeyRound className="size-4" aria-hidden />
														</Link>
													</div>
												)}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>

				{filteredItems.length > 0 ? (
					<DataPagination
						page={page}
						pageCount={pageCount}
						total={total}
						pageSize={pageSize}
						noun="quản trị viên"
						onPage={(p) => void onPageChange(p)}
					/>
				) : null}
			</div>
		</div>
	);
}

function AdminUserCard({
	admin,
	isPendingDeactivate,
	onRequestDeactivate,
	onCancelDeactivate,
	onConfirmDeactivate,
	onReactivate,
}: {
	admin: AdminPublicShape;
	isPendingDeactivate: boolean;
	onRequestDeactivate: () => void;
	onCancelDeactivate: () => void;
	onConfirmDeactivate: () => void;
	onReactivate: () => void;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card">
			<div className="flex items-start justify-between gap-2">
				<Link
					href={`/admin/admin-users/${admin.id}`}
					className="min-w-0 truncate text-base font-semibold text-foreground hover:text-primary hover:underline"
				>
					{admin.fullName}
				</Link>
				<span
					className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[admin.status]}`}
				>
					{STATUS_LABEL[admin.status]}
				</span>
			</div>
			<div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
				<span className="truncate font-mono text-xs">{admin.email}</span>
				<span className="shrink-0 text-xs">
					{admin.lastLoginAt
						? new Date(admin.lastLoginAt).toLocaleString("vi-VN")
						: "Chưa đăng nhập"}
				</span>
			</div>
			{admin.roles.length > 0 ? (
				<div className="flex flex-wrap gap-1">
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
			{isPendingDeactivate ? (
				<div className="flex items-center gap-2 border-t border-border pt-3">
					<button
						type="button"
						onClick={onCancelDeactivate}
						className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card text-sm font-semibold hover:bg-soft"
					>
						<X className="size-4" aria-hidden />
						Hủy
					</button>
					<button
						type="button"
						onClick={onConfirmDeactivate}
						className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-destructive text-sm font-semibold text-white hover:bg-destructive/90"
					>
						<Ban className="size-4" aria-hidden />
						Xác nhận
					</button>
				</div>
			) : (
				<div className="flex items-center gap-2 border-t border-border pt-3">
					<Link
						href={`/admin/admin-users/${admin.id}`}
						className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card text-sm font-semibold hover:bg-soft"
					>
						<Pencil className="size-4" aria-hidden />
						Sửa
					</Link>
					{admin.status === "ACTIVE" ? (
						<button
							type="button"
							onClick={onRequestDeactivate}
							aria-label={`Vô hiệu hoá ${admin.email}`}
							className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-destructive/30 bg-card text-sm font-semibold text-destructive hover:bg-destructive/10"
						>
							<Ban className="size-4" aria-hidden />
							Vô hiệu
						</button>
					) : (
						<button
							type="button"
							onClick={onReactivate}
							aria-label={`Kích hoạt ${admin.email}`}
							className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card text-sm font-semibold hover:bg-soft"
						>
							<RefreshCcw className="size-4" aria-hidden />
							Kích hoạt
						</button>
					)}
					<Link
						href={`/admin/admin-users/${admin.id}/reset-password`}
						aria-label={`Đặt lại mật khẩu ${admin.email}`}
						className="inline-flex size-10 items-center justify-center rounded-[10px] border border-border bg-card text-muted-foreground hover:bg-soft"
					>
						<KeyRound className="size-4" aria-hidden />
					</Link>
				</div>
			)}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="rounded-[16px] border border-border bg-card px-4 py-10 text-center text-muted-foreground">
			<div className="mx-auto flex max-w-xs flex-col items-center gap-2">
				<UsersIcon className="size-8 opacity-40" aria-hidden />
				<span>Không có quản trị viên phù hợp bộ lọc.</span>
			</div>
		</div>
	);
}

/** Bảng rỗng cho desktop — hiển thị trong <tbody> qua 1 row colspan. */
function EmptyTable() {
	return (
		<div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
			<span
				aria-hidden
				className="flex size-16 items-center justify-center rounded-2xl bg-soft"
			>
				<UsersIcon className="size-8 text-muted-foreground" />
			</span>
			<div className="space-y-1">
				<p className="text-lg font-semibold text-foreground">
					Chưa có quản trị viên nào
				</p>
				<p className="mx-auto max-w-md text-sm text-muted-foreground">
					Thay đổi bộ lọc, hoặc thêm tài khoản quản trị đầu tiên để phân
					quyền truy cập khu quản trị nội bộ.
				</p>
			</div>
			<Can permission="admin.user:create">
				<Link
					href="/admin/admin-users/new"
					className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(92,173,69,0.25)] transition-all duration-200 ease-out hover:bg-primary/90 hover:shadow-[0_6px_20px_rgba(92,173,69,0.32)] active:scale-[0.98]"
				>
					<Plus className="size-4" aria-hidden />
					Tạo quản trị viên
				</Link>
			</Can>
		</div>
	);
}
