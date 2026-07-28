"use client";

import { ScanLine } from "lucide-react";
import { useState } from "react";
import { BarcodeScannerSheet } from "@/components/app/shared/barcode-scanner-sheet";

/**
 * Ô nhập mã vạch + nút quét (DESIGN.md §15.1) — dùng trong các form/field có
 * barcode (vd. Thêm sản phẩm). Mobile/tablet hiện nút quét cạnh ô nhập; desktop
 * dùng máy quét cắm ngoài gõ thẳng vào ô.
 */
export function BarcodeInput({
	value,
	onChange,
	placeholder = "Nhập hoặc quét mã vạch",
	id,
	name,
	disabled,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	id?: string;
	name?: string;
	disabled?: boolean;
}) {
	const [scanOpen, setScanOpen] = useState(false);

	return (
		<>
			<div className="flex items-center gap-2">
				<input
					id={id}
					name={name}
					type="text"
					inputMode="numeric"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					disabled={disabled}
					className="h-12 flex-1 rounded-[10px] border border-border bg-white px-4 text-base text-foreground placeholder:text-[#9e9e9e] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
				/>
				<button
					type="button"
					onClick={() => setScanOpen(true)}
					aria-label="Quét mã vạch"
					disabled={disabled}
					className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-50 lg:hidden"
				>
					<ScanLine className="size-5.5" aria-hidden />
				</button>
			</div>

			<BarcodeScannerSheet
				open={scanOpen}
				onClose={() => setScanOpen(false)}
				onCode={(code) => {
					onChange(code);
					setScanOpen(false);
				}}
			/>
		</>
	);
}
