"use client";
import {
	KeyRound,
	LoaderCircle,
	LogIn,
	ScanFace,
	UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PasswordField, TextField } from "@/components/auth/fields";
import {
	authenticatePasskey,
	canUsePasskey,
	isPasskeyCacheFresh,
} from "@/lib/passkey";
import type { UserApiError } from "@/lib/user-auth-api";
import { passkeyAuthenticationOptions } from "@/lib/user-auth-api";
import { useUserAuth } from "@/stores/user-auth-store";

export function LoginForm() {
	const router = useRouter();
	const login = useUserAuth((state) => state.login);
	const loginPasskey = useUserAuth((state) => state.loginPasskey);
	const loading = useUserAuth((state) => state.loading);
	const [identifier, setIdentifier] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [serverError, setServerError] = useState("");
	const [passkeyAvailable, setPasskeyAvailable] = useState(false);
	const [cached, setCached] = useState<{
		challengeId: string;
		options: unknown;
		expiresAt: number;
	} | null>(null);
	const [passkeyBusy, setPasskeyBusy] = useState(false);
	const [passkeyRefresh, setPasskeyRefresh] = useState(0);
	const prefetchRequest = useMemo(
		() => ({
			identifier: identifier.trim() || undefined,
			generation: passkeyRefresh,
		}),
		[identifier, passkeyRefresh],
	);
	useEffect(() => {
		let active = true;
		const timer = setTimeout(() => {
			void (async () => {
				if (!(await canUsePasskey())) {
					if (active) setPasskeyAvailable(false);
					return;
				}
				if (active) setPasskeyAvailable(true);
				try {
					const next = await passkeyAuthenticationOptions(
						prefetchRequest.identifier,
					);
					if (active) setCached({ ...next, expiresAt: Date.now() + 290000 });
				} catch {
					if (active) setCached(null);
				}
			})();
		}, 200);
		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [prefetchRequest]);
	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const nextErrors: Record<string, string> = {};
		if (!identifier.trim())
			nextErrors.identifier =
				"Vui lòng nhập tên đăng nhập, email hoặc số điện thoại.";
		if (!password) nextErrors.password = "Vui lòng nhập mật khẩu.";
		setErrors(nextErrors);
		setServerError("");
		if (Object.keys(nextErrors).length) return;
		try {
			await login(identifier, password);
			router.replace("/");
		} catch (error) {
			setServerError((error as UserApiError).message || "Đăng nhập thất bại.");
		}
	}
	async function handlePasskey() {
		const ready = cached;
		if (!ready || !isPasskeyCacheFresh(ready)) {
			setCached(null);
			setPasskeyRefresh((value) => value + 1);
			setServerError(
				ready
					? "Phiên chuẩn bị đã hết hạn, vui lòng bấm lại"
					: "Đang chuẩn bị đăng nhập sinh trắc học. Vui lòng bấm lại sau giây lát.",
			);
			return;
		}
		setPasskeyBusy(true);
		setServerError("");
		try {
			const response = await authenticatePasskey(ready.options);
			await loginPasskey(ready.challengeId, response);
			router.replace("/");
		} catch (error) {
			setServerError(
				(error as UserApiError).message ||
					"Không thể đăng nhập bằng sinh trắc học.",
			);
		} finally {
			setCached(null);
			setPasskeyRefresh((value) => value + 1);
			setPasskeyBusy(false);
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
			<div className="flex items-center gap-2">
				<button
					type="submit"
					disabled={loading || passkeyBusy}
					className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary text-base font-semibold text-white disabled:opacity-70"
				>
					{loading ? (
						<LoaderCircle className="size-5 animate-spin" aria-hidden />
					) : (
						<LogIn className="size-5" aria-hidden />
					)}
					{loading ? "Đang đăng nhập..." : "Đăng nhập"}
				</button>
				{passkeyAvailable ? (
					<button
						type="button"
						onClick={handlePasskey}
						disabled={loading || passkeyBusy}
						aria-label="Đăng nhập bằng Face ID / sinh trắc học"
						className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-border bg-white text-foreground disabled:opacity-70 lg:hidden"
					>
						<ScanFace className="size-5" aria-hidden />
					</button>
				) : null}
			</div>
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
