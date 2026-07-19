"use client";

import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AdminPublicShape } from "@/lib/admin-api/admin-users";
import type { RolePublicShape } from "@/lib/admin-api/roles";
import { labelRoleCode } from "@/lib/admin-labels";

export interface CreateSubmit {
	email: string;
	password: string;
	fullName: string;
	roleIds: string[];
}

export interface UpdateSubmit {
	fullName?: string;
	roleIds?: string[];
}

interface CreateProps {
	mode: "create";
	roles: RolePublicShape[];
	onSubmit: (input: CreateSubmit) => Promise<void>;
}

interface EditProps {
	mode: "edit";
	admin: AdminPublicShape;
	roles: RolePublicShape[];
	disabled?: boolean;
	disabledReason?: string;
	onSubmit: (input: UpdateSubmit) => Promise<void>;
}

type Props = CreateProps | EditProps;

/**
 * Form thuan (khong boc modal) cho create/edit admin user.
 * Tach khoi AdminUserFormModal de chap hanh DESIGN.md §24.
 * F-17: mode="edit" nhan prop `disabled` chan thao tac tren chinh admin
 * dang dang nhap.
 */
export function AdminUserEditorForm(props: Props) {
	const isEdit = props.mode === "edit";
	const admin = isEdit ? props.admin : undefined;
	const adminOnlyRoles = useMemo(
		() => props.roles.filter((r) => r.isAdmin),
		[props.roles],
	);
	const initialRoleIds = useMemo(
		() =>
			isEdit
				? props.roles
						.filter((r) => (admin?.roles ?? []).includes(r.code))
						.map((r) => r.id)
				: [],
		[isEdit, props.roles, admin?.roles],
	);

	const [fullName, setFullName] = useState(admin?.fullName ?? "");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [roleIds, setRoleIds] = useState<Set<string>>(
		() => new Set(initialRoleIds),
	);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Reset form khi chuyen sang admin khac. Dung `admin?.id` (string) thay vi
	// ca object `admin` de tranh re-sync lien tuc khi parent re-render voi
	// reference moi nhung cung noi dung.
	useEffect(() => {
		setFullName(admin?.fullName ?? "");
		setError(null);
		setRoleIds(new Set(initialRoleIds));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [admin?.fullName, initialRoleIds]);

	function toggle(id: string) {
		setRoleIds((cur) => {
			const next = new Set(cur);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			if (isEdit && admin) {
				const payload: UpdateSubmit = {
					fullName,
					roleIds: Array.from(roleIds),
				};
				await props.onSubmit(payload);
			} else {
				await props.onSubmit({
					email,
					password,
					fullName,
					roleIds: Array.from(roleIds),
				});
			}
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	}

	const disabled = isEdit ? Boolean(props.disabled) : false;
	const submitDisabled =
		disabled ||
		submitting ||
		!fullName ||
		(!isEdit && (!email || password.length < 12)) ||
		roleIds.size === 0;

	return (
		<form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
			{!isEdit ? (
				<>
					<label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Email
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className="mt-1.5 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
							placeholder="admin@nomogreen.vn"
						/>
					</label>
					<label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Mật khẩu
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={12}
							className="mt-1.5 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
							placeholder="Tối thiểu 12 ký tự, có chữ + số + ký tự đặc biệt"
						/>
					</label>
				</>
			) : null}

			<label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				Họ và tên
				<input
					type="text"
					value={fullName}
					onChange={(e) => setFullName(e.target.value)}
					required
					disabled={disabled}
					maxLength={120}
					className="mt-1.5 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-soft disabled:text-muted-foreground"
				/>
			</label>

			<div>
				<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Vai trò
				</div>
				<div className="mt-2 space-y-1 rounded-[10px] border border-border bg-soft/40 p-3">
					{adminOnlyRoles.map((r) => {
						const checked = roleIds.has(r.id);
						return (
							<label
								key={r.id}
								className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
									disabled ? "opacity-60" : "hover:bg-white"
								}`}
							>
								<input
									type="checkbox"
									checked={checked}
									disabled={disabled}
									onChange={() => toggle(r.id)}
									className="size-4"
									aria-label={r.code}
								/>
								<span className="text-xs" title={r.code}>
									{labelRoleCode(r.code)}
								</span>
								<span className="text-muted-foreground">— {r.name}</span>
							</label>
						);
					})}
				</div>
				<p className="mt-1 text-[11px] text-muted-foreground">
					Đã chọn: {roleIds.size} vai trò
				</p>
			</div>

			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
				>
					{error}
				</div>
			) : null}

			{disabled && "disabledReason" in props && props.disabledReason ? (
				<p className="rounded-[10px] border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-[#9a6800]">
					{props.disabledReason}
				</p>
			) : null}

			<div className="flex items-center justify-end gap-2 pt-2">
				<button
					type="submit"
					disabled={submitDisabled}
					className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
				>
					<Save className="size-4" aria-hidden />
					{submitting ? "Đang lưu…" : isEdit ? "Lưu" : "Tạo"}
				</button>
			</div>
		</form>
	);
}
