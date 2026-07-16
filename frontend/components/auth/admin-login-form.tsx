"use client";

import { LoaderCircle, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { PasswordField, TextField } from "@/components/auth/fields";

/**
 * Form đăng nhập dành cho quản trị viên.
 * Đăng nhập bằng email nội bộ, không có đăng ký / ghi nhớ phiên.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminLoginForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<{ email?: string; password?: string }>(
		{},
	);
	const [status, setStatus] = useState<"idle" | "loading" | "notice">("idle");

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const nextErrors: typeof errors = {};
		if (!email.trim()) {
			nextErrors.email = "Vui lòng nhập email quản trị.";
		} else if (!EMAIL_PATTERN.test(email.trim())) {
			nextErrors.email = "Email chưa đúng định dạng.";
		}
		if (!password) {
			nextErrors.password = "Vui lòng nhập mật khẩu.";
		}
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		setStatus("loading");
		// TODO: gọi API đăng nhập quản trị khi backend sẵn sàng.
		await new Promise((resolve) => setTimeout(resolve, 600));
		setStatus("notice");
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

			{status === "notice" ? (
				<p
					role="status"
					className="rounded-[10px] bg-[#e3f2fd] px-4 py-3 text-sm text-[#1565c0]"
				>
					Giao diện đã sẵn sàng. Kết nối API xác thực sẽ được bổ sung ở task
					backend.
				</p>
			) : null}
		</form>
	);
}
