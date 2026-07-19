"use client";

import {
	Building2,
	ChevronDown,
	Handshake,
	Hash,
	MapPin,
	Phone,
	Truck,
	User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	type Supplier,
	type SupplierType,
	supplierTypeLabel,
} from "@/lib/suppliers";

/**
 * Form Thêm/Sửa nhà cung cấp (base_spec §7).
 * Chia section: thông tin cơ bản + chính sách hợp tác (thu gọn được, tùy chọn).
 * Mobile-first (DESIGN.md): nút Lưu dính đáy full-width. FE-only: chưa nối API.
 */

type FormMode = "create" | "edit";

type FormState = {
	code: string;
	name: string;
	type: SupplierType;
	contact: string;
	contactRole: string;
	phone: string;
	address: string;
	taxCode: string;
	discountPercent: string;
	creditLimit: string;
	paymentTerm: string;
};

const typeOptions: { value: SupplierType; label: string }[] = [
	{ value: "manufacturer", label: supplierTypeLabel.manufacturer },
	{ value: "distributor", label: supplierTypeLabel.distributor },
	{ value: "agent", label: supplierTypeLabel.agent },
];

function toFormState(s?: Supplier): FormState {
	return {
		code: s?.code ?? "",
		name: s?.name ?? "",
		type: s?.type ?? "distributor",
		contact: s?.contact ?? "",
		contactRole: s?.contactRole ?? "",
		phone: s?.phone ?? "",
		address: s?.address ?? "",
		taxCode: s?.taxCode ?? "",
		discountPercent:
			s?.discountPercent != null ? String(s.discountPercent) : "",
		creditLimit: s?.creditLimit != null ? String(s.creditLimit) : "",
		paymentTerm: s?.paymentTerm ?? "",
	};
}

