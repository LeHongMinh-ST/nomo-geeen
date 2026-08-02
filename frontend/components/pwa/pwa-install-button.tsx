"use client";

import {
	Check,
	MoreVertical,
	PlusSquare,
	Share,
	Smartphone,
	X,
} from "lucide-react";
import { useState } from "react";
import { usePwaInstall } from "@/lib/use-pwa-install";

/**
 * CTA cài PWA trên trang đăng nhập mobile (plans/pwa-install-login-mobile.md).
 *
 * - Chỉ hiện trên mobile, sau khi hydrate, và không khi đang chạy standalone.
 * - Android/Chromium: mở install prompt native qua beforeinstallprompt.
 * - iOS Safari: CTA hiện trước; chỉ khi bấm CTA mới mở sheet hướng dẫn
 *   "Chia sẻ → Thêm vào màn hình chính".
 * - Ẩn ngay khi cài xong (appinstalled) hoặc người dùng đóng hướng dẫn (dismiss).
 */
export function PwaInstallButton() {
	const { canShow, canUseNativePrompt, isIosSafari, install, dismiss, prompting } =
		usePwaInstall();
	const [showGuide, setShowGuide] = useState(false);

	if (!canShow) return null;
	const guideSteps = isIosSafari
		? [
				{
					icon: Share,
					title: "Mở menu Chia sẻ",
					description: "Chạm nút Chia sẻ ở thanh công cụ Safari.",
				},
				{
					icon: PlusSquare,
					title: "Thêm vào màn hình chính",
					description: "Cuộn xuống trong menu rồi chọn mục này.",
				},
				{
					icon: Check,
					title: "Bấm Thêm",
					description: "Xác nhận để đưa NomoGreen ra màn hình chính.",
				},
			]
		: [
				{
					icon: MoreVertical,
					title: "Mở menu trình duyệt",
					description: "Chạm nút ⋮ ở góc trên màn hình.",
				},
				{
					icon: PlusSquare,
					title: "Cài đặt ứng dụng",
					description: "Chọn Cài đặt ứng dụng hoặc Thêm vào màn hình chính.",
				},
				{
					icon: Check,
					title: "Xác nhận cài đặt",
					description: "Bấm Cài đặt để hoàn tất.",
				},
			];

	function handleClick() {
		if (isIosSafari || !canUseNativePrompt) {
			// Fallback cho iOS, DevTools/local dev hoặc browser chưa phát prompt.
			setShowGuide(true);
			return;
		}
		void install();
	}

	return (
		<div className="mt-4 flex flex-col gap-2">
			<button
				type="button"
				onClick={handleClick}
				disabled={prompting}
				aria-label="Cài ứng dụng NomoGreen"
				className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-white text-base font-semibold text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5] active:bg-[#e6e6e6] disabled:opacity-70"
			>
				<Smartphone className="size-5" aria-hidden />
				Cài ứng dụng NomoGreen
			</button>

			{showGuide ? (
				<div
					className="fixed inset-0 z-50 flex items-end bg-[#172016]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
				>
				<section
					role="dialog"
					aria-modal="true"
					aria-label="Hướng dẫn cài ứng dụng NomoGreen"
					className="max-h-[90dvh] w-full overflow-y-auto rounded-t-[24px] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 text-left shadow-[0_-18px_60px_rgba(23,32,22,0.2)] sm:max-w-md sm:rounded-[24px] sm:p-6"
				>
					<div className="flex items-start justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="flex size-12 items-center justify-center rounded-[14px] bg-[#eaf6e7] text-primary">
								<Smartphone className="size-6" aria-hidden />
							</div>
							<div>
								<p className="text-lg font-bold tracking-tight text-foreground">
									Cài NomoGreen
								</p>
								<p className="text-sm text-muted-foreground">
									Mở nhanh như một ứng dụng trên điện thoại
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={dismiss}
							aria-label="Đóng hướng dẫn cài ứng dụng"
							className="-mr-2 -mt-2 flex size-12 shrink-0 items-center justify-center rounded-[10px] text-[#616161] hover:bg-[#f1f3f0]"
						>
							<X className="size-5" aria-hidden />
						</button>
					</div>
					<div className="mt-5 rounded-[16px] bg-[#f5f8f4] px-4 py-3 text-sm text-muted-foreground">
						Cài một lần, lần sau chỉ cần chạm biểu tượng NomoGreen để mở.
					</div>
					<div className="mt-5 space-y-3">
						{guideSteps.map((step, index) => {
							const StepIcon = step.icon;
							return (
								<div className="flex items-center gap-3" key={step.title}>
									<div className="relative flex size-12 shrink-0 items-center justify-center rounded-[14px] border border-[#dbe8d7] bg-white text-primary shadow-[0_4px_12px_rgba(92,173,69,0.08)]">
										<StepIcon className="size-5" aria-hidden />
										<span className="absolute -left-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
											{index + 1}
										</span>
									</div>
									<div className="min-w-0">
										<p className="font-semibold text-foreground">{step.title}</p>
										<p className="text-sm leading-relaxed text-muted-foreground">
											{step.description}
										</p>
									</div>
								</div>
							);
						})}
					</div>
					<p className="mt-5 text-center text-xs text-muted-foreground">
						{isIosSafari ? "Hướng dẫn dành cho Safari trên iPhone/iPad" : "Tên mục có thể khác nhau tùy phiên bản trình duyệt"}
					</p>
				</section>
				</div>
			) : null}
		</div>
	);
}
