"use client";

import { LoaderCircle, Lock, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PasswordField, TextField } from "@/components/auth/fields";
import { useAdminAuth } from "@/stores/admin-auth-store";

/**
 * Form dang nhap danh cho quan tri vien.
 * Store action `login` goi /auth/admin/login va set state atomically.
 * Redirect ve ?next= neu hop le.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeNext(value: string | null): string {
	if (!value?.startsWith("/admin") || value.startsWith("//")) {
		return "/admin";
	}
	return value;
}

export function AdminLoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const next = sanitizeNext(searchParams.get("next"));
	const login = useAdminAuth((s) => s.login);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<{ email?: string; password?: string }>(
		{},
	);
	const [status, setStatus] = useState<"idle" | "loading">("idle");
	const [formError, setFormError] = useState<string | null>(null);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFormError(null);

		const nextErrors: typeof errors = {};
		if (!email.trim()) {
			nextErrors.email = "Vui lòng nhập email quản trị.";
		} else if (!EMAIL_PATTERN.test(email.trim())) {
			nextErrors.email = "Email chưa đúng định dạng.";
		}
		if (!password) {
			nextErrors.password = "Vui lòng nhập mậu khẩu.";
		}
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		setStatus("loading");
		try {
			await login(email.trim(), password);
			router.push(next);
		} catch (error) {
			const status = (error as { status?: number }).status;
			const message =
				status === 403
					? "Tài khoản quản trị đã bị vô hiệu hóa."
					: status === 401
						? "Email hoặc mật khẩu không đúng."
						: (error as Error).message ||
							"Đăng nhập thất bại, vui lòng thử lại.";
			setFormError(message);
			setStatus("idle");
		}
	}

	return (
		<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
			<TextField
				label="Email quản trị"
				type="email"
				inputMode="email"
				value={email}
				onChange={(value) => {
					setEmail(value);
					if (errors.email)
						setErrors((current) => ({ ...current, email: undefined }));
				}}
				placeholder="ten@argonext.vn"
				autoComplete="username"
				error={errors.email}
				icon={Mail}
			/>

			<PasswordField
				label="Mật khẩu"
				value={password}
				onChange={(value) => {
					setPassword(value);
					if (errors.password)
						setErrors((current) => ({ ...current, password: undefined }));
				}}
				placeholder="Nhập mật khẩu quản trị"
				error={errors.password}
				icon={Lock}
			/>

			<button
				type="submit"
				disabled={status === "loading"}
				className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-base font-semibold text-white transition-all duration-200 ease-out hover:bg-[#43a047] active:translate-y-px active:bg-[#2e7d32] disabled:cursor-not-allowed disabled:opacity-70 md:h-11"
			>
				{status === "loading" ? (
					<>
						<LoaderCircle className="size-5 animate-spin" aria-hidden />
						Đang xác thực...
					</>
				) : (
					"Đăng nhập quản trị"
				)}
			</button>

			{formError ? (
				<p
					role="alert"
					aria-live="assertive"
					className="rounded-[10px] bg-[#ffebee] px-4 py-3 text-sm text-[#c62828]"
				>
					{formError}
				</p>
			) : null}
		</form>
	);
}
