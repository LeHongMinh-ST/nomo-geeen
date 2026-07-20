"use client";

import {
	KeyRound,
	Pencil,
	Plus,
	RefreshCcw,
	Save,
	UserCheck,
	UserMinus,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Can } from "@/components/admin/can-permission";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
	changeTenantUserRole,
	createTenantUser,
	deactivateTenantUser,
	type ListTenantUsersResult,
	listTenantUsers,
	reactivateTenantUser,
	resetTenantUserPassword,
	type TenantRoleCode,
	type TenantUserPublic,
	updateTenantUser,
} from "@/lib/admin-api/tenant-users";
import { useAdminAuth } from "@/stores/admin-auth-store";

const ROLES: TenantRoleCode[] = ["OWNER", "MANAGER", "STAFF"];
const ROLE_LABEL: Record<TenantRoleCode, string> = {
	OWNER: "Chủ cửa hàng",
	MANAGER: "Quản lý",
	STAFF: "Nhân viên",
};
const inputClass =
	"mt-1.5 min-h-12 w-full rounded-[10px] border border-border bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

type FormState = {
	fullName: string;
	username: string;
	phone: string;
	email: string;
	roleCode: TenantRoleCode;
	password: string;
	generatePassword: boolean;
};
const EMPTY: FormState = {
	fullName: "",
	username: "",
	phone: "",
	email: "",
	roleCode: "STAFF",
	password: "",
	generatePassword: true,
};

type ApiError = Error & { reason?: string; status?: number };
function errorMessage(error: unknown): string {
	const reason = (error as ApiError).reason;
	const messages: Record<string, string> = {
		SEAT_LIMIT_REACHED:
			"Đã hết chỗ người dùng. Hãy tăng seatBonus hoặc nâng gói trước khi tạo/kích hoạt thêm.",
		LAST_OWNER:
			"Không thể thay đổi: đây là chủ cửa hàng đang hoạt động cuối cùng.",
		FIELD_NOT_ALLOWED: "Dữ liệu chỉnh sửa chứa trường không được phép.",
		PASSWORD_MODE_INVALID: "Chỉ chọn một cách tạo mật khẩu: nhập hoặc tự động.",
		USERNAME_TAKEN: "Tên đăng nhập đã tồn tại trong cửa hàng này.",
	};
	if (reason && messages[reason]) return `${messages[reason]} (${reason})`;
	if ((error as ApiError).status === 404)
		return "Không tìm thấy người dùng trong cửa hàng này (có thể đã thuộc tenant khác).";
	return (error as Error).message || "Không thể thực hiện thao tác.";
}

