"use client";
import { Building2, MapPin, Phone, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { SettingHeader } from "@/components/app/setting-header";
import { getCurrentProfile } from "@/lib/user-auth-api";
import { useUserAuth } from "@/stores/user-auth-store";

export default function ThongTinCuaHangPage() {
	const user = useUserAuth((state) => state.user);
	const accessToken = useUserAuth((state) => state.accessToken);
	const updateProfile = useUserAuth((state) => state.updateProfile);
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	useEffect(() => {
		if (!accessToken) return;
		void getCurrentProfile(accessToken)
			.then((profile) => {
				setPhone(profile.user.phone ?? "");
				setAddress(profile.address);
			})
			.catch((cause) =>
				setError(
					cause instanceof Error
						? cause.message
						: "Không thể tải thông tin cửa hàng.",
				),
			);
	}, [accessToken]);
	async function save(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!user) return;
		setError(null);
		setSaved(false);
		try {
			await updateProfile({
				fullName: user.fullName,
				phone: phone.trim() || undefined,
				email: user.email ?? undefined,
				address: address.trim() || undefined,
			});
			setSaved(true);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Không thể lưu thông tin cửa hàng.",
			);
		}
	}
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:mx-0">
			<SettingHeader
				title="Thông tin cửa hàng"
				description="Cập nhật thông tin liên hệ và địa chỉ từ hồ sơ cửa hàng."
			/>
			<div className="flex items-center gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<span className="flex size-20 items-center justify-center rounded-[16px] bg-accent text-accent-foreground">
					<Building2 className="size-9" aria-hidden />
				</span>
				<div>
					<span className="text-base font-semibold">
						{user?.tenantName ?? "Đang tải..."}
					</span>
					<p className="text-sm text-muted">
						Tên cửa hàng lấy từ hồ sơ tenant.
					</p>
				</div>
			</div>
			<form
				onSubmit={save}
				className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card"
			>
				<label className="flex flex-col gap-2 text-base font-medium">
					Số điện thoại cửa hàng
					<div className="relative">
						<Phone
							className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted"
							aria-hidden
						/>
						<input
							value={phone}
							onChange={(event) => setPhone(event.target.value)}
							type="tel"
							className="h-12 w-full rounded-[10px] border border-border pl-10.5 text-base"
						/>
					</div>
				</label>
				<label className="flex flex-col gap-2 text-base font-medium">
					Địa chỉ
					<div className="relative">
						<MapPin
							className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted"
							aria-hidden
						/>
						<input
							value={address}
							onChange={(event) => setAddress(event.target.value)}
							className="h-12 w-full rounded-[10px] border border-border pl-10.5 text-base"
						/>
					</div>
				</label>
				{error ? (
					<p
						role="alert"
						className="rounded-[10px] bg-destructive/5 px-4 py-3 text-sm text-destructive"
					>
						{error}
					</p>
				) : null}
				{saved ? (
					<p
						role="status"
						className="rounded-[10px] bg-[#e8f5e9] px-4 py-3 text-sm text-[#2e7d32]"
					>
						Đã lưu thông tin cửa hàng.
					</p>
				) : null}
				<button
					type="submit"
					disabled={!user}
					className="flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-base font-semibold text-white disabled:opacity-50"
				>
					<Store className="mr-2 size-5" aria-hidden />
					Lưu thay đổi
				</button>
			</form>
		</div>
	);
}
