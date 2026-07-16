"use client";

import type { LucideIcon } from "lucide-react";
import {
	Bell,
	Building2,
	Camera,
	ChevronRight,
	KeyRound,
	LogOut,
	Mail,
	MapPin,
	Phone,
	Printer,
	ShieldCheck,
	UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/**
 * Trang Thiết lập — mobile-first (DESIGN.md §8, §22).
 * Gộp thông tin cá nhân + các nhóm cài đặt tài khoản/cửa hàng.
 * FE-only: lưu tạm tại chỗ, chưa nối API.
 */

type Field = {
	key: string;
	label: string;
	icon: LucideIcon;
	value: string;
	type: "text" | "tel" | "email";
	inputMode?: "text" | "tel" | "email";
};

const initialFields: Field[] = [
	{
		key: "name",
		label: "Họ và tên",
		icon: UserRound,
		value: "Nguyễn Minh Tâm",
		type: "text",
	},
	{
		key: "phone",
		label: "Số điện thoại",
		icon: Phone,
		value: "0912 345 678",
		type: "tel",
		inputMode: "tel",
	},
	{
		key: "email",
		label: "Email",
		icon: Mail,
		value: "minhtam@vattu.vn",
		type: "email",
		inputMode: "email",
	},
	{
		key: "address",
		label: "Địa chỉ",
		icon: MapPin,
		value: "Tổ 3, Cai Lậy, Tiền Giang",
		type: "text",
	},
];

const settingGroups: {
	heading: string;
	items: {
		icon: LucideIcon;
		label: string;
		desc: string;
		tile: string;
		href: string;
	}[];
}[] = [
	{
		heading: "Tài khoản",
		items: [
			{
				icon: KeyRound,
				label: "Đổi mật khẩu",
				desc: "Cập nhật mật khẩu đăng nhập",
				tile: "#546e7a",
				href: "/thiet-lap/doi-mat-khau",
			},
			{
				icon: ShieldCheck,
				label: "Bảo mật tài khoản",
				desc: "Thiết bị đăng nhập, xác thực",
				tile: "#1e88e5",
				href: "/thiet-lap/bao-mat",
			},
		],
	},
	{
		heading: "Cửa hàng",
		items: [
			{
				icon: Building2,
				label: "Thông tin cửa hàng",
				desc: "Tên, địa chỉ, giấy phép kinh doanh",
				tile: "#26a69a",
				href: "/thiet-lap/thong-tin-cua-hang",
			},
			{
				icon: Printer,
				label: "Mẫu in biên lai",
				desc: "Tùy chỉnh thông tin trên biên lai",
				tile: "#9e9d24",
				href: "/thiet-lap/mau-in",
			},
			{
				icon: Bell,
				label: "Thông báo",
				desc: "Nhắc nợ đến hạn, hàng sắp hết",
				tile: "#f4511e",
				href: "/thiet-lap/thong-bao",
			},
		],
	},
];

export default function ThietLapPage() {
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
		// TODO: gọi API cập nhật hồ sơ khi backend sẵn sàng.
		setSaved(true);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold tracking-tight text-foreground">
					Thiết lập
				</h1>
				<p className="text-base text-[#616161]">
					Quản lý thông tin cá nhân và tùy chỉnh cửa hàng.
				</p>
			</div>

			{/* Ảnh đại diện */}
			<div className="flex items-center gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="relative">
					<span className="flex size-20 items-center justify-center rounded-full bg-accent text-2xl font-bold text-accent-foreground">
						MT
					</span>
					<button
						type="button"
						aria-label="Đổi ảnh đại diện"
						className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-2 border-card bg-primary text-white transition-colors duration-200 ease-out hover:bg-[#43a047]"
					>
						<Camera className="size-4.5" aria-hidden />
					</button>
				</div>
				<div className="flex min-w-0 flex-col">
					<span className="truncate text-xl font-bold text-foreground">
						Nguyễn Minh Tâm
					</span>
					<span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#e8f5e9] px-3 py-1 text-sm font-medium text-[#2e7d32]">
						Chủ cửa hàng
					</span>
				</div>
			</div>

			{/* Form thông tin cá nhân */}
			<form
				onSubmit={handleSave}
				className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card"
			>
				<h2 className="text-lg font-semibold text-foreground">
					Thông tin cá nhân
				</h2>

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
								onChange={(event) => updateField(field.key, event.target.value)}
								className="h-12 w-full rounded-[10px] border border-border bg-white pl-10.5 pr-4 text-base text-foreground transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11"
							/>
						</div>
					</div>
				))}

				{saved ? (
					<p
						role="status"
						className="rounded-[10px] bg-[#e8f5e9] px-4 py-3 text-sm text-[#2e7d32]"
					>
						Đã lưu thay đổi. Kết nối API cập nhật sẽ bổ sung ở task backend.
					</p>
				) : null}

				<button
					type="submit"
					className="mt-1 flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-base font-semibold text-white transition-all duration-200 ease-out hover:bg-[#43a047] active:translate-y-px active:bg-[#2e7d32] md:h-11"
				>
					Lưu thay đổi
				</button>
			</form>

			{/* Các nhóm cài đặt */}
			{settingGroups.map((group) => (
				<div key={group.heading} className="flex flex-col gap-2">
					<h2 className="px-1 text-lg font-semibold text-foreground">
						{group.heading}
					</h2>
					<div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-card">
						{group.items.map((item) => (
							<Link
								key={item.label}
								href={item.href}
								className="flex w-full items-center gap-3 border-b border-border p-4 text-left transition-colors duration-200 ease-out last:border-b-0 hover:bg-[#f5f5f5]"
							>
								<span
									className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
									style={{ backgroundColor: item.tile }}
								>
									<item.icon className="size-5.5 text-white" aria-hidden />
								</span>
								<div className="flex min-w-0 flex-1 flex-col">
									<span className="text-base font-medium text-foreground">
										{item.label}
									</span>
									<span className="truncate text-sm text-[#616161]">
										{item.desc}
									</span>
								</div>
								<ChevronRight className="size-5 text-[#9e9e9e]" aria-hidden />
							</Link>
						))}
					</div>
				</div>
			))}

			{/* Đăng xuất */}
			<button
				type="button"
				className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-base font-semibold text-destructive shadow-card transition-colors duration-200 ease-out hover:bg-[#fdecea]"
			>
				<LogOut className="size-5" aria-hidden />
				Đăng xuất
			</button>
		</div>
	);
}
