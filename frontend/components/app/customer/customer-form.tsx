"use client";

import { MapPin, Phone, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	type Customer,
	type CustomerInput,
	type CustomerType,
	createCustomer,
	customerTypeLabel,
	updateCustomer,
} from "@/lib/tenant-customers-api";

type FormMode = "create" | "edit";
const types: CustomerType[] = ["RETAIL", "FARMER", "FARM", "AGENT"];

export function CustomerForm({
	mode,
	customer,
}: {
	mode: FormMode;
	customer?: Customer;
}) {
	const router = useRouter();
	const [form, setForm] = useState<CustomerInput>({
		name: customer?.name ?? "",
		phone: customer?.phone ?? "",
		address: customer?.address ?? "",
		type: customer?.type ?? "RETAIL",
	});
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	function set<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
		setForm((current) => ({ ...current, [key]: value }));
	}
	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!form.name?.trim()) {
			setError("Vui lòng nhập tên khách hàng.");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const input = {
				...form,
				name: form.name.trim(),
				phone: form.phone?.trim() || undefined,
				address: form.address?.trim() || undefined,
			};
			if (mode === "create") await createCustomer(input);
			else if (customer) await updateCustomer(customer.id, input);
			router.push("/khach-hang");
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Không thể lưu khách hàng.",
			);
		} finally {
			setSaving(false);
		}
	}
	return (
		<form
			onSubmit={handleSubmit}
			className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-24 lg:mx-0 lg:pb-6"
		>
			<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex items-center gap-3">
					<span className="flex size-10 items-center justify-center rounded-[10px] bg-[#1a6fa8]">
						<Users className="size-5 text-white" />
					</span>
					<h2 className="text-lg font-semibold">Thông tin khách hàng</h2>
				</div>
				<Field label="Tên khách hàng" required>
					<div className="relative">
						<User className={iconClass} />
						<input
							required
							value={form.name}
							onChange={(event) => set("name", event.target.value)}
							className={`${inputClass} pl-10.5`}
							placeholder="VD: Anh Ba, Chị Tư Hồng..."
						/>
					</div>
				</Field>
				<Field label="Số điện thoại" hint="Dùng làm định danh khi ghi nợ">
					<div className="relative">
						<Phone className={iconClass} />
						<input
							type="tel"
							value={form.phone ?? ""}
							onChange={(event) => set("phone", event.target.value)}
							className={`${inputClass} pl-10.5`}
							placeholder="0912 345 678"
						/>
					</div>
				</Field>
				<Field label="Loại khách hàng">
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						{types.map((type) => (
							<button
								key={type}
								type="button"
								onClick={() => set("type", type)}
								className={`h-12 rounded-[10px] border text-sm font-semibold ${form.type === type ? "border-primary bg-[#e8f5e9] text-[#2e7d32]" : "border-border bg-white text-[#616161]"}`}
							>
								{customerTypeLabel[type]}
							</button>
						))}
					</div>
				</Field>
				<Field label="Địa chỉ">
					<div className="relative">
						<MapPin className={iconClass} />
						<input
							value={form.address ?? ""}
							onChange={(event) => set("address", event.target.value)}
							className={`${inputClass} pl-10.5`}
							placeholder="VD: Tổ 3, Ấp Bình Thành"
						/>
					</div>
				</Field>
				{error ? (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				) : null}
			</section>
			<div className="flex justify-end gap-3">
				<button
					type="button"
					onClick={() => router.back()}
					className="h-11 rounded-[10px] border border-border px-6 font-semibold"
				>
					Hủy
				</button>
				<button
					type="submit"
					disabled={saving}
					className="h-11 rounded-[10px] bg-primary px-8 font-semibold text-white disabled:opacity-60"
				>
					{saving
						? "Đang lưu..."
						: mode === "create"
							? "Thêm khách hàng"
							: "Lưu thay đổi"}
				</button>
			</div>
		</form>
	);
}

const inputClass =
	"h-12 w-full rounded-[10px] border border-border bg-white px-4 text-base text-foreground placeholder:text-[#9e9e9e] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11";
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
			<span className="text-sm font-medium">
				{label}
				{required ? <span className="ml-0.5 text-destructive">*</span> : null}
			</span>
			{children}
			{hint ? <span className="text-sm text-[#9e9e9e]">{hint}</span> : null}
		</div>
	);
}
