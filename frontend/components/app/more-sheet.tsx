"use client";

import { ChevronRight, LogOut, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { navGroups } from "@/lib/navigation";

/**
 * Menu "Khác" cho mobile — Sheet trượt từ dưới (DESIGN.md §10.1, §24).
 * Chứa thông tin cửa hàng, toàn bộ nhóm nghiệp vụ và nút đăng xuất.
 */

export function MoreSheet({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	// Khóa cuộn nền khi sheet mở.
	useEffect(() => {
		if (!open) return;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	// Đóng bằng phím Esc.
	useEffect(() => {
		if (!open) return;
		function onKey(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	return (
		<div
			className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
			aria-hidden={!open}
		>
			{/* Lớp phủ */}
			<button
				type="button"
				aria-label="Đóng menu"
				onClick={onClose}
				className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ease-out ${
					open ? "opacity-100" : "opacity-0"
				}`}
			/>

			{/* Bảng trượt */}
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Menu khác"
				className={`absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-[18px] bg-card transition-transform duration-300 ease-out ${
					open ? "translate-y-0" : "translate-y-full"
				}`}
			>
				{/* Tay nắm + đóng */}
				<div className="relative flex items-center justify-center pb-1 pt-3">
					<span className="h-1.5 w-10 rounded-full bg-[#e0e0e0]" />
					<button
						type="button"
						onClick={onClose}
						aria-label="Đóng"
						className="absolute right-3 top-2 flex size-10 items-center justify-center rounded-[10px] text-[#616161] hover:bg-[#f5f5f5]"
					>
						<X className="size-5" aria-hidden />
					</button>
				</div>

				<div className="overflow-y-auto px-4 pb-6">
					{/* Thẻ thông tin người dùng — bấm vào mở Thiết lập */}
					<Link
						href="/thiet-lap"
						onClick={onClose}
						className="mb-4 flex items-center gap-3 rounded-[16px] bg-accent p-4"
					>
						<span className="flex size-12 items-center justify-center rounded-full bg-white text-lg font-semibold text-accent-foreground">
							MT
						</span>
						<div className="flex min-w-0 flex-1 flex-col leading-tight">
							<span className="truncate text-lg font-semibold text-foreground">
								Minh Tâm
							</span>
							<span className="truncate text-sm text-[#616161]">
								Chủ cửa hàng · Vật tư Minh Tâm
							</span>
						</div>
						<ChevronRight
							className="size-5 text-accent-foreground"
							aria-hidden
						/>
					</Link>

					{/* Nhóm nghiệp vụ */}
					{navGroups.map((group) => (
						<div key={group.heading} className="mb-4">
							<p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-[#9e9e9e]">
								{group.heading}
							</p>
							<ul className="grid grid-cols-1 gap-1">
								{group.items.map((item) => (
									<li key={item.href}>
										<Link
											href={item.href}
											onClick={onClose}
											className="flex items-center gap-3 rounded-[10px] px-2 py-2.5 text-base font-medium text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
										>
											<span
												className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
												style={{ backgroundColor: item.tile }}
											>
												<item.icon className="size-5 text-white" aria-hidden />
											</span>
											{item.label}
											<ChevronRight
												className="ml-auto size-5 text-[#9e9e9e]"
												aria-hidden
											/>
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}

					{/* Đăng xuất */}
					<button
						type="button"
						className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-border text-base font-semibold text-destructive transition-colors duration-200 ease-out hover:bg-[#fdecea]"
					>
						<LogOut className="size-5" aria-hidden />
						Đăng xuất
					</button>
				</div>
			</div>
		</div>
	);
}
