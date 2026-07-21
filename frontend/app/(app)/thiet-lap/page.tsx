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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentProfile } from "@/lib/user-auth-api";
import { useUserAuth } from "@/stores/user-auth-store";

/**
 * Trang Thiết lập — mobile-first (DESIGN.md §8, §22).
 * Gộp thông tin cá nhân + các nhóm cài đặt tài khoản/cửa hàng.
 */

type Field = {
	key: string;
	label: string;
	icon: LucideIcon;
	value: string;
	type: "text" | "tel" | "email";
	inputMode?: "text" | "tel" | "email";
};

function fieldsFor(user: { fullName: string; phone: string | null; email: string | null }, address: string): Field[] {
	return [
	{
		key: "name",
		label: "Họ và tên",
		icon: UserRound,
		value: user.fullName,
		type: "text",
	},
	{
		key: "phone",
		label: "Số điện thoại",
		icon: Phone,
		value: user.phone ?? "",
		type: "tel",
		inputMode: "tel",
	},
	{
		key: "email",
		label: "Email",
		icon: Mail,
		value: user.email ?? "",
		type: "email",
		inputMode: "email",
	},
	{
		key: "address",
		label: "Địa chỉ",
		icon: MapPin,
		value: address,
		type: "text",
	},
];
}

function roleLabel(role?: string) {
	return role === "OWNER" ? "Chủ cửa hàng" : role === "MANAGER" ? "Quản lý" : "Nhân viên";
}

function initials(name?: string) {
	const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
	return words.slice(-2).map((word) => word[0]).join("").toUpperCase() || "NT";
}

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
				icon: UserRound,
				label: "Nhân viên",
				desc: "Tạo tài khoản và phân quyền nhân viên",
				tile: "#1a6fa8",
				href: "/thiet-lap/nhan-vien",
			},
			{
				icon: KeyRound,
				label: "Đổi mật khẩu",
				desc: "Cập nhật mật khẩu đăng nhập",
				tile: "#1a6fa8",
				href: "/thiet-lap/doi-mat-khau",
			},
			{
				icon: ShieldCheck,
				label: "Bảo mật tài khoản",
				desc: "Thiết bị đăng nhập, xác thực",
				tile: "#1a6fa8",
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
				tile: "#1a6fa8",
				href: "/thiet-lap/thong-tin-cua-hang",
			},
			{
				icon: Printer,
				label: "Mẫu in biên lai",
				desc: "Tùy chỉnh thông tin trên biên lai",
				tile: "#5cad45",
				href: "/thiet-lap/mau-in",
			},
			{
				icon: Bell,
				label: "Thông báo",
				desc: "Nhắc nợ đến hạn, hàng sắp hết",
				tile: "#1a6fa8",
				href: "/thiet-lap/thong-bao",
			},
		],
	},
];

export default function ThietLapPage() {
	const router = useRouter();
	const logout = useUserAuth((state) => state.logout);
	const loading = useUserAuth((state) => state.loading);
	const user = useUserAuth((state) => state.user);
	const accessToken = useUserAuth((state) => state.accessToken);
	const updateProfile = useUserAuth((state) => state.updateProfile);
	const [address, setAddress] = useState("");
	const [fields, setFields] = useState<Field[]>([]);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (user) setFields(fieldsFor(user, address));
	}, [user, address]);

	useEffect(() => {
		if (!accessToken) return;
		getCurrentProfile(accessToken)
			.then((profile) => setAddress(profile.address))
			.catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải thông tin."));
	}, [accessToken]);

	async function handleLogout() {
		await logout();
		router.replace("/dang-nhap");
	}

	function updateField(key: string, value: string) {
		setFields((current) =>
			current.map((f) => (f.key === key ? { ...f, value } : f)),
		);
		setSaved(false);
	}

	async function handleSave(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!user) return;
		const values = Object.fromEntries(fields.map((field) => [field.key, field.value]));
		setError(null);
		setSaved(false);
		try {
			const nextAddress = await updateProfile({
				fullName: String(values.name ?? "").trim(),
				phone: String(values.phone ?? "").trim() || undefined,
				email: String(values.email ?? "").trim() || undefined,
				address: String(values.address ?? "").trim() || undefined,
			});
			setAddress(nextAddress);
			setError(null);
			setSaved(true);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Không thể lưu thông tin.");
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:mx-0">
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
						{initials(user?.fullName)}
					</span>
					<button
						type="button"
						aria-label="Đổi ảnh đại diện"
						className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-2 border-card bg-primary text-white transition-colors duration-200 ease-out hover:bg-[#5cad45]"
					>
						<Camera className="size-4.5" aria-hidden />
					</button>
				</div>
				<div className="flex min-w-0 flex-col">
					<span className="truncate text-xl font-bold text-foreground">
						{user?.fullName ?? "Đang tải..."}
					</span>
					<span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#e8f5e9] px-3 py-1 text-sm font-medium text-[#2e7d32]">
						{roleLabel(user?.role)}
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
						aria-live="polite"
						className="rounded-[10px] bg-[#e8f5e9] px-4 py-3 text-sm text-[#2e7d32]"
					>
						Đã lưu thay đổi thành công.
					</p>
				) : null}
				{error ? <p role="alert" className="rounded-[10px] bg-[#fdecea] px-4 py-3 text-sm text-destructive">{error}</p> : null}

				<button
					type="submit"
					disabled={loading || !user}
					className="mt-1 flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-base font-semibold text-white transition-all duration-200 ease-out hover:bg-[#5cad45] active:translate-y-px active:bg-[#3f8530] md:h-11"
				>
					{loading ? "Đang lưu..." : "Lưu thay đổi"}
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
				onClick={handleLogout}
				disabled={loading}
				className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-base font-semibold text-destructive shadow-card transition-colors duration-200 ease-out hover:bg-[#fdecea] disabled:cursor-not-allowed disabled:opacity-60"
			>
				<LogOut className="size-5" aria-hidden />
				{loading ? "Đang đăng xuất..." : "Đăng xuất"}
			</button>
		</div>
	);
}
