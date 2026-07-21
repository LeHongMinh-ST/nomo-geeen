"use client";

import { ChevronDown, Hash, MapPin, Phone, Truck, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserApiError } from "@/lib/user-auth-api";
import {
	createTenantSupplier,
	updateTenantSupplier,
	type SupplierInput,
	type TenantSupplier,
} from "@/lib/tenant-suppliers-api";

const typeOptions = [
	{ value: "manufacturer", label: "Nhà sản xuất" },
	{ value: "distributor", label: "Nhà phân phối" },
	{ value: "agent", label: "Đại lý" },
];
type FormState = SupplierInput;
function initial(s?: TenantSupplier): FormState {
	return {
		code: s?.code ?? "",
		name: s?.name ?? "",
		supplierType: s?.supplierType ?? "distributor",
		contactName: s?.contactName ?? "",
		phone: s?.phone ?? "",
		email: s?.email ?? "",
		address: s?.address ?? "",
		taxCode: s?.taxCode ?? "",
	};
}

export function SupplierForm({
	mode,
	supplier,
}: {
	mode: "create" | "edit";
	supplier?: TenantSupplier;
}) {
	const router = useRouter();
	const [form, setForm] = useState<FormState>(() => initial(supplier));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	function set<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((current) => ({ ...current, [key]: value }));
		setError("");
	}
	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!form.code.trim() || !form.name.trim()) {
			setError("Mã và tên nhà cung cấp là bắt buộc.");
			return;
		}
		setSaving(true);
		setError("");
		try {
			if (mode === "create") await createTenantSupplier(form);
			else if (supplier) await updateTenantSupplier(supplier.id, form);
			router.push("/nha-cung-cap");
		} catch (e) {
			const apiError = e as UserApiError;
			setError(
				apiError.reason === "DUPLICATE_SUPPLIER_CODE"
					? "Mã nhà cung cấp đã tồn tại trong cửa hàng."
					: apiError.reason === "VALIDATION_ERROR"
						? "Vui lòng kiểm tra mã và tên nhà cung cấp."
						: apiError.message || "Không thể lưu nhà cung cấp.",
			);
		} finally {
			setSaving(false);
		}
	}
	return (
		<form
			onSubmit={submit}
			className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-24 lg:mx-0 lg:pb-6"
		>
			<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex items-center gap-3">
					<span className="flex size-10 items-center justify-center rounded-[10px] bg-[#1a6fa8]">
						<Truck className="size-5 text-white" aria-hidden />
					</span>
					<h1 className="text-lg font-semibold">
						{mode === "create" ? "Thêm nhà cung cấp" : "Sửa nhà cung cấp"}
					</h1>
				</div>
				{error ? (
					<div
						role="alert"
						className="rounded-[10px] border border-[#f0b8b5] bg-[#fff5f4] p-3 text-base text-[#b42318]"
					>
						{error}
					</div>
				) : null}
				<Field label="Tên nhà cung cấp" required>
					<input
						required
						value={form.name}
						onChange={(e) => set("name", e.target.value)}
						placeholder="VD: Vật tư Bình Điền"
						className={inputClass}
					/>
				</Field>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label="Mã NCC" required>
						<div className="relative">
							<Hash className={iconClass} aria-hidden />
							<input
								required
								value={form.code}
								onChange={(e) => set("code", e.target.value)}
								placeholder="NCC-001"
								className={`${inputClass} pl-10.5`}
							/>
						</div>
					</Field>
					<Field label="Loại NCC">
						<div className="relative">
							<select
								value={form.supplierType ?? "distributor"}
								onChange={(e) => set("supplierType", e.target.value)}
								className={`${inputClass} appearance-none pr-10`}
							>
								{typeOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
							<ChevronDown
								className="pointer-events-none absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]"
								aria-hidden
							/>
						</div>
					</Field>
				</div>
				<Field label="Số điện thoại">
					<div className="relative">
						<Phone className={iconClass} aria-hidden />
						<input
							type="tel"
							value={form.phone ?? ""}
							onChange={(e) => set("phone", e.target.value)}
							placeholder="0901 234 567"
							className={`${inputClass} pl-10.5`}
						/>
					</div>
				</Field>
				<Field label="Người liên hệ">
					<div className="relative">
						<User className={iconClass} aria-hidden />
						<input
							value={form.contactName ?? ""}
							onChange={(e) => set("contactName", e.target.value)}
							placeholder="Tên người liên hệ"
							className={`${inputClass} pl-10.5`}
						/>
					</div>
				</Field>
				<Field label="Email">
					<input
						type="email"
						value={form.email ?? ""}
						onChange={(e) => set("email", e.target.value)}
						placeholder="ncc@example.com"
						className={inputClass}
					/>
				</Field>
				<Field label="Địa chỉ">
					<div className="relative">
						<MapPin className={iconClass} aria-hidden />
						<input
							value={form.address ?? ""}
							onChange={(e) => set("address", e.target.value)}
							placeholder="Địa chỉ nhà cung cấp"
							className={`${inputClass} pl-10.5`}
						/>
					</div>
				</Field>
				<Field label="Mã số thuế">
					<input
						value={form.taxCode ?? ""}
						onChange={(e) => set("taxCode", e.target.value)}
						placeholder="Mã số thuế"
						className={inputClass}
					/>
				</Field>
			</section>
			<div className="hidden justify-end gap-3 lg:flex">
				<button
					type="button"
					onClick={() => router.back()}
					className="h-11 rounded-[10px] border border-border px-6 text-base font-semibold"
				>
					Hủy
				</button>
				<button
					disabled={saving}
					type="submit"
					className="h-11 rounded-[10px] bg-primary px-8 text-base font-semibold text-white disabled:opacity-60"
				>
					{saving
						? "Đang lưu..."
						: mode === "create"
							? "Thêm nhà cung cấp"
							: "Lưu thay đổi"}
				</button>
			</div>
			<div className="fixed inset-x-0 bottom-nav-safe z-20 border-t border-border bg-card p-3 lg:hidden">
				<button
					disabled={saving}
					type="submit"
					className="flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-base font-semibold text-white disabled:opacity-60"
				>
					{saving
						? "Đang lưu..."
						: mode === "create"
							? "Thêm nhà cung cấp"
							: "Lưu thay đổi"}
				</button>
			</div>
		</form>
	);
}
function Field({
	label,
	required,
	children,
}: {
	label: string;
	required?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-sm font-medium">
				{label}
				{required ? <span className="ml-0.5 text-destructive">*</span> : null}
			</span>
			{children}
		</div>
	);
}
const inputClass =
	"h-12 w-full rounded-[10px] border border-border bg-white px-4 text-base text-foreground placeholder:text-[#9e9e9e] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11";
const iconClass =
	"pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]";
