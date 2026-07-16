"use client";

import type { LucideIcon } from "lucide-react";
import { LogOut, Monitor, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { SettingHeader } from "@/components/app/setting-header";

/**
 * Màn Bảo mật tài khoản — mobile-first (DESIGN.md §8, §13, §21).
 * FE-only: state tại chỗ, chưa nối API.
 */

type Device = {
	id: string;
	icon: LucideIcon;
	name: string;
	meta: string;
	current: boolean;
};

const initialDevices: Device[] = [
	{
		id: "d1",
		icon: Smartphone,
		name: "iPhone của Minh Tâm",
		meta: "Cai Lậy, Tiền Giang · Đang dùng",
		current: true,
	},
	{
		id: "d2",
		icon: Monitor,
		name: "Máy tính cửa hàng",
		meta: "Cai Lậy, Tiền Giang · 2 giờ trước",
		current: false,
	},
	{
		id: "d3",
		icon: Smartphone,
		name: "Điện thoại nhân viên",
		meta: "Mỹ Tho, Tiền Giang · Hôm qua",
		current: false,
	},
];

export default function BaoMatPage() {
	const [twoFactor, setTwoFactor] = useState(false);
	const [devices, setDevices] = useState(initialDevices);

	function signOutDevice(id: string) {
		setDevices((current) => current.filter((d) => d.id !== id));
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
			<SettingHeader
				title="Bảo mật tài khoản"
				description="Quản lý xác thực và các thiết bị đang đăng nhập."
			/>

			{/* Xác thực 2 lớp */}
			<div className="flex items-center gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card">
				<span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-[#1e88e5]">
					<ShieldCheck className="size-5.5 text-white" aria-hidden />
				</span>
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="text-base font-medium text-foreground">
						Xác thực 2 lớp (OTP)
					</span>
					<span className="text-sm text-[#616161]">
						Gửi mã qua SMS mỗi khi đăng nhập máy lạ.
					</span>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={twoFactor}
					aria-label="Bật xác thực 2 lớp"
					onClick={() => setTwoFactor((v) => !v)}
					className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-out ${
						twoFactor ? "bg-primary" : "bg-[#e0e0e0]"
					}`}
				>
					<span
						className={`absolute top-1 size-5 rounded-full bg-white transition-all duration-200 ease-out ${
							twoFactor ? "left-6" : "left-1"
						}`}
					/>
				</button>
			</div>

			{/* Thiết bị đăng nhập */}
			<div className="flex flex-col gap-3">
				<h2 className="px-1 text-lg font-semibold text-foreground">
					Thiết bị đăng nhập
				</h2>
				<div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-card">
					{devices.map((device) => (
						<div
							key={device.id}
							className="flex items-center gap-3 border-b border-border p-4 last:border-b-0"
						>
							<span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-[#f5f5f5] text-[#616161]">
								<device.icon className="size-5.5" aria-hidden />
							</span>
							<div className="flex min-w-0 flex-1 flex-col">
								<span className="truncate text-base font-medium text-foreground">
									{device.name}
								</span>
								<span className="truncate text-sm text-[#616161]">
									{device.meta}
								</span>
							</div>
							{device.current ? (
								<span className="shrink-0 rounded-full bg-[#e8f5e9] px-3 py-1 text-sm font-medium text-[#2e7d32]">
									Hiện tại
								</span>
							) : (
								<button
									type="button"
									onClick={() => signOutDevice(device.id)}
									className="shrink-0 rounded-[10px] px-3 py-2 text-sm font-semibold text-destructive transition-colors duration-200 ease-out hover:bg-[#fdecea]"
								>
									Đăng xuất
								</button>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Đăng xuất tất cả thiết bị khác */}
			<button
				type="button"
				onClick={() =>
					setDevices((current) => current.filter((d) => d.current))
				}
				className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-base font-semibold text-destructive shadow-card transition-colors duration-200 ease-out hover:bg-[#fdecea]"
			>
				<LogOut className="size-5" aria-hidden />
				Đăng xuất mọi thiết bị khác
			</button>
		</div>
	);
}
