"use client";

import { MapPin, Phone, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	type Customer,
	type CustomerType,
	customerTypeLabel,
} from "@/lib/customers";

/**
 * Form Thêm/Sửa khách hàng (base_spec §6).
 * SĐT là định danh chính khi ghi nợ; tối thiểu Tên + SĐT.
 * Mobile-first (DESIGN.md): nút Lưu dính đáy full-width. FE-only: chưa nối API.
 */

type FormMode = "create" | "edit";

type FormState = {
	name: string;
	phone: string;
	address: string;
	type: CustomerType;
};

const typeOptions: { value: CustomerType; label: string }[] = [
	{ value: "retail", label: customerTypeLabel.retail },
	{ value: "farmer", label: customerTypeLabel.farmer },
	{ value: "farm", label: customerTypeLabel.farm },
	{ value: "agent", label: customerTypeLabel.agent },
];

export function CustomerForm({
	mode,
	customer,
}: {
	mode: FormMode;
	customer?: Customer;
}) {
	const router = useRouter();
	const [form, setForm] = useState<FormState>({
		name: customer?.name ?? "",
		phone: customer?.phone ?? "",
		address: customer?.address ?? "",
		type: customer?.type ?? "retail",
	});
	const [saving, setSaving] = useState(false);

	function set<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setSaving(true);
		// TODO: gọi API tạo/cập nhật khách hàng khi backend sẵn sàng.
		setTimeout(() => {
			router.push("/khach-hang");
		}, 400);
	}

	const submitLabel = saving
		? "Đang lưu..."
		: mode === "create"
			? "Thêm khách hàng"
			: "Lưu thay đổi";

	return (
		<form
			onSubmit={handleSubmit}
			className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-24 lg:mx-0 lg:pb-6"
		>
			<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex items-center gap-3">
					<span
						className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
						style={{ backgroundColor: "#1a6fa8" }}
					>
						<Users className="size-5 text-white" aria-hidden />
					</span>
					<h2 className="text-lg font-semibold text-foreground">
						Thông tin khách hàng
					</h2>
				</div>

				<Field label="Tên khách hàng" required>
					<div className="relative">
						<User className={iconClass} aria-hidden />
						<input
							type="text"
							required
							value={form.name}
							onChange={(e) => set("name", e.target.value)}
							placeholder="VD: Anh Ba, Chị Tư Hồng..."
							className={`${inputClass} pl-10.5`}
						/>
					</div>
				</Field>

				<Field
					label="Số điện thoại"
					required
					hint="Dùng làm định danh khi ghi nợ"
				>
					<div className="relative">
						<Phone className={iconClass} aria-hidden />
						<input
							type="tel"
							required
							inputMode="tel"
							value={form.phone}
							onChange={(e) => set("phone", e.target.value)}
							placeholder="0912 345 678"
							className={`${inputClass} pl-10.5`}
						/>
					</div>
				</Field>

				<Field label="Loại khách hàng" required>
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						{typeOptions.map((o) => {
							const active = form.type === o.value;
							return (
								<button
									key={o.value}
									type="button"
									onClick={() => set("type", o.value)}
									className={`flex h-12 items-center justify-center rounded-[10px] border text-base font-semibold transition-colors duration-200 ease-out ${
										active
											? "border-primary bg-[#e8f5e9] text-[#2e7d32]"
											: "border-border bg-white text-[#616161] hover:bg-[#f5f5f5]"
									}`}
								>
									{o.label}
								</button>
							);
						})}
					</div>
				</Field>

				<Field label="Địa chỉ">
					<div className="relative">
						<MapPin className={iconClass} aria-hidden />
						<input
							type="text"
							value={form.address}
							onChange={(e) => set("address", e.target.value)}
							placeholder="VD: Tổ 3, Ấp Bình Thành"
							className={`${inputClass} pl-10.5`}
						/>
					</div>
				</Field>
			</section>

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
	hint,
	children,
}: {
	label: string;
	required?: boolean;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-sm font-medium text-foreground">
				{label}
				{required ? <span className="ml-0.5 text-destructive">*</span> : null}
			</span>
			{children}
			{hint ? <span className="text-sm text-[#9e9e9e]">{hint}</span> : null}
		</div>
	);
}