export function SupplierForm({
	mode,
	supplier,
}: {
	mode: FormMode;
	supplier?: Supplier;
}) {
	const router = useRouter();
	const [form, setForm] = useState<FormState>(() => toFormState(supplier));
	const [policyOpen, setPolicyOpen] = useState<boolean>(
		Boolean(
			supplier?.discountPercent != null ||
				supplier?.creditLimit != null ||
				supplier?.paymentTerm,
		),
	);
	const [saving, setSaving] = useState(false);

	function set<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setSaving(true);
		// TODO: gọi API tạo/cập nhật nhà cung cấp khi backend sẵn sàng.
		setTimeout(() => {
			router.push("/nha-cung-cap");
		}, 400);
	}

	const submitLabel = saving
		? "Đang lưu..."
		: mode === "create"
			? "Thêm nhà cung cấp"
			: "Lưu thay đổi";

	return (
		<form
			onSubmit={handleSubmit}
			className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-24 lg:mx-0 lg:pb-6"
		>
			{/* Section 1: Thông tin cơ bản */}
			<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex items-center gap-3">
					<span
						className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
						style={{ backgroundColor: "#1a6fa8" }}
					>
						<Truck className="size-5 text-white" aria-hidden />
					</span>
					<h2 className="text-lg font-semibold text-foreground">
						Thông tin cơ bản
					</h2>
				</div>

				<Field label="Tên nhà cung cấp" required>
					<input
						type="text"
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
								type="text"
								required
								value={form.code}
								onChange={(e) => set("code", e.target.value)}
								placeholder="NCC-001"
								className={`${inputClass} pl-10.5`}
							/>
						</div>
					</Field>
					<Field label="Loại NCC" required>
						<Select
							value={form.type}
							onChange={(v) => set("type", v as SupplierType)}
							options={typeOptions}
						/>
					</Field>
				</div>

				<Field label="Số điện thoại" required>
					<div className="relative">
						<Phone className={iconClass} aria-hidden />
						<input
							type="tel"
							required
							inputMode="tel"
							value={form.phone}
							onChange={(e) => set("phone", e.target.value)}
							placeholder="0283 822 xxxx"
							className={`${inputClass} pl-10.5`}
						/>
					</div>
				</Field>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label="Người liên hệ">
						<div className="relative">
							<User className={iconClass} aria-hidden />
							<input
								type="text"
								value={form.contact}
								onChange={(e) => set("contact", e.target.value)}
								placeholder="VD: A. Dũng"
								className={`${inputClass} pl-10.5`}
							/>
						</div>
					</Field>
					<Field label="Chức vụ">
						<input
							type="text"
							value={form.contactRole}
							onChange={(e) => set("contactRole", e.target.value)}
							placeholder="VD: Trưởng vùng"
							className={inputClass}
						/>
					</Field>
				</div>

				<Field label="Địa chỉ">
					<div className="relative">
						<MapPin className={iconClass} aria-hidden />
						<input
							type="text"
							value={form.address}
							onChange={(e) => set("address", e.target.value)}
							placeholder="VD: KCN Long An"
							className={`${inputClass} pl-10.5`}
						/>
					</div>
				</Field>

				<Field label="Mã số thuế">
					<div className="relative">
						<Building2 className={iconClass} aria-hidden />
						<input
							type="text"
							inputMode="numeric"
							value={form.taxCode}
							onChange={(e) => set("taxCode", e.target.value)}
							placeholder="0301234567"
							className={`${inputClass} pl-10.5`}
						/>
					</div>
				</Field>
			</section>

			{/* Section 2: Chính sách hợp tác (thu gọn được) */}
			<div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-card">
				<button
					type="button"
					onClick={() => setPolicyOpen((o) => !o)}
					className="flex w-full items-center gap-3 p-5 text-left"
				>
					<span
						className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
						style={{ backgroundColor: "#1a6fa8" }}
					>
						<Handshake className="size-5 text-white" aria-hidden />
					</span>
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="text-lg font-semibold text-foreground">
							Chính sách hợp tác
						</span>
						<span className="text-sm text-[#616161]">
							Chiết khấu, hạn mức, thời hạn thanh toán (tùy chọn)
						</span>
					</span>
					<ChevronDown
						className={`size-5 shrink-0 text-[#9e9e9e] transition-transform duration-200 ${
							policyOpen ? "rotate-180" : ""
						}`}
						aria-hidden
					/>
				</button>

				{policyOpen ? (
					<div className="flex flex-col gap-4 border-t border-border p-5">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Field label="Chiết khấu (%)">
								<input
									type="number"
									inputMode="numeric"
									min={0}
									max={100}
									value={form.discountPercent}
									onChange={(e) => set("discountPercent", e.target.value)}
									placeholder="0"
									className={`${inputClass} text-right`}
								/>
							</Field>
							<Field label="Hạn mức công nợ (₫)">
								<input
									type="number"
									inputMode="numeric"
									min={0}
									value={form.creditLimit}
									onChange={(e) => set("creditLimit", e.target.value)}
									placeholder="0"
									className={`${inputClass} text-right`}
								/>
							</Field>
						</div>
						<Field label="Thời hạn / hình thức thanh toán">
							<input
								type="text"
								value={form.paymentTerm}
								onChange={(e) => set("paymentTerm", e.target.value)}
								placeholder="VD: Công nợ 30 ngày"
								className={inputClass}
							/>
						</Field>
					</div>
				) : null}
			</div>

			{/* Hành động — desktop inline */}
			<div className="hidden items-center justify-end gap-3 lg:flex">
				<button
					type="button"
					onClick={() => router.back()}
					className="h-11 rounded-[10px] border border-border bg-card px-6 text-base font-semibold text-foreground hover:bg-[#f5f5f5]"
				>
					Hủy
				</button>
				<button
					type="submit"
					disabled={saving}
					className="h-11 rounded-[10px] bg-primary px-8 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] disabled:opacity-60"
				>
					{submitLabel}
				</button>
			</div>

			{/* Hành động — mobile dính đáy full-width */}
			<div className="fixed inset-x-0 bottom-nav-safe z-20 border-t border-border bg-card p-3 lg:hidden">
				<button
					type="submit"
					disabled={saving}
					className="flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-base font-semibold text-white transition-colors duration-200 ease-out active:bg-[#3f8530] disabled:opacity-60"
				>
					{submitLabel}
				</button>
			</div>
		</form>
	);
}

const inputClass =
	"h-12 w-full rounded-[10px] border border-border bg-white px-4 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11";

const iconClass =
	"pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]";

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
			<span className="text-sm font-medium text-foreground">
				{label}
				{required ? <span className="ml-0.5 text-destructive">*</span> : null}
			</span>
			{children}
		</div>
	);
}

function Select({
	value,
	onChange,
	options,
}: {
	value: string;
	onChange: (v: string) => void;
	options: { value: string; label: string }[];
}) {
	return (
		<div className="relative">
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={`${inputClass} appearance-none pr-10 text-foreground`}
			>
				{options.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
			<ChevronDown
				className="pointer-events-none absolute right-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]"
				aria-hidden
			/>
		</div>
	);
}
