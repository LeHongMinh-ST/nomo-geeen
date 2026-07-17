"use client";

import { CameraOff, ScanLine, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/products";
import { getProductByBarcode, getStockStatus } from "@/lib/products";
import { useScrollLock } from "@/lib/use-scroll-lock";

/**
 * Sheet quét mã vạch (DESIGN.md §15.1, §26 PWA).
 * Giai đoạn này: mở camera preview để canh mã + ô nhập/dán mã tay để tra cứu.
 * CHƯA tự giải mã ảnh (chờ tích hợp thư viện/máy quét sau) — nhập tay là đường
 * thêm hàng chính thức ở đây. Tìm SP theo barcode rồi gọi onFound.
 */
export function ScanSheet({
	open,
	onClose,
	onFound,
}: {
	open: boolean;
	onClose: () => void;
	onFound: (product: Product) => void;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [camState, setCamState] = useState<
		"idle" | "on" | "denied" | "unsupported"
	>("idle");

	// Bật/tắt camera theo vòng đời sheet.
	useEffect(() => {
		if (!open) return;
		let stream: MediaStream | null = null;
		let cancelled = false;

		async function start() {
			if (
				typeof navigator === "undefined" ||
				!navigator.mediaDevices?.getUserMedia
			) {
				setCamState("unsupported");
				return;
			}
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "environment" },
					audio: false,
				});
				if (cancelled) {
					for (const t of stream.getTracks()) t.stop();
					return;
				}
				if (videoRef.current) videoRef.current.srcObject = stream;
				setCamState("on");
			} catch {
				setCamState("denied");
			}
		}
		start();

		return () => {
			cancelled = true;
			if (stream) for (const t of stream.getTracks()) t.stop();
		};
	}, [open]);

	// Reset khi mở lại.
	useEffect(() => {
		if (open) {
			setCode("");
			setError(null);
			setCamState("idle");
		}
	}, [open]);

	// Khóa cuộn nền (iOS-safe).
	useScrollLock(open);

	// Đóng bằng phím Esc.
	useEffect(() => {
		if (!open) return;
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	function submit() {
		const product = getProductByBarcode(code);
		if (!product) {
			setError("Không tìm thấy sản phẩm với mã này.");
			return;
		}
		if (getStockStatus(product) === "out-of-stock") {
			setError("Sản phẩm này đã hết hàng.");
			return;
		}
		onFound(product);
		setCode("");
		setError(null);
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
				aria-label="Quét mã vạch"
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
					<h2 className="mb-3 text-lg font-bold text-foreground">
						Quét mã vạch
					</h2>

					{/* Khung camera */}
					<div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-[16px] bg-[#111]">
						{camState === "on" ? (
							<>
								<video
									ref={videoRef}
									autoPlay
									playsInline
									muted
									className="size-full object-cover"
								>
									<track kind="captions" />
								</video>
								{/* Khung ngắm */}
								<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
									<div className="relative h-28 w-4/5 rounded-[12px] border-2 border-white/80">
										<ScanLine
											className="absolute inset-x-0 top-1/2 mx-auto size-8 -translate-y-1/2 text-primary"
											aria-hidden
										/>
									</div>
								</div>
								<p className="absolute inset-x-0 bottom-3 text-center text-sm font-medium text-white/90">
									Đưa mã vào khung, rồi nhập số bên dưới
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

					{/* Nhập mã tay */}
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="barcode"
							className="text-sm font-semibold text-[#616161]"
						>
							Mã vạch
						</label>
						<div className="flex items-center gap-2">
							<input
								id="barcode"
								inputMode="numeric"
								value={code}
								onChange={(e) => {
									setCode(e.target.value);
									setError(null);
								}}
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
								className="flex h-12 shrink-0 items-center gap-2 rounded-[10px] bg-primary px-5 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32] disabled:cursor-not-allowed disabled:bg-[#a5d6a7]"
							>
								Thêm
							</button>
						</div>
						{error ? (
							<p className="text-sm font-medium text-destructive">{error}</p>
						) : (
							<p className="text-sm text-[#9e9e9e]">
								Máy quét mã vạch chuyên dụng sẽ tích hợp sau.
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
