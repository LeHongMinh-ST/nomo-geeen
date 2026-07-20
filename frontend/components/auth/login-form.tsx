"use client";

import { KeyRound, LoaderCircle, LogIn, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField, TextField } from "@/components/auth/fields";
import type { UserApiError } from "@/lib/user-auth-api";
import { useUserAuth } from "@/stores/user-auth-store";

export function LoginForm() {
	const router = useRouter();
	const login = useUserAuth((state) => state.login);
	const loading = useUserAuth((state) => state.loading);
	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [serverError, setServerError] = useState("");

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const nextErrors: Record<string, string> = {};
		if (!identifier.trim())
			nextErrors.identifier =
				"Vui lòng nhập tên đăng nhập, email hoặc số điện thoại.";
		if (!password) nextErrors.password = "Vui lòng nhập mật khẩu.";
		setErrors(nextErrors);
		setServerError("");
		if (Object.keys(nextErrors).length > 0) return;
		try {
			await login(identifier, password);
			router.replace("/");
		} catch (error) {
			setServerError((error as UserApiError).message || "Đăng nhập thất bại.");
		}
	}

	return (
		<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
			<TextField
				label="Tên đăng nhập, email hoặc số điện thoại"
				value={identifier}
				onChange={setIdentifier}
				placeholder="Bạn thường dùng thông tin nào?"
				autoComplete="username"
				error={errors.identifier}
				icon={UserRound}
			/>
			<PasswordField
				label="Mật khẩu"
				value={password}
				onChange={setPassword}
				placeholder="Nhập mật khẩu của bạn"
				error={errors.password}
				icon={KeyRound}
			/>
			{serverError ? (
				<p
					role="alert"
					className="rounded-[10px] bg-[#fff4f3] px-4 py-3 text-sm text-destructive"
				>
					{serverError}
				</p>
			) : null}
			<button
				type="submit"
				disabled={loading}
				className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-base font-semibold text-white transition-all hover:bg-[#4f9c3a] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
			>
				{loading ? (
					<LoaderCircle className="size-5 animate-spin" aria-hidden />
				) : (
					<LogIn className="size-5" aria-hidden />
				)}
				{loading ? "Đang đăng nhập..." : "Đăng nhập"}
			</button>
			<p className="text-center text-sm text-muted-foreground">
				Chưa có tài khoản?{" "}
				<Link
					href="/dang-ky"
					className="font-semibold text-primary hover:underline"
				>
					Đăng ký miễn phí
				</Link>
			</p>
		</form>
	);
}
