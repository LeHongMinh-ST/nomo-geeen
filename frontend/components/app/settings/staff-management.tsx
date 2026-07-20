"use client";

import {
	KeyRound,
	Pencil,
	Plus,
	RefreshCcw,
	ShieldCheck,
	UserCheck,
	UserMinus,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	changeTenantUserRole,
	createTenantUser,
	deactivateTenantUser,
	type TenantRoleCode,
	type TenantUser,
	listTenantUsers,
	 reactivateTenantUser,
	resetTenantUserPassword,
	updateTenantUser,
} from "@/lib/tenant-users-api";
import { useUserAuth } from "@/stores/user-auth-store";

const ROLE_LABEL: Record<TenantRoleCode, string> = {
	OWNER: "Chủ cửa hàng",
	MANAGER: "Quản lý",
	STAFF: "Nhân viên",
};

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

type Modal = { kind: "create" } | { kind: "edit"; user: TenantUser } | null;
type ApiError = Error & { reason?: string; status?: number };

function errorMessage(error: unknown): string {
	const reason = (error as ApiError).reason;
	if (reason === "SEAT_LIMIT_REACHED")
		return "Đã hết chỗ người dùng. Hãy liên hệ quản trị viên để tăng seat.";
	if (reason === "LAST_OWNER")
		return "Không thể thay đổi hoặc khóa chủ cửa hàng cuối cùng.";
	if (reason === "USERNAME_TAKEN") return "Tên đăng nhập đã được sử dụng.";
	if (reason === "PASSWORD_MODE_INVALID") return "Vui lòng chọn đúng một cách đặt mật khẩu.";
	if ((error as ApiError).status === 403) return "Bạn không có quyền thực hiện thao tác này.";
	if ((error as ApiError).status === 401) return "Phiên đăng nhập đã hết hạn.";
	return error instanceof Error ? error.message : "Không thể hoàn tất thao tác.";
}

