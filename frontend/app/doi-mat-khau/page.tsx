"use client";

import { KeyRound, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/auth/fields";
import { UserAuthGuard } from "@/components/auth/user-auth-guard";
import type { UserApiError } from "@/lib/user-auth-api";
import { useUserAuth } from "@/stores/user-auth-store";

export default function ChangePasswordPage() {
	const router = useRouter();
	const changePassword = useUserAuth((state) => state.changePassword);
	const loading = useUserAuth((state) => state.loading);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [error, setError] = useState("");

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (newPassword.length < 12) {
			setError("Mật khẩu mới cần ít nhất 12 ký tự.");
			return;
		}
		setError("");
		try {
			await changePassword(currentPassword, newPassword);
			router.replace("/");
		} catch (reason) {
			setError((reason as UserApiError).message || "Không thể đổi mật khẩu.");
		}
	}

	return (
		<UserAuthGuard>
			<main className="min-h-[100dvh] bg-[#f8f9f8] px-5 py-8 sm:px-8 sm:py-12">
				<section className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-white p-5 shadow-[0_2px_10px_rgba(92,173,69,0.06)] sm:p-8">
					<div className="mb-8 flex flex-col gap-3">
						<div className="flex size-12 items-center justify-center rounded-xl bg-[#f3f8f1] text-primary">
							<KeyRound className="size-6" aria-hidden />
						</div>
						<h1 className="text-2xl font-bold text-foreground">
							Đổi mật khẩu để tiếp tục
						</h1>
						<p className="text-base leading-relaxed text-muted-foreground">
							Vì an toàn tài khoản, hãy tạo một mật khẩu mới trước khi sử dụng
							cửa hàng.
						</p>
					</div>
					<form onSubmit={submit} className="flex flex-col gap-5">
						<PasswordField
							label="Mật khẩu hiện tại"
							value={currentPassword}
							onChange={setCurrentPassword}
							error={
								!currentPassword && error
									? "Vui lòng nhập mật khẩu hiện tại."
									: undefined
							}
						/>
						<PasswordField
							label="Mật khẩu mới"
							value={newPassword}
							onChange={setNewPassword}
							error={error && currentPassword ? error : undefined}
							autoComplete="new-password"
						/>
						{error && !currentPassword ? (
							<p role="alert" className="text-sm text-destructive">
								{error}
							</p>
						) : null}
						<button
							type="submit"
							disabled={loading}
							className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-base font-semibold text-white transition-all hover:bg-[#4f9c3a] active:translate-y-px disabled:opacity-70"
						>
							{loading ? (
								<LoaderCircle className="size-5 animate-spin" aria-hidden />
							) : null}
							{loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
						</button>
					</form>
				</section>
			</main>
		</UserAuthGuard>
	);
}
