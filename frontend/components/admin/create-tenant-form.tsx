"use client";

import { ArrowLeft, Check, Copy, KeyRound, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	type CreateTenantRequest,
	createTenant,
	type TenantOwnerCreatedResponse,
	type TenantType,
} from "@/lib/admin-api/tenants";
import { useAdminAuth } from "@/stores/admin-auth-store";

const TYPES: Array<{ value: TenantType; label: string }> = [
	{ value: "HOUSEHOLD", label: "Hộ gia đình" },
	{ value: "RETAIL_DEALER", label: "Đại lý bán lẻ" },
	{ value: "COOPERATIVE", label: "Hợp tác xã" },
	{ value: "DISTRIBUTOR", label: "Nhà phân phối" },
	{ value: "FARM", label: "Trang trại" },
];
type FormState = {
	name: string;
	slug: string;
	tenantType: TenantType;
	logoUrl: string;
	seatBonus: string;
	fullName: string;
	username: string;
	phone: string;
	email: string;
	password: string;
	mustChangePassword: boolean;
	generatePassword: boolean;
};
const INITIAL: FormState = {
	name: "",
	slug: "",
	tenantType: "RETAIL_DEALER",
	logoUrl: "",
	seatBonus: "10",
	fullName: "",
	username: "",
	phone: "",
	email: "",
	password: "",
	mustChangePassword: false,
	generatePassword: true,
};
const inputClass =
	"mt-1.5 min-h-12 w-full rounded-[10px] border border-border bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export function CreateTenantForm() {
	const router = useRouter();
	const accessToken = useAdminAuth((s) => s.accessToken);
	const [form, setForm] = useState<FormState>(INITIAL);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [created, setCreated] = useState<TenantOwnerCreatedResponse | null>(
		null,
	);
	const [copied, setCopied] = useState(false);
	const setField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
		setForm((cur) => ({ ...cur, [field]: value }));
	function validate() {
		if (!form.name.trim()) return "Vui lòng nhập tên cửa hàng.";
		const slug = form.slug.trim().toLowerCase();
		if (
			slug.length < 3 ||
			slug.length > 63 ||
			!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
		)
			return "Slug phải dài 3–63 ký tự, chỉ gồm chữ thường, số và dấu gạch ngang.";
		if (!form.fullName.trim()) return "Vui lòng nhập họ và tên chủ cửa hàng.";
		if (!form.username.trim())
			return "Vui lòng nhập tên đăng nhập chủ cửa hàng.";
		const seats = Number(form.seatBonus);
		if (!Number.isInteger(seats) || seats < 1 || seats > 999)
			return "Số chỗ cộng thêm phải từ 1 đến 999.";
		if (!form.generatePassword && form.password.length < 12)
			return "Mật khẩu phải có ít nhất 12 ký tự.";
		return null;
	}
	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const validation = validate();
		if (validation) {
			setError(validation);
			return;
		}
		if (!accessToken) {
			setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
			return;
		}
		setSubmitting(true);
		setError(null);
		const owner = {
			fullName: form.fullName.trim(),
			username: form.username.trim(),
			...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
			...(form.email.trim() ? { email: form.email.trim() } : {}),
			mustChangePassword: form.mustChangePassword,
			...(form.generatePassword
				? { generatePassword: true as const }
				: { password: form.password }),
		};
		const body: CreateTenantRequest = {
			tenant: {
				name: form.name.trim(),
				slug: form.slug.trim().toLowerCase(),
				tenantType: form.tenantType,
				seatBonus: Number(form.seatBonus),
				...(form.logoUrl.trim() ? { logoUrl: form.logoUrl.trim() } : {}),
			},
			owner,
		};
		try {
			setCreated(await createTenant(accessToken, body));
		} catch (err) {
			const reason = (err as Error & { reason?: string }).reason;
			const messages: Record<string, string> = {
				SLUG_TAKEN: "Slug này đã được sử dụng. Vui lòng chọn slug khác.",
				USERNAME_TAKEN: "Tên đăng nhập đã tồn tại trong cửa hàng này.",
				PASSWORD_MODE_INVALID:
					"Chỉ chọn một cách tạo mật khẩu: nhập hoặc tự động.",
			};
			setError(
				messages[reason ?? ""] ??
					(err as Error).message ??
					"Không thể tạo cửa hàng.",
			);
		} finally {
			setSubmitting(false);
		}
	}
	async function copyPassword() {
		if (!created?.generatedPassword) return;
		await navigator.clipboard.writeText(created.generatedPassword);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1800);
	}
	if (created)
		return (
			<section className="mx-auto max-w-2xl space-y-5">
				<div className="rounded-[16px] border border-[#b8ddb0] bg-[#f3f8f1] p-5 sm:p-7">
					<div className="flex size-12 items-center justify-center rounded-full bg-primary text-white">
						<Check aria-hidden />
					</div>
					<h1 className="mt-4 text-2xl font-bold">Đã tạo cửa hàng</h1>
					<p className="mt-2 text-base text-muted-foreground">
						{created.tenant.name} đã sẵn sàng. Hãy lưu thông tin trước khi mở
						trang chi tiết.
					</p>
					{created.generatedPassword ? (
						<div className="mt-5 rounded-[12px] border border-[#e6a817]/40 bg-white p-4">
							<div className="flex items-center gap-2 text-sm font-semibold">
								<KeyRound className="size-4" aria-hidden />
								Mật khẩu tạo tự động (chỉ hiển thị lần này)
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								<code className="min-h-12 flex-1 rounded-[10px] bg-soft px-3 py-3 text-base font-semibold tracking-wide">
									{created.generatedPassword}
								</code>
								<button
									type="button"
									onClick={() => void copyPassword()}
									className="inline-flex min-h-12 items-center gap-2 rounded-[10px] border border-border px-4 text-sm font-semibold hover:bg-soft"
								>
									<Copy className="size-4" aria-hidden />
									{copied ? "Đã sao chép" : "Sao chép"}
								</button>
							</div>
						</div>
					) : (
						<p className="mt-5 text-base text-muted-foreground">
							Chủ cửa hàng dùng mật khẩu bạn đã nhập.
						</p>
					)}
				</div>
				<button
					type="button"
					onClick={() => router.push(`/admin/tenants/${created.tenant.id}`)}
					className="inline-flex min-h-12 w-full items-center justify-center rounded-[10px] bg-primary px-5 text-base font-semibold text-white hover:bg-primary/90"
				>
					Mở trang cửa hàng
				</button>
			</section>
		);
	return (
		<form
			onSubmit={(e) => void submit(e)}
			className="mx-auto max-w-3xl space-y-6 pb-28"
		>
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.back()}
					className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-[10px] border border-border hover:bg-soft"
					aria-label="Quay lại"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div>
					<h1 className="text-2xl font-bold">Tạo cửa hàng</h1>
					<p className="mt-1 text-base text-muted-foreground">
						Tạo cửa hàng và tài khoản chủ cửa hàng trong một bước.
					</p>
				</div>
			</div>
			<section className="rounded-[16px] border border-border bg-card p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] sm:p-6">
				<h2 className="text-xl font-bold">Thông tin cửa hàng</h2>
				<div className="mt-5 grid gap-4 sm:grid-cols-2">
					<label className="block sm:col-span-2">
						<span className="text-base font-semibold">Tên cửa hàng</span>
						<input
							className={inputClass}
							aria-label="Tên cửa hàng"
							value={form.name}
							onChange={(e) => setField("name", e.target.value)}
							required
							maxLength={200}
						/>
					</label>
					<label className="block">
						<span className="text-base font-semibold">Slug</span>
						<input
							className={`${inputClass} font-mono`}
							aria-label="Slug"
							value={form.slug}
							onChange={(e) => setField("slug", e.target.value)}
							required
							maxLength={63}
						/>
						<span className="mt-1 block text-sm text-muted-foreground">
							Ví dụ: cua-hang-minh
						</span>
					</label>
					<label className="block">
						<span className="text-base font-semibold">Loại cửa hàng</span>
						<select
							className={inputClass}
							value={form.tenantType}
							onChange={(e) =>
								setField("tenantType", e.target.value as TenantType)
							}
						>
							{TYPES.map((t) => (
								<option key={t.value} value={t.value}>
									{t.label}
								</option>
							))}
						</select>
					</label>
					<label className="block">
						<span className="text-base font-semibold">Số chỗ cộng thêm</span>
						<input
							className={inputClass}
							type="number"
							min={1}
							max={999}
							value={form.seatBonus}
							onChange={(e) => setField("seatBonus", e.target.value)}
						/>
						<span className="mt-1 block text-sm text-muted-foreground">
							Mặc định 10 người dùng.
						</span>
					</label>
					<label className="block">
						<span className="text-base font-semibold">
							Logo URL{" "}
							<span className="font-normal text-muted-foreground">
								(không bắt buộc)
							</span>
						</span>
						<input
							className={inputClass}
							type="url"
							value={form.logoUrl}
							onChange={(e) => setField("logoUrl", e.target.value)}
							placeholder="https://…"
						/>
					</label>
				</div>
			</section>
			<section className="rounded-[16px] border border-border bg-card p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] sm:p-6">
				<h2 className="text-xl font-bold">Chủ cửa hàng</h2>
				<div className="mt-5 grid gap-4 sm:grid-cols-2">
					<label className="block sm:col-span-2">
						<span className="text-base font-semibold">Họ và tên</span>
						<input
							className={inputClass}
							aria-label="Họ và tên"
							value={form.fullName}
							onChange={(e) => setField("fullName", e.target.value)}
							required
							maxLength={200}
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
							maxLength={64}
							autoComplete="username"
						/>
					</label>
					<label className="block">
						<span className="text-base font-semibold">
							Số điện thoại{" "}
							<span className="font-normal text-muted-foreground">
								(không bắt buộc)
							</span>
						</span>
						<input
							className={inputClass}
							type="tel"
							value={form.phone}
							onChange={(e) => setField("phone", e.target.value)}
						/>
					</label>
					<label className="block sm:col-span-2">
						<span className="text-base font-semibold">
							Email{" "}
							<span className="font-normal text-muted-foreground">
								(không bắt buộc)
							</span>
						</span>
						<input
							className={inputClass}
							type="email"
							value={form.email}
							onChange={(e) => setField("email", e.target.value)}
							autoComplete="email"
						/>
					</label>
					<fieldset className="sm:col-span-2">
						<legend className="text-base font-semibold">Mật khẩu</legend>
						<div className="mt-2 grid gap-2 sm:grid-cols-2">
							<label className="flex min-h-12 items-center gap-3 rounded-[10px] border border-border px-3">
								<input
									type="radio"
									checked={!form.generatePassword}
									onChange={() => setField("generatePassword", false)}
								/>
								Nhập mật khẩu
							</label>
							<label className="flex min-h-12 items-center gap-3 rounded-[10px] border border-border px-3">
								<input
									type="radio"
									checked={form.generatePassword}
									onChange={() => setField("generatePassword", true)}
								/>
								Tạo tự động
							</label>
						</div>
						{!form.generatePassword ? (
							<input
								className={inputClass}
								type="password"
								value={form.password}
								onChange={(e) => setField("password", e.target.value)}
								minLength={12}
								autoComplete="new-password"
								placeholder="Tối thiểu 12 ký tự"
							/>
						) : (
							<p className="mt-2 text-sm text-muted-foreground">
								Mật khẩu sẽ được tạo và hiển thị một lần sau khi tạo thành công.
							</p>
						)}
					</fieldset>
					<label className="flex min-h-12 items-center gap-3 text-base">
						<input
							type="checkbox"
							className="size-5"
							checked={form.mustChangePassword}
							onChange={(e) => setField("mustChangePassword", e.target.checked)}
						/>
						Bắt buộc đổi mật khẩu khi đăng nhập lần đầu
					</label>
				</div>
			</section>
			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-3 text-base text-destructive"
				>
					{error}
				</div>
			) : null}
			<div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 p-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:text-right">
				<button
					type="submit"
					disabled={submitting}
					className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary px-5 text-base font-semibold text-white hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
				>
					<Save className="size-5" aria-hidden />
					{submitting ? "Đang tạo…" : "Tạo cửa hàng"}
				</button>
			</div>
		</form>
	);
}