export function StaffManagement() {
	const user = useUserAuth((state) => state.user);
	const canView = Boolean(user?.permissions.includes("user:view"));
	const canCreate = Boolean(user?.permissions.includes("user:create"));
	const canEdit = Boolean(user?.permissions.includes("user:edit"));
	const [items, setItems] = useState<TenantUser[]>([]);
	const [seat, setSeat] = useState<Awaited<ReturnType<typeof listTenantUsers>>["seatUsage"] | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [modal, setModal] = useState<Modal>(null);
	const [form, setForm] = useState<FormState>(EMPTY);
	const [secret, setSecret] = useState("");

	const load = useCallback(async () => {
		if (!canView) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError("");
		try {
			const result = await listTenantUsers();
			setItems(result.items);
			setSeat(result.seatUsage);
		} catch (nextError) {
			setError(errorMessage(nextError));
		} finally {
			setLoading(false);
		}
	}, [canView]);

	useEffect(() => {
		void load();
	}, [load]);

	if (!canView) {
		return (
			<div className="rounded-[16px] border border-border bg-card p-6">
				<h1 className="text-2xl font-bold">Nhân viên</h1>
				<p className="mt-2 text-base text-muted-foreground">
					Bạn không có quyền xem danh sách nhân viên cửa hàng.
				</p>
			</div>
		);
	}

	const seatFull = Boolean(seat && seat.activeCount >= seat.effectiveMaxUsers);
	const canManageTarget = (target: TenantUser) =>
		canEdit && user?.role !== "STAFF" && (user?.role === "OWNER" || target.roleCode !== "OWNER");

	function openCreate() {
		setForm(EMPTY);
		setSecret("");
		setModal({ kind: "create" });
		setError("");
	}

	function openEdit(target: TenantUser) {
		setForm({
			...EMPTY,
			fullName: target.fullName,
			username: target.username,
			phone: target.phone ?? "",
			email: target.email ?? "",
			roleCode: target.roleCode,
		});
		setSecret("");
		setModal({ kind: "edit", user: target });
		setError("");
	}

	async function submitForm(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!modal) return;
		setSubmitting(true);
		setError("");
		try {
			if (modal.kind === "create") {
				const result = await createTenantUser({
					fullName: form.fullName,
					username: form.username,
					roleCode: form.roleCode,
					phone: form.phone || undefined,
					email: form.email || undefined,
					...(form.generatePassword
						? { generatePassword: true as const }
						: { password: form.password }),
				});
				if (result.generatedPassword) setSecret(result.generatedPassword);
				else setModal(null);
			} else {
				await updateTenantUser(modal.user.id, {
					fullName: form.fullName,
					username: form.username,
					phone: form.phone || undefined,
					email: form.email || undefined,
				});
				setModal(null);
			}
			await load();
		} catch (nextError) {
			setError(errorMessage(nextError));
		} finally {
			setSubmitting(false);
		}
	}

	async function changeRole(target: TenantUser, roleCode: TenantRoleCode) {
		if (!canManageTarget(target) || roleCode === target.roleCode) return;
		if (!window.confirm(`Đổi vai trò của ${target.fullName} thành ${ROLE_LABEL[roleCode]}?`)) return;
		setSubmitting(true);
		setError("");
		try {
			await changeTenantUserRole(target.id, roleCode);
			await load();
		} catch (nextError) {
			setError(errorMessage(nextError));
		} finally {
			setSubmitting(false);
		}
	}

	async function toggleStatus(target: TenantUser) {
		if (!canManageTarget(target)) return;
		const activating = target.status === "DISABLED";
		if (!window.confirm(`${activating ? "Kích hoạt lại" : "Vô hiệu hóa"} ${target.fullName}?`)) return;
		setSubmitting(true);
		setError("");
		try {
			if (activating) await reactivateTenantUser(target.id);
			else await deactivateTenantUser(target.id);
			await load();
		} catch (nextError) {
			setError(errorMessage(nextError));
		} finally {
			setSubmitting(false);
		}
	}

	async function resetPassword(target: TenantUser) {
		if (!canManageTarget(target)) return;
		if (!window.confirm(`Tạo mật khẩu mới cho ${target.fullName}?`)) return;
		setSubmitting(true);
		setError("");
		try {
			const result = await resetTenantUserPassword(target.id, { generatePassword: true });
			setSecret(result.generatedPassword ?? "");
		} catch (nextError) {
			setError(errorMessage(nextError));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
			<header className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Nhân viên</h1>
					<p className="mt-1 text-base text-muted-foreground">Quản lý tài khoản thuộc cửa hàng này.</p>
				</div>
				<button type="button" aria-label="Làm mới" onClick={() => void load()} disabled={loading} className="flex min-h-12 min-w-12 items-center justify-center rounded-[10px] border border-border hover:bg-soft disabled:opacity-60">
					<RefreshCcw className="size-5" aria-hidden />
				</button>
			</header>

			{seat ? <div className={`rounded-[16px] border p-4 ${seatFull ? "border-[#e6a817]/60 bg-[#fff8e1]" : "border-[#d7e8d2] bg-[#f3f8f1]"}`}>
				<div className="flex items-center justify-between gap-3"><span className="text-base font-semibold">Chỗ người dùng</span><strong className="text-xl">{seat.activeCount} / {seat.effectiveMaxUsers}</strong></div>
				<p className="mt-1 text-sm text-muted-foreground">{seat.planCode ? `Gói ${seat.planCode}` : "Chưa có gói"} · Cộng thêm {seat.seatBonus} chỗ</p>
				{seatFull ? <p className="mt-2 text-base font-semibold text-[#9a6800]" role="alert">Đã hết chỗ. Liên hệ quản trị viên để thêm seat.</p> : null}
			</div> : null}

			{error ? <p className="rounded-[10px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-base text-destructive" role="alert">{error}</p> : null}
			{secret ? <SecretCard value={secret} onClose={() => setSecret("")} /> : null}

			{canCreate ? <button type="button" onClick={openCreate} disabled={seatFull || submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-base font-semibold text-white hover:bg-primary/90 disabled:opacity-50 sm:w-fit"><Plus className="size-5" aria-hidden />Tạo nhân viên</button> : null}

			{loading ? <p className="py-8 text-center text-base text-muted-foreground" role="status">Đang tải danh sách…</p> : items.length === 0 ? <p className="rounded-[16px] border border-dashed border-border p-8 text-center text-base text-muted-foreground">Chưa có người dùng.</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((target) => <StaffCard key={target.id} target={target} canManage={canManageTarget(target)} disabled={submitting} onEdit={() => openEdit(target)} onRoleChange={(role) => void changeRole(target, role)} onToggle={() => void toggleStatus(target)} onReset={() => void resetPassword(target)} />)}</div>}

			{modal ? <StaffForm modal={modal} form={form} submitting={submitting} error={error} setForm={setForm} onSubmit={submitForm} onClose={() => setModal(null)} /> : null}
		</div>
	);
}

function StaffCard({ target, canManage, disabled, onEdit, onRoleChange, onToggle, onReset }: { target: TenantUser; canManage: boolean; disabled: boolean; onEdit: () => void; onRoleChange: (role: TenantRoleCode) => void; onToggle: () => void; onReset: () => void }) {
	return <article className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card">
		<div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground">{target.fullName.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-semibold">{target.fullName}</h2><p className="truncate text-sm text-muted-foreground">@{target.username}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${target.status === "ACTIVE" ? "bg-[#e8f5e9] text-[#2e7d32]" : "bg-[#f4f5f4] text-[#6b716b]"}`}>{target.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}</span></div>
		<div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-4" aria-hidden />{ROLE_LABEL[target.roleCode]}{target.phone ? ` · ${target.phone}` : ""}</div>
		{canManage ? <div className="grid grid-cols-2 gap-2 border-t border-border pt-3"><button type="button" onClick={onEdit} disabled={disabled} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-[10px] border border-border text-sm font-semibold hover:bg-soft disabled:opacity-50"><Pencil className="size-4" aria-hidden />Sửa</button><button type="button" onClick={onReset} disabled={disabled} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-[10px] border border-border text-sm font-semibold hover:bg-soft disabled:opacity-50"><KeyRound className="size-4" aria-hidden />Đặt MK</button><select aria-label={`Vai trò ${target.fullName}`} value={target.roleCode} onChange={(event) => onRoleChange(event.target.value as TenantRoleCode)} disabled={disabled} className="min-h-11 rounded-[10px] border border-border bg-white px-2 text-sm"><option value="STAFF">Nhân viên</option><option value="MANAGER">Quản lý</option><option value="OWNER">Chủ cửa hàng</option></select><button type="button" onClick={onToggle} disabled={disabled} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-[10px] border border-border text-sm font-semibold hover:bg-soft disabled:opacity-50">{target.status === "ACTIVE" ? <UserMinus className="size-4" aria-hidden /> : <UserCheck className="size-4" aria-hidden />}{target.status === "ACTIVE" ? "Khóa" : "Mở khóa"}</button></div> : null}
	</article>;
}

function SecretCard({ value, onClose }: { value: string; onClose: () => void }) {
	return <div className="rounded-[12px] border border-[#e6a817]/60 bg-[#fff8e1] p-4"><div className="flex items-center justify-between gap-3"><p className="text-base font-semibold">Mật khẩu mới — chỉ hiển thị lần này</p><button type="button" onClick={onClose} aria-label="Đóng" className="flex size-10 items-center justify-center rounded-[10px] hover:bg-white"><X className="size-5" aria-hidden /></button></div><div className="mt-3 flex flex-wrap gap-2"><code className="min-h-12 flex-1 rounded-[10px] bg-white px-3 py-3 text-base font-semibold">{value}</code><button type="button" onClick={() => void navigator.clipboard.writeText(value)} className="min-h-12 rounded-[10px] border border-border bg-white px-4 text-sm font-semibold">Sao chép</button></div><p className="mt-2 text-sm text-[#9a6800]">Tài khoản phải đổi mật khẩu ở lần đăng nhập tiếp theo.</p></div>;
}

function StaffForm({ modal, form, submitting, error, setForm, onSubmit, onClose }: { modal: Exclude<Modal, null>; form: FormState; submitting: boolean; error: string; setForm: React.Dispatch<React.SetStateAction<FormState>>; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
	const editing = modal.kind === "edit";
	return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={editing ? "Sửa nhân viên" : "Tạo nhân viên"}><form onSubmit={onSubmit} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[18px] bg-card p-5 sm:max-w-lg sm:rounded-[18px]"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">{editing ? "Sửa thông tin nhân viên" : "Tạo nhân viên"}</h2><button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-[10px] hover:bg-soft" aria-label="Đóng"><X className="size-5" aria-hidden /></button></div><div className="mt-5 grid gap-4"><label className="grid gap-1.5 text-base font-medium">Họ và tên<input required value={form.fullName} onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))} className="min-h-12 rounded-[10px] border border-border px-3 text-base" /></label><label className="grid gap-1.5 text-base font-medium">Tên đăng nhập<input required value={form.username} onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))} className="min-h-12 rounded-[10px] border border-border px-3 text-base" /></label><label className="grid gap-1.5 text-base font-medium">Số điện thoại<input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} className="min-h-12 rounded-[10px] border border-border px-3 text-base" /></label><label className="grid gap-1.5 text-base font-medium">Email<input type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} className="min-h-12 rounded-[10px] border border-border px-3 text-base" /></label>{!editing ? <><label className="grid gap-1.5 text-base font-medium">Vai trò<select value={form.roleCode} onChange={(e) => setForm((s) => ({ ...s, roleCode: e.target.value as TenantRoleCode }))} className="min-h-12 rounded-[10px] border border-border bg-white px-3 text-base"><option value="STAFF">Nhân viên</option><option value="MANAGER">Quản lý</option><option value="OWNER">Chủ cửa hàng</option></select></label><label className="flex min-h-12 items-center gap-3 text-base"><input type="checkbox" checked={form.generatePassword} onChange={(e) => setForm((s) => ({ ...s, generatePassword: e.target.checked }))} className="size-5" />Tự tạo mật khẩu an toàn</label>{!form.generatePassword ? <label className="grid gap-1.5 text-base font-medium">Mật khẩu<input required minLength={12} type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} className="min-h-12 rounded-[10px] border border-border px-3 text-base" /></label> : null}</> : null}</div>{error ? <p className="mt-4 rounded-[10px] bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}<div className="mt-5 flex gap-3"><button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-[10px] border border-border text-base font-semibold">Hủy</button><button type="submit" disabled={submitting} className="min-h-12 flex-1 rounded-[10px] bg-primary text-base font-semibold text-white disabled:opacity-50">{submitting ? "Đang lưu…" : "Lưu"}</button></div></form></div>;
}
