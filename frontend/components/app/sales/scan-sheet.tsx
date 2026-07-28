"use client";

import {
	BrowserMultiFormatReader,
	type IScannerControls,
} from "@zxing/browser";
import { CameraOff, ScanLine, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getStockStatus, type Product } from "@/lib/products";
import { useScrollLock } from "@/lib/use-scroll-lock";

/**
 * Sheet quét mã vạch (DESIGN.md §15.1, §26 PWA).
 * Mở camera preview và tự giải mã barcode khi BarcodeDetector được hỗ trợ;
 * ô nhập/dán mã tay luôn là fallback. Tìm SP theo barcode rồi gọi onFound,
 * hoặc trả mã thẳng cho form qua onCode.
 */
export function ScanSheet({
	open,
	onClose,
	onFound,
	products,
	onCode,
}: {
	open: boolean;
	onClose: () => void;
	onFound: (product: Product) => void;
	products: Product[];
	onCode?: (code: string) => void;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const detectedRef = useRef(false);
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [camState, setCamState] = useState<
		"idle" | "on" | "denied" | "unsupported"
	>("idle");

	// Reset khi mở lại.
	useEffect(() => {
		if (open) {
			setCode("");
			setError(null);
			setCamState("idle");
			detectedRef.current = false;
		}
	}, [open]);

	// Bật/tắt camera và tự giải mã theo vòng đời sheet.
	// Scanner lifecycle follows sheet visibility; callbacks are intentionally read from the open session.
	// biome-ignore lint/correctness/useExhaustiveDependencies: do not restart camera on parent callback identity changes
	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		let controls: IScannerControls | null = null;
		let stream: MediaStream | null = null;
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
				const video = videoRef.current;
				if (!video) return;
				stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: { ideal: "environment" } },
					audio: false,
				});
				if (cancelled) {
					stream.getTracks().forEach((track) => {
						track.stop();
					});
					return;
				}
				setCamState("on");
				const pendingControls = reader.decodeFromStream(
					stream,
					video,
					(result) => {
						if (cancelled || detectedRef.current || !result) return;
						const detectedCode = result.getText().trim();
						if (!detectedCode) return;
						detectedRef.current = true;
						setCode(detectedCode);
						setError(null);
						handleCode(detectedCode);
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
			stream?.getTracks().forEach((track) => {
				track.stop();
			});
			if (videoRef.current) videoRef.current.srcObject = null;
		};
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

	function handleCode(nextCode: string) {
		if (onCode) {
			onCode(nextCode);
			return;
		}
		const product = products.find(
			(item) => item.barcode?.trim() === nextCode.trim(),
		);
		if (!product) {
			setError("Không tìm thấy sản phẩm với mã này.");
			detectedRef.current = false;
			return;
		}
		if (getStockStatus(product) === "out-of-stock") {
			setError("Sản phẩm này đã hết hàng.");
			detectedRef.current = false;
			return;
		}
		onFound(product);
		setCode("");
		setError(null);
	}

	function submit() {
		const nextCode = code.trim();
		if (!nextCode) return;
		if (onCode) {
			handleCode(nextCode);
			return;
		}
		const product = products.find((item) => item.barcode?.trim() === nextCode);
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
			className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
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
									{onCode
										? "Đưa mã vào khung để tự điền vào form"
										: "Đưa mã vào khung để tìm sản phẩm"}
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
								className="flex h-12 shrink-0 items-center gap-2 rounded-[10px] bg-primary px-5 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] disabled:cursor-not-allowed disabled:bg-[#a5d6a7]"
							>
								Thêm
							</button>
						</div>
						{error ? (
							<p className="text-sm font-medium text-destructive">{error}</p>
						) : (
							<p className="text-sm text-[#9e9e9e]">
								{onCode
									? "Nếu camera không tự quét, hãy nhập mã bên dưới."
									: "Nếu camera không tự quét, hãy nhập mã bên dưới."}
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
