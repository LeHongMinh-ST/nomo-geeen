"use client";

import { Check, LoaderCircle, Lock, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PasswordField, TextField } from "@/components/auth/fields";

/**
 * Form đăng nhập cho nông dân / nông hộ / chủ trang trại.
 * Đăng nhập bằng số điện thoại (phương thức quen thuộc nhất với nông hộ).
 */

const PHONE_PATTERN = /^(0|\+84)\d{9}$/;

export function LoginForm() {
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [remember, setRemember] = useState(true);
	const [errors, setErrors] = useState<{ phone?: string; password?: string }>(
		{},
	);
	const [status, setStatus] = useState<"idle" | "loading" | "notice">("idle");

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const nextErrors: typeof errors = {};
		if (!phone.trim()) {
			nextErrors.phone = "Vui lòng nhập số điện thoại.";
		} else if (!PHONE_PATTERN.test(phone.replace(/\s/g, ""))) {
			nextErrors.phone = "Số điện thoại chưa đúng. Ví dụ: 0912 345 678.";
		}
		if (!password) {
			nextErrors.password = "Vui lòng nhập mật khẩu.";
		}
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;

		setStatus("loading");
		// TODO: gọi API đăng nhập khi backend sẵn sàng.
		await new Promise((resolve) => setTimeout(resolve, 600));
		setStatus("notice");
	}

	return (
		<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
			<TextField
				label="Số điện thoại"
				type="tel"
				inputMode="tel"
				value={phone}
				onChange={(value) => {
					setPhone(value);
					if (errors.phone)
						setErrors((current) => ({ ...current, phone: undefined }));
				}}
				placeholder="Ví dụ: 0912 345 678"
				autoComplete="tel"
				error={errors.phone}
				icon={Phone}
			/>

			<PasswordField
				label="Mật khẩu"
				value={password}
				onChange={(value) => {
					setPassword(value);
					if (errors.password)
						setErrors((current) => ({ ...current, password: undefined }));
				}}
				placeholder="Nhập mật khẩu của bạn"
				error={errors.password}
				icon={Lock}
			/>

			<div className="flex items-center justify-between gap-4">
				<label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
					<span className="relative flex size-5 shrink-0 items-center justify-center">
						<input
							type="checkbox"
							checked={remember}
							onChange={(event) => setRemember(event.target.checked)}
							className="peer size-5 cursor-pointer appearance-none rounded-[6px] border border-border bg-white transition-colors duration-200 ease-out checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
						/>
						<Check
							className="pointer-events-none absolute size-3.5 stroke-[3] text-white opacity-0 peer-checked:opacity-100"
							aria-hidden
						/>
					</span>
					Ghi nhớ đăng nhập
				</label>
				<Link
					href="/quen-mat-khau"
					className="text-sm font-medium text-[#2e7d32] transition-colors duration-200 ease-out hover:text-[#43a047] hover:underline"
				>
					Quên mật khẩu?
				</Link>
			</div>

			<button
				type="submit"
				disabled={status === "loading"}
				className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-base font-semibold text-white transition-all duration-200 ease-out hover:bg-[#43a047] active:translate-y-px active:bg-[#2e7d32] disabled:cursor-not-allowed disabled:opacity-70 md:h-11"
			>
				{status === "loading" ? (
					<>
						<LoaderCircle className="size-5 animate-spin" aria-hidden />
						Đang đăng nhập...
					</>
				) : (
					"Đăng nhập"
				)}
			</button>

			{status === "notice" ? (
				<p
					role="status"
					className="rounded-[10px] bg-[#e3f2fd] px-4 py-3 text-sm text-[#1565c0]"
				>
					Giao diện đã sẵn sàng. Kết nối API đăng nhập sẽ được bổ sung ở task
					backend.
				</p>
			) : null}

			<p className="text-center text-sm text-[#616161]">
				Chưa có tài khoản?{" "}
				<Link
					href="/dang-ky"
					className="font-semibold text-[#2e7d32] transition-colors duration-200 ease-out hover:text-[#43a047] hover:underline"
				>
					Đăng ký miễn phí
				</Link>
			</p>
		</form>
	);
}
