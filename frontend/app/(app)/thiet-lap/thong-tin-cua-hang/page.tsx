"use client";

import type { LucideIcon } from "lucide-react";
import {
	Building2,
	Camera,
	FileText,
	MapPin,
	Phone,
	Store,
} from "lucide-react";
import { useState } from "react";
import { SettingHeader } from "@/components/app/setting-header";

/**
 * Màn Thông tin cửa hàng — mobile-first (DESIGN.md §8, §9).
 * FE-only: lưu tạm tại chỗ, chưa nối API.
 */

type Field = {
	key: string;
	label: string;
	icon: LucideIcon;
	value: string;
	type: "text" | "tel";
	inputMode?: "text" | "tel";
	placeholder?: string;
};

const initialFields: Field[] = [
	{
		key: "storeName",
		label: "Tên cửa hàng",
		icon: Store,
		value: "Cửa hàng Vật tư Minh Tâm",
		type: "text",
	},
	{
		key: "phone",
		label: "Số điện thoại cửa hàng",
		icon: Phone,
		value: "0273 3812 345",
		type: "tel",
		inputMode: "tel",
	},
	{
		key: "address",
		label: "Địa chỉ",
		icon: MapPin,
		value: "Tổ 3, Thị trấn Cai Lậy, Tiền Giang",
		type: "text",
	},
	{
		key: "taxCode",
		label: "Mã số thuế / GPKD",
		icon: FileText,
		value: "1201234567",
		type: "text",
		placeholder: "Nhập mã số thuế hoặc số giấy phép",
	},
];

export default function ThongTinCuaHangPage() {
	const [fields, setFields] = useState(initialFields);
	const [saved, setSaved] = useState(false);

	function updateField(key: string, value: string) {
		setFields((current) =>
			current.map((f) => (f.key === key ? { ...f, value } : f)),
		);
		setSaved(false);
	}

	function handleSave(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		// TODO: gọi API cập nhật cửa hàng khi backend sẵn sàng.
		setSaved(true);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
			<SettingHeader
				title="Thông tin cửa hàng"
				description="Thông tin này hiển thị trên biên lai và báo cáo."
			/>

			{/* Logo cửa hàng */}
			<div className="flex items-center gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="relative">
					<span className="flex size-20 items-center justify-center rounded-[16px] bg-accent text-accent-foreground">
						<Building2 className="size-9" aria-hidden />
					</span>
					<button
						type="button"
						aria-label="Đổi logo cửa hàng"
						className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-2 border-card bg-primary text-white transition-colors duration-200 ease-out hover:bg-[#43a047]"
					>
						<Camera className="size-4.5" aria-hidden />
					</button>
				</div>
				<div className="flex min-w-0 flex-col gap-1">
					<span className="text-base font-semibold text-foreground">
						Logo cửa hàng
					</span>
					<span className="text-sm text-[#616161]">
						Ảnh vuông, tối thiểu 200×200px.
					</span>
				</div>
			</div>

			{/* Form thông tin */}
			<form
				onSubmit={handleSave}
				className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card"
			>
				{fields.map((field) => (
					<div key={field.key} className="flex flex-col gap-2">
						<label
							htmlFor={field.key}
							className="text-sm font-medium text-foreground"
						>
							{field.label}
						</label>
						<div className="relative">
							<field.icon
								className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]"
								aria-hidden
							/>
							<input
								id={field.key}
								type={field.type}
								inputMode={field.inputMode}
								value={field.value}
								placeholder={field.placeholder}
								onChange={(event) => updateField(field.key, event.target.value)}
								className="h-12 w-full rounded-[10px] border border-border bg-white pl-10.5 pr-4 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11"
							/>
						</div>
					</div>
				))}

				{saved ? (
					<p
						role="status"
						className="rounded-[10px] bg-[#e8f5e9] px-4 py-3 text-sm text-[#2e7d32]"
					>
						Đã lưu thông tin cửa hàng. Kết nối API sẽ bổ sung ở task backend.
					</p>
				) : null}

				<button
					type="submit"
					className="mt-1 flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-base font-semibold text-white transition-all duration-200 ease-out hover:bg-[#43a047] active:translate-y-px active:bg-[#2e7d32] md:h-11"
				>
					Lưu thay đổi
				</button>
			</form>
		</div>
	);
}
