"use client";

import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useId, useState } from "react";

/**
 * Field nhập liệu dùng chung cho các form xác thực.
 * Theo DESIGN.md: input cao 44px, radius 10px, border Gray200, focus Primary.
 * Label luôn nằm trên input, lỗi hiển thị ngay dưới input.
 */

type TextFieldProps = {
	label: string;
	type?: "text" | "tel" | "email";
	value: string;
	onChange: (value: string) => void;
	error?: string;
	placeholder?: string;
	autoComplete?: string;
	inputMode?: "text" | "tel" | "email";
	icon?: LucideIcon;
};

const inputBase =
	"h-11 w-full rounded-[10px] border border-border bg-white text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

export function TextField({
	label,
	type = "text",
	value,
	onChange,
	error,
	placeholder,
	autoComplete,
	inputMode,
	icon: Icon,
}: TextFieldProps) {
	const id = useId();
	const errorId = `${id}-error`;

	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={id} className="text-sm font-medium text-foreground">
				{label}
			</label>
			<div className="relative">
				{Icon ? (
					<Icon
						aria-hidden
						className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]"
					/>
				) : null}
				<input
					id={id}
					type={type}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					placeholder={placeholder}
					autoComplete={autoComplete}
					inputMode={inputMode}
					aria-invalid={Boolean(error)}
					aria-describedby={error ? errorId : undefined}
					className={`${inputBase} ${Icon ? "pl-10.5 pr-4" : "px-4"} ${
						error
							? "border-destructive focus:border-destructive focus:ring-destructive/20"
							: ""
					}`}
				/>
			</div>
			{error ? (
				<p id={errorId} className="text-sm text-destructive">
					{error}
				</p>
			) : null}
		</div>
	);
}

type PasswordFieldProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	error?: string;
	placeholder?: string;
	autoComplete?: string;
	icon?: LucideIcon;
};

export function PasswordField({
	label,
	value,
	onChange,
	error,
	placeholder,
	autoComplete = "current-password",
	icon: Icon,
}: PasswordFieldProps) {
	const id = useId();
	const errorId = `${id}-error`;
	const [visible, setVisible] = useState(false);

	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={id} className="text-sm font-medium text-foreground">
				{label}
			</label>
			<div className="relative">
				{Icon ? (
					<Icon
						aria-hidden
						className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]"
					/>
				) : null}
				<input
					id={id}
					type={visible ? "text" : "password"}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					placeholder={placeholder}
					autoComplete={autoComplete}
					aria-invalid={Boolean(error)}
					aria-describedby={error ? errorId : undefined}
					className={`${inputBase} ${Icon ? "pl-10.5" : "pl-4"} pr-12 ${
						error
							? "border-destructive focus:border-destructive focus:ring-destructive/20"
							: ""
					}`}
				/>
				<button
					type="button"
					onClick={() => setVisible((current) => !current)}
					aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
					className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-[10px] text-[#9e9e9e] transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
				>
					{visible ? (
						<EyeOff className="size-4.5" aria-hidden />
					) : (
						<Eye className="size-4.5" aria-hidden />
					)}
				</button>
			</div>
			{error ? (
				<p id={errorId} className="text-sm text-destructive">
					{error}
				</p>
			) : null}
		</div>
	);
}
