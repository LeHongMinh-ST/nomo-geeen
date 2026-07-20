"use client";

import {
	ArrowRight,
	Building2,
	KeyRound,
	LoaderCircle,
	Mail,
	UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PasswordField, TextField } from "@/components/auth/fields";
import type { UserApiError } from "@/lib/user-auth-api";
import { useUserAuth } from "@/stores/user-auth-store";

export function RegisterForm() {
	const register = useUserAuth((state) => state.register);
	const loading = useUserAuth((state) => state.loading);
	const [values, setValues] = useState({
		tenantName: "",
		slug: "",
		fullName: "",
		username: "",
		email: "",
		password: "",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [serverError, setServerError] = useState("");
	const update = (key: keyof typeof values) => (value: string) =>
		setValues((current) => ({ ...current, [key]: value }));

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const next: Record<string, string> = {};
		if (!values.tenantName.trim())
			next.tenantName = "Vui lòng nhập tên cửa hàng.";
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug.trim().toLowerCase()))
			next.slug = "Mã cửa hàng dùng chữ thường, số và dấu gạch ngang.";
		if (!values.fullName.trim()) next.fullName = "Vui lòng nhập họ tên.";
		if (!values.username.trim()) next.username = "Vui lòng nhập tên đăng nhập.";
		if (values.email && !/^\S+@\S+\.\S+$/.test(values.email))
			next.email = "Email chưa đúng định dạng.";
		if (values.password.length < 12)
			next.password = "Mật khẩu cần ít nhất 12 ký tự.";
		setErrors(next);
		setServerError("");
		if (Object.keys(next).length > 0) return;
		try {
			await register({
				...values,
				slug: values.slug.trim().toLowerCase(),
				email: values.email || undefined,
			});
			window.location.assign("/");
		} catch (error) {
			setServerError(
				(error as UserApiError).message || "Không thể tạo tài khoản.",
			);
		}
	}

	return (
		<form onSubmit={submit} noValidate className="flex flex-col gap-5">
			<div className="grid gap-5 sm:grid-cols-2">
				<TextField
					label="Tên cửa hàng"
					value={values.tenantName}
					onChange={update("tenantName")}
					placeholder="Cửa hàng của tôi"
					error={errors.tenantName}
					icon={Building2}
				/>
				<TextField
					label="Mã cửa hàng"
					value={values.slug}
					onChange={update("slug")}
					placeholder="cua-hang-cua-toi"
					error={errors.slug}
					autoComplete="organization"
				/>
			</div>
			<TextField
				label="Họ và tên chủ cửa hàng"
				value={values.fullName}
				onChange={update("fullName")}
				placeholder="Nguyễn Văn An"
				error={errors.fullName}
				icon={UserRound}
			/>
			<div className="grid gap-5 sm:grid-cols-2">
				<TextField
					label="Tên đăng nhập"
					value={values.username}
					onChange={update("username")}
					placeholder="nguyenan"
					error={errors.username}
					autoComplete="username"
				/>
				<TextField
					label="Email (không bắt buộc)"
					type="email"
					value={values.email}
					onChange={update("email")}
					placeholder="ban@cuahang.vn"
					error={errors.email}
					autoComplete="email"
					icon={Mail}
				/>
			</div>
			<PasswordField
				label="Mật khẩu"
				value={values.password}
				onChange={update("password")}
				placeholder="Ít nhất 12 ký tự"
				error={errors.password}
				autoComplete="new-password"
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
				className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-base font-semibold text-white transition-all hover:bg-[#4f9c3a] active:translate-y-px disabled:opacity-70"
			>
				{loading ? (
					<LoaderCircle className="size-5 animate-spin" aria-hidden />
				) : (
					<ArrowRight className="size-5" aria-hidden />
				)}
				{loading ? "Đang tạo cửa hàng..." : "Tạo cửa hàng miễn phí"}
			</button>
			<p className="text-center text-sm text-muted-foreground">
				Đã có tài khoản?{" "}
				<Link
					href="/dang-nhap"
					className="font-semibold text-primary hover:underline"
				>
					Đăng nhập
				</Link>
			</p>
		</form>
	);
}
