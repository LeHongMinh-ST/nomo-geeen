"use client";

import { useEffect, useRef } from "react";

export function AdjustmentConfirmation({
	open,
	delta,
	docNo,
	error,
	pending,
	onCancel,
	onConfirm,
}: {
	open: boolean;
	delta: string;
	docNo: string;
	error?: string | null;
	pending: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	const cancelRef = useRef<HTMLButtonElement>(null);
	const confirmRef = useRef<HTMLButtonElement>(null);
	const onCancelRef = useRef(onCancel);
	const pendingRef = useRef(pending);
	onCancelRef.current = onCancel;
	pendingRef.current = pending;
	useEffect(() => {
		if (!open) return;
		const previous = document.activeElement as HTMLElement | null;
		confirmRef.current?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !pendingRef.current) {
				event.preventDefault();
				onCancelRef.current();
				return;
			}
			if (event.key !== "Tab") return;
			const first = cancelRef.current;
			const last = confirmRef.current;
			if (!first || !last) return;
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			previous?.focus();
		};
	}, [open]);
	if (!open) return null;
	return (
		<div
			className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
			role="dialog"
			aria-modal="true"
			aria-labelledby="adjustment-confirmation-title"
		>
			<div className="w-full max-w-md rounded-[16px] bg-card p-5 shadow-card">
				<h2 id="adjustment-confirmation-title" className="text-lg font-bold">
					Xác nhận hoàn tất phiếu
				</h2>
				<p
					id="adjustment-confirmation-description"
					className="mt-2 text-base text-[#616161]"
				>
					Phiếu <b>{docNo}</b> đang ở trạng thái bản nháp và sẽ thay đổi tồn kho
					với chênh lệch <b>{delta}</b>. Bạn có chắc muốn hoàn tất?
				</p>
				{error ? (
					<p
						id="adjustment-confirmation-error"
						role="alert"
						className="mt-3 rounded-[10px] bg-destructive/5 px-3 py-2 text-sm text-destructive"
					>
						{error}
					</p>
				) : null}
				<div className="mt-5 flex gap-3">
					<button
						ref={cancelRef}
						type="button"
						disabled={pending}
						onClick={onCancel}
						className="h-12 flex-1 rounded-[10px] border border-border font-semibold"
					>
						Hủy
					</button>
					<button
						ref={confirmRef}
						type="button"
						disabled={pending}
						onClick={onConfirm}
						aria-describedby={
							error
								? "adjustment-confirmation-error"
								: "adjustment-confirmation-description"
						}
						className="h-12 flex-1 rounded-[10px] bg-primary font-semibold text-white disabled:opacity-60"
					>
						{pending ? "Đang xử lý..." : "Hoàn tất phiếu"}
					</button>
				</div>
			</div>
		</div>
	);
}