export function TenantUsersPanel({ tenantId }: { tenantId: string }) {
	const canView = useHasPermission("admin.tenant-user:view");
	const accessToken = useAdminAuth((s) => s.accessToken);
	const [data, setData] = useState<ListTenantUsersResult | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY);
	const [showCreate, setShowCreate] = useState(false);
	const [editing, setEditing] = useState<TenantUserPublic | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [secret, setSecret] = useState<{ label: string; value: string } | null>(
		null,
	);
	const [copied, setCopied] = useState(false);

	const load = useCallback(
		async (pageToLoad: number) => {
			if (!accessToken || !tenantId || !canView) return;
			setLoading(true);
			setError(null);
			try {
				setData(
					await listTenantUsers(accessToken, tenantId, { page: pageToLoad }),
				);
			} catch (err) {
				setError(errorMessage(err));
			} finally {
				setLoading(false);
			}
		},
		[accessToken, canView, tenantId],
	);

	useEffect(() => {
		void load(currentPage);
	}, [currentPage, load]);
	if (!canView) return null;

	function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
		setForm((current) => ({ ...current, [field]: value }));
	}
	function closeEditor() {
		setShowCreate(false);
		setEditing(null);
		setForm(EMPTY);
	}
	function beginEdit(user: TenantUserPublic) {
		setEditing(user);
		setShowCreate(false);
		setForm({
			fullName: user.fullName,
			username: user.username,
			phone: user.phone ?? "",
			email: user.email ?? "",
			roleCode: user.roleCode,
			password: "",
			generatePassword: true,
		});
	}

	async function submitUser(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!accessToken) return;
		if (!form.fullName.trim() || !form.username.trim()) {
			setError("Họ tên và tên đăng nhập là bắt buộc.");
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			if (editing) {
				await updateTenantUser(accessToken, tenantId, editing.id, {
					fullName: form.fullName.trim(),
					username: form.username.trim(),
					phone: form.phone.trim(),
					email: form.email.trim(),
				});
			} else {
				const result = await createTenantUser(accessToken, tenantId, {
					fullName: form.fullName.trim(),
					username: form.username.trim(),
					roleCode: form.roleCode,
					phone: form.phone.trim() || undefined,
					email: form.email.trim() || undefined,
					...(form.generatePassword
						? { generatePassword: true as const }
						: { password: form.password }),
				});
				if (result.generatedPassword)
					setSecret({
						label: `Mật khẩu mới của ${result.user.username}`,
						value: result.generatedPassword,
					});
			}
			await load(currentPage);
			closeEditor();
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setSubmitting(false);
		}
	}

	async function handleRoleChange(
		user: TenantUserPublic,
		roleCode: TenantRoleCode,
	) {
		if (!accessToken || roleCode === user.roleCode) return;
		if (
			user.roleCode === "OWNER" &&
			!window.confirm(
				"Đổi vai trò chủ cửa hàng này? Cần bảo đảm vẫn còn một chủ cửa hàng hoạt động.",
			)
		)
			return;
		setError(null);
		setSubmitting(true);
		try {
			await changeTenantUserRole(accessToken, tenantId, user.id, roleCode);
			await load(currentPage);
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setSubmitting(false);
		}
	}

	async function mutate(
		user: TenantUserPublic,
		action: "deactivate" | "reactivate" | "reset",
	) {
		if (!accessToken) return;
		if (
			action === "deactivate" &&
			!window.confirm(`Vô hiệu hóa ${user.fullName}?`)
		)
			return;
		setError(null);
		setSubmitting(true);
		try {
			if (action === "deactivate")
				await deactivateTenantUser(accessToken, tenantId, user.id);
			if (action === "reactivate")
				await reactivateTenantUser(accessToken, tenantId, user.id);
			if (action === "reset") {
				if (!window.confirm(`Đặt lại mật khẩu cho ${user.fullName}?`)) return;
				const result = await resetTenantUserPassword(
					accessToken,
					tenantId,
					user.id,
					{ generatePassword: true },
				);
				if (result.generatedPassword)
					setSecret({
						label: `Mật khẩu mới của ${user.username}`,
						value: result.generatedPassword,
					});
			}
			await load(currentPage);
		} catch (err) {
			setError(errorMessage(err));
		} finally {
			setSubmitting(false);
		}
	}

	async function copySecret() {
		if (!secret) return;
		await navigator.clipboard.writeText(secret.value);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1500);
	}
	const seat = data?.seatUsage;
	const seatFull = Boolean(seat && seat.activeCount >= seat.effectiveMaxUsers);

	return (
		<section
			className="space-y-4 rounded-[14px] border border-border bg-card p-4 sm:p-5"
			aria-labelledby="tenant-users-title"
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 id="tenant-users-title" className="text-xl font-bold">
						Người dùng cửa hàng
					</h2>
					<p className="mt-1 text-base text-muted-foreground">
						Quản lý tài khoản thuộc riêng cửa hàng này.
					</p>
				</div>
				<button
					type="button"
					aria-label="Làm mới người dùng"
					onClick={() => void load(currentPage)}
					disabled={loading}
					className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-[10px] border border-border hover:bg-soft disabled:opacity-60"
				>
					<RefreshCcw className="size-5" aria-hidden />
				</button>
			</div>
			{seat ? (
				<div
					className={`rounded-[12px] border p-4 ${seatFull ? "border-[#e6a817]/50 bg-[#fff8e1]" : "border-border bg-soft/50"}`}
				>
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<span className="text-base font-semibold">
							Chỗ người dùng đang dùng
						</span>
						<strong className="text-xl">
							{seat.activeCount} / {seat.effectiveMaxUsers}
						</strong>
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						{seat.planCode
							? `Gói hiện tại: ${seat.planCode} · `
							: "Chưa có gói · "}
						Cộng thêm: {seat.seatBonus}
					</p>
					{seatFull ? (
						<p
							role="alert"
							className="mt-2 text-base font-semibold text-[#9a6800]"
						>
							SEAT_LIMIT_REACHED — Đã hết chỗ, không thể tạo hoặc kích hoạt
							người dùng mới.
						</p>
					) : null}
				</div>
			) : null}
			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-3 text-base text-destructive"
				>
					{error}
				</div>
			) : null}
			{secret ? (
				<div className="rounded-[12px] border border-[#e6a817]/50 bg-[#fff8e1] p-4">
					<div className="flex items-center gap-2 text-base font-semibold">
						<KeyRound className="size-5" aria-hidden />
						{secret.label} — chỉ hiển thị lần này
					</div>
					<div className="mt-3 flex flex-wrap gap-2">
						<code className="min-h-12 flex-1 rounded-[10px] bg-white px-3 py-3 text-base font-semibold">
							{secret.value}
						</code>
						<button
							type="button"
							onClick={() => void copySecret()}
							className="inline-flex min-h-12 items-center gap-2 rounded-[10px] border border-border bg-white px-4 text-sm font-semibold"
						>
							{copied ? "Đã sao chép" : "Sao chép"}
						</button>
						<button
							type="button"
							onClick={() => setSecret(null)}
							className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-[10px] border border-border bg-white"
							aria-label="Đóng mật khẩu"
						>
							<X className="size-5" aria-hidden />
						</button>
					</div>
					<p className="mt-2 text-sm text-[#9a6800]">
						Người dùng phải đổi mật khẩu ở lần đăng nhập tiếp theo.
					</p>
				</div>
			) : null}
			<Can permission="admin.tenant-user:manage">
				<div className="flex justify-end">
					<button
						type="button"
						disabled={seatFull || submitting}
						onClick={() => {
							setShowCreate(true);
							setEditing(null);
							setForm(EMPTY);
						}}
						className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-primary px-4 text-base font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
					>
						<Plus className="size-5" aria-hidden />
						Tạo người dùng
					</button>
				</div>
			</Can>
			{showCreate || editing ? (
				<UserForm
					form={form}
					editing={Boolean(editing)}
					submitting={submitting}
					setField={setField}
					onSubmit={submitUser}
					onCancel={closeEditor}
				/>
			) : null}
			{loading && !data ? (
				<p
					role="status"
					className="py-6 text-center text-base text-muted-foreground"
				>
					Đang tải người dùng…
				</p>
			) : data?.items.length ? (
				<>
					<div className="overflow-x-auto rounded-[12px] border border-border">
						<table className="w-full min-w-[850px] border-collapse text-left">
							<thead>
								<tr className="bg-soft text-sm text-muted-foreground">
									<th className="px-4 py-3 font-semibold">Người dùng</th>
									<th className="px-4 py-3 font-semibold">Liên hệ</th>
									<th className="px-4 py-3 font-semibold">Vai trò</th>
									<th className="px-4 py-3 font-semibold">Trạng thái</th>
									<th className="px-4 py-3 font-semibold">Đăng nhập cuối</th>
									<th className="px-4 py-3 text-right font-semibold">
										Hành động
									</th>
								</tr>
							</thead>
							<tbody>
								{data.items.map((user) => (
									<UserRow
										key={user.id}
										user={user}
										disabled={submitting}
										onEdit={beginEdit}
										onMutate={mutate}
										onRoleChange={handleRoleChange}
									/>
								))}
							</tbody>
						</table>
					</div>
					{data.total > data.pageSize ? (
						<DataPagination
							page={data.page}
							pageCount={Math.max(1, Math.ceil(data.total / data.pageSize))}
							total={data.total}
							pageSize={data.pageSize}
							noun="người dùng"
							onPage={setCurrentPage}
						/>
					) : null}
				</>
			) : (
				<p className="rounded-[12px] border border-dashed border-border p-8 text-center text-base text-muted-foreground">
					Chưa có người dùng.
				</p>
			)}
		</section>
	);
}

