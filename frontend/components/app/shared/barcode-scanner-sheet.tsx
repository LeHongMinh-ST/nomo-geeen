"use client";

import {
	BrowserMultiFormatReader,
	type IScannerControls,
} from "@zxing/browser";
import { CameraOff, ScanLine, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useScrollLock } from "@/lib/use-scroll-lock";

/**
 * Sheet quét mã vạch dùng chung (DESIGN.md §15.1, §26 PWA).
 * Mở camera preview, tự giải mã bằng BarcodeDetector khi trình duyệt hỗ trợ,
 * và luôn giữ ô nhập/dán mã tay làm fallback. Caller tự tra sản phẩm / điền form.
 */
export function BarcodeScannerSheet({
	open,
	onClose,
	onCode,
	title = "Quét mã vạch",
	hint = "Đưa mã vào khung, rồi nhập số bên dưới",
}: {
	open: boolean;
	onClose: () => void;
	/** Nhận mã đã nhập/quét; caller tự tra cứu theo mã. */
	onCode: (code: string) => void;
	title?: string;
	hint?: string;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const detectedRef = useRef(false);
	const [code, setCode] = useState("");
	const [camState, setCamState] = useState<
		"idle" | "on" | "denied" | "unsupported"
	>("idle");

	useEffect(() => {
		if (open) {
			setCode("");
			setCamState("idle");
			detectedRef.current = false;
		}
	}, [open]);

	// Scanner lifecycle follows sheet visibility; callbacks are intentionally read from the open session.
	// biome-ignore lint/correctness/useExhaustiveDependencies: do not restart camera on parent callback identity changes
	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		let controls: IScannerControls | null = null;
		const reader = new BrowserMultiFormatReader();

		async function start() {
			if (
				typeof navigator === "undefined" ||
				!navigator.mediaDevices?.getUserMedia
			) {
				setCamState("unsupported");
				return;
			}
			try {
				if (!videoRef.current) return;
				const pendingControls = reader.decodeFromVideoDevice(
					undefined,
					videoRef.current,
					(result) => {
						if (cancelled || detectedRef.current || !result) return;
						const detectedCode = result.getText().trim();
						if (!detectedCode) return;
						detectedRef.current = true;
						onCode(detectedCode);
					},
				);
				controls = await pendingControls;
				if (cancelled) controls.stop();
				else setCamState("on");
			} catch {
				setCamState("denied");
			}
		}
		start();

		return () => {
			cancelled = true;
			controls?.stop();
			if (videoRef.current) videoRef.current.srcObject = null;
		};
	}, [open]);

	useScrollLock(open);

	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	function submit() {
		const trimmed = code.trim();
		if (!trimmed) return;
		onCode(trimmed);
		setCode("");
	}

	return (
		<div
			className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
			aria-hidden={!open}
		>
			<button
				type="button"
				aria-label="Đóng"
				onClick={onClose}
				className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ease-out ${
					open ? "opacity-100" : "opacity-0"
				}`}
			/>

			<div
				role="dialog"
				aria-modal="true"
				aria-label={title}
				className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-[18px] bg-card transition-transform duration-300 ease-out ${
					open ? "translate-y-0" : "translate-y-full"
				}`}
			>
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

				<div className="pb-safe overflow-y-auto overscroll-contain px-4 pb-4">
					<h2 className="mb-3 text-lg font-bold text-foreground">{title}</h2>

					<div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-[16px] bg-[#111]">
						<video
							ref={videoRef}
							autoPlay
							playsInline
							muted
							className={`size-full object-cover ${camState === "on" ? "" : "hidden"}`}
						>
							<track kind="captions" />
						</video>
						{camState === "on" ? (
							<>
								<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
									<div className="relative h-28 w-4/5 rounded-[12px] border-2 border-white/80">
										<ScanLine
											className="absolute inset-x-0 top-1/2 mx-auto size-8 -translate-y-1/2 text-primary"
											aria-hidden
										/>
									</div>
								</div>
								<p className="absolute inset-x-0 bottom-3 text-center text-sm font-medium text-white/90">
									{hint}
								</p>
							</>
						) : (
							<div className="flex size-full flex-col items-center justify-center gap-2 px-6 text-center">
								<CameraOff className="size-9 text-white/70" aria-hidden />
								<p className="text-base font-medium text-white/90">
									{camState === "denied"
										? "Chưa cấp quyền camera"
										: camState === "unsupported"
											? "Thiết bị không hỗ trợ camera"
											: "Đang mở camera..."}
								</p>
								<p className="text-sm text-white/60">
									Có thể nhập mã vạch bằng tay bên dưới.
								</p>
							</div>
						)}
					</div>

					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="barcode-scanner-input"
							className="text-sm font-semibold text-[#616161]"
						>
							Mã vạch
						</label>
						<div className="flex items-center gap-2">
							<input
								id="barcode-scanner-input"
								inputMode="numeric"
								value={code}
								onChange={(e) => setCode(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") submit();
								}}
								placeholder="Nhập / dán mã vạch..."
								className="h-12 flex-1 rounded-[10px] border border-border bg-white px-4 text-base text-foreground placeholder:text-[#9e9e9e] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
							/>
							<button
								type="button"
								onClick={submit}
								disabled={!code.trim()}
								className="flex h-12 shrink-0 items-center gap-2 rounded-[10px] bg-primary px-5 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] disabled:cursor-not-allowed disabled:bg-[#a5d6a7]"
							>
								Dùng mã
							</button>
						</div>
						<p className="text-sm text-[#9e9e9e]">
							Nếu camera không tự quét, hãy nhập mã bên dưới.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
