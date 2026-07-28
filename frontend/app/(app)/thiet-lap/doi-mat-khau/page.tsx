"use client";
import { Lock } from "lucide-react";
import { useState } from "react";
import { SettingHeader } from "@/components/app/setting-header";
import { PasswordField } from "@/components/auth/fields";
import { useUserAuth } from "@/stores/user-auth-store";
export default function DoiMatKhauPage() {
	const changePassword = useUserAuth((state) => state.changePassword);
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setSaved(false);
		if (
			!current ||
			next.length < 12 ||
			!/(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])/.test(next) ||
			next !== confirm
		) {
			setError(
				"Mật khẩu mới cần tối thiểu 12 ký tự gồm chữ, số, ký tự đặc biệt và phải nhập lại khớp.",
			);
			return;
		}
		setSubmitting(true);
		try {
			await changePassword(current, next);
			setSaved(true);
			setCurrent("");
			setNext("");
			setConfirm("");
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Không thể đổi mật khẩu.",
			);
		} finally {
			setSubmitting(false);
		}
	}
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:mx-0">
			<SettingHeader
				title="Đổi mật khẩu"
				description="Dùng mật khẩu mạnh để bảo vệ tài khoản cửa hàng."
			/>
			<form
				onSubmit={submit}
				className="flex flex-col gap-5 rounded-[16px] border border-border bg-card p-5 shadow-card"
			>
				<PasswordField
					label="Mật khẩu hiện tại"
					value={current}
					onChange={setCurrent}
					placeholder="Nhập mật khẩu hiện tại"
					error={undefined}
					icon={Lock}
				/>
				<PasswordField
					label="Mật khẩu mới"
					value={next}
					onChange={setNext}
					placeholder="Tối thiểu 12 ký tự"
					autoComplete="new-password"
					error={undefined}
					icon={Lock}
				/>
				<PasswordField
					label="Nhập lại mật khẩu mới"
					value={confirm}
					onChange={setConfirm}
					placeholder="Nhập lại mật khẩu mới"
					autoComplete="new-password"
					error={undefined}
					icon={Lock}
				/>
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
						Đã đổi mật khẩu.
					</p>
				) : null}
				<button
					type="submit"
					disabled={submitting}
					className="flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-base font-semibold text-white disabled:opacity-50"
				>
					{submitting ? "Đang lưu…" : "Đổi mật khẩu"}
				</button>
			</form>
		</div>
	);
}