function UserForm({
	form,
	editing,
	submitting,
	setField,
	onSubmit,
	onCancel,
}: {
	form: FormState;
	editing: boolean;
	submitting: boolean;
	setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
	onCancel: () => void;
}) {
	return (
		<form
			onSubmit={onSubmit}
			className="rounded-[12px] border border-primary/30 bg-soft/40 p-4"
		>
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-bold">
					{editing ? "Chỉnh sửa người dùng" : "Tạo người dùng"}
				</h3>
				<button
					type="button"
					onClick={onCancel}
					className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-[10px] border border-border bg-white"
					aria-label="Đóng biểu mẫu"
				>
					<X className="size-5" aria-hidden />
				</button>
			</div>
			<div className="mt-4 grid gap-3 sm:grid-cols-2">
				<label className="block">
					<span className="text-base font-semibold">Họ và tên</span>
					<input
						className={inputClass}
						aria-label="Họ và tên"
						value={form.fullName}
						onChange={(e) => setField("fullName", e.target.value)}
						required
					/>
				</label>
				<label className="block">
					<span className="text-base font-semibold">Tên đăng nhập</span>
					<input
						className={inputClass}
						aria-label="Tên đăng nhập"
						value={form.username}
						onChange={(e) => setField("username", e.target.value)}
						required
					/>
				</label>
				<label className="block">
					<span className="text-base font-semibold">Số điện thoại</span>
					<input
						className={inputClass}
						value={form.phone}
						onChange={(e) => setField("phone", e.target.value)}
					/>
				</label>
				<label className="block">
					<span className="text-base font-semibold">Email</span>
					<input
						className={inputClass}
						type="email"
						value={form.email}
						onChange={(e) => setField("email", e.target.value)}
					/>
				</label>
				{!editing ? (
					<>
						<label className="block">
							<span className="text-base font-semibold">Vai trò</span>
							<select
								className={inputClass}
								value={form.roleCode}
								onChange={(e) =>
									setField("roleCode", e.target.value as TenantRoleCode)
								}
							>
								{ROLES.map((role) => (
									<option key={role} value={role}>
										{ROLE_LABEL[role]}
									</option>
								))}
							</select>
						</label>
						<fieldset className="block">
							<legend className="text-base font-semibold">Mật khẩu</legend>
							<div className="mt-1.5 flex min-h-12 items-center gap-3">
								<label className="flex items-center gap-2 text-base">
									<input
										type="radio"
										checked={form.generatePassword}
										onChange={() => setField("generatePassword", true)}
									/>
									Tạo tự động
								</label>
								<label className="flex items-center gap-2 text-base">
									<input
										type="radio"
										checked={!form.generatePassword}
										onChange={() => setField("generatePassword", false)}
									/>
									Nhập
								</label>
							</div>
							{!form.generatePassword ? (
								<input
									className={inputClass}
									type="password"
									value={form.password}
									onChange={(e) => setField("password", e.target.value)}
									minLength={12}
									required
								/>
							) : null}
						</fieldset>
					</>
				) : null}
			</div>
			<Can permission="admin.tenant-user:manage">
				<button
					type="submit"
					disabled={submitting}
					className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-primary px-4 text-base font-semibold text-white disabled:opacity-50"
				>
					<Save className="size-5" aria-hidden />
					{submitting
						? "Đang lưu…"
						: editing
							? "Lưu thay đổi"
							: "Tạo người dùng"}
				</button>
			</Can>
		</form>
	);
}

