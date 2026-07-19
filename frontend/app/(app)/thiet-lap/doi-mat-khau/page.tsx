"use client";

import { Lock } from "lucide-react";
import { useState } from "react";
import { SettingHeader } from "@/components/app/setting-header";
import { PasswordField } from "@/components/auth/fields";

/**
 * Màn Đổi mật khẩu — mobile-first (DESIGN.md §7, §8).
 * FE-only: validate tại chỗ, chưa nối API.
 */

export default function DoiMatKhauPage() {
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [confirm, setConfirm] = useState("");
	const [errors, setErrors] = useState<{
		current?: string;
		next?: string;
		confirm?: string;
	}>({});
	const [saved, setSaved] = useState(false);

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const nextErrors: typeof errors = {};
		if (!current) nextErrors.current = "Vui lòng nhập mật khẩu hiện tại.";
		if (!next) {
			nextErrors.next = "Vui lòng nhập mật khẩu mới.";
		} else if (next.length < 6) {
			nextErrors.next = "Mật khẩu mới cần tối thiểu 6 ký tự.";
		}
		if (confirm !== next) {
			nextErrors.confirm = "Mật khẩu nhập lại chưa khớp.";
		}
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) {
			setSaved(false);
			return;
		}
		// TODO: gọi API đổi mật khẩu khi backend sẵn sàng.
		setSaved(true);
		setCurrent("");
		setNext("");
		setConfirm("");
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:mx-0">
			<SettingHeader
				title="Đổi mật khẩu"
				description="Đặt mật khẩu mới để bảo vệ tài khoản của bạn."
			/>

			<form
				onSubmit={handleSubmit}
				className="flex flex-col gap-5 rounded-[16px] border border-border bg-card p-5 shadow-card"
			>
				<PasswordField
					label="Mật khẩu hiện tại"
					value={current}
					onChange={(value) => {
						setCurrent(value);
						setErrors((c) => ({ ...c, current: undefined }));
					}}
					placeholder="Nhập mật khẩu hiện tại"
					error={errors.current}
					icon={Lock}
				/>

				<PasswordField
					label="Mật khẩu mới"
					value={next}
					onChange={(value) => {
						setNext(value);
						setErrors((c) => ({ ...c, next: undefined }));
					}}
					placeholder="Tối thiểu 6 ký tự"
					autoComplete="new-password"
					error={errors.next}
					icon={Lock}
				/>

				<PasswordField
					label="Nhập lại mật khẩu mới"
					value={confirm}
					onChange={(value) => {
						setConfirm(value);
						setErrors((c) => ({ ...c, confirm: undefined }));
					}}
					placeholder="Nhập lại mật khẩu mới"
					autoComplete="new-password"
					error={errors.confirm}
					icon={Lock}
				/>

				{saved ? (
					<p
						role="status"
						className="rounded-[10px] bg-[#e8f5e9] px-4 py-3 text-sm text-[#2e7d32]"
					>
						Đã đổi mật khẩu. Kết nối API sẽ được bổ sung ở task backend.
					</p>
				) : null}

				<button
					type="submit"
					className="flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-base font-semibold text-white transition-all duration-200 ease-out hover:bg-[#5cad45] active:translate-y-px active:bg-[#3f8530] md:h-11"
				>
					Đổi mật khẩu
				</button>
			</form>
		</div>
	);
}