function UserRow({
	user,
	disabled,
	onEdit,
	onMutate,
	onRoleChange,
}: {
	user: TenantUserPublic;
	disabled: boolean;
	onEdit: (user: TenantUserPublic) => void;
	onMutate: (
		user: TenantUserPublic,
		action: "deactivate" | "reactivate" | "reset",
	) => Promise<void>;
	onRoleChange: (
		user: TenantUserPublic,
		roleCode: TenantRoleCode,
	) => Promise<void>;
}) {
	return (
		<tr className="border-t border-border align-middle">
			<td className="px-4 py-3.5">
				<div className="font-semibold">{user.fullName}</div>
				<div className="font-mono text-sm text-muted-foreground">
					@{user.username}
				</div>
			</td>
			<td className="px-4 py-3.5 text-sm text-muted-foreground">
				{user.email || user.phone || "—"}
			</td>
			<td className="px-4 py-3.5">
				<Can permission="admin.tenant-user:manage">
					<select
						aria-label={`Đổi vai trò ${user.fullName}`}
						value={user.roleCode}
						onChange={(e) =>
							void onRoleChange(user, e.target.value as TenantRoleCode)
						}
						disabled={disabled}
						className="min-h-12 rounded-[10px] border border-border bg-background px-3 text-sm"
					>
						{ROLES.map((role) => (
							<option key={role} value={role}>
								{ROLE_LABEL[role]}
							</option>
						))}
					</select>
				</Can>
			</td>
			<td className="px-4 py-3.5">
				<span
					className={`inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${user.status === "ACTIVE" ? "bg-[#e8f5e9] text-[#2e7d32]" : "bg-soft text-muted-foreground"}`}
				>
					{user.status === "ACTIVE" ? "Hoạt động" : "Vô hiệu hóa"}
				</span>
			</td>
			<td className="px-4 py-3.5 text-sm text-muted-foreground">
				{user.lastLoginAt
					? new Date(user.lastLoginAt).toLocaleString("vi-VN")
					: "Chưa đăng nhập"}
			</td>
			<td className="px-4 py-3.5">
				<Can permission="admin.tenant-user:manage">
					<div className="flex justify-end gap-1">
						<button
							type="button"
							disabled={disabled}
							onClick={() => onEdit(user)}
							className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-[10px] border border-border hover:bg-soft"
							aria-label={`Sửa ${user.fullName}`}
						>
							<Pencil className="size-4" aria-hidden />
						</button>
						<button
							type="button"
							disabled={disabled}
							onClick={() => void onMutate(user, "reset")}
							className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-[10px] border border-border hover:bg-soft"
							aria-label={`Đặt lại mật khẩu ${user.fullName}`}
						>
							<KeyRound className="size-4" aria-hidden />
						</button>
						{user.status === "ACTIVE" ? (
							<button
								type="button"
								disabled={disabled}
								onClick={() => void onMutate(user, "deactivate")}
								className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-[10px] border border-[#ffcdd2] text-[#c62828] hover:bg-[#ffebee]"
								aria-label={`Vô hiệu hóa ${user.fullName}`}
							>
								<UserMinus className="size-4" aria-hidden />
							</button>
						) : (
							<button
								type="button"
								disabled={disabled}
								onClick={() => void onMutate(user, "reactivate")}
								className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-[10px] border border-[#c8e6c9] text-[#2e7d32] hover:bg-[#e8f5e9]"
								aria-label={`Kích hoạt ${user.fullName}`}
							>
								<UserCheck className="size-4" aria-hidden />
							</button>
						)}
					</div>
				</Can>
			</td>
		</tr>
	);
}
