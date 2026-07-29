"use client";

import { Copy, ScanLine } from "lucide-react";
import { useState } from "react";

export function QuickSaleDraftToken({ joinToken }: { joinToken: string }) {
	const [copied, setCopied] = useState(false);

	async function copyToken() {
		if (typeof navigator === "undefined" || !navigator.clipboard) return;
		try {
			await navigator.clipboard.writeText(joinToken);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1_500);
		} catch {
			// Non-fatal: user can still read the token manually.
		}
	}

	return (
		<div className="flex items-center gap-2 rounded-[12px] border border-dashed border-primary/40 bg-primary-soft px-3 py-2 text-base">
			<ScanLine className="size-5 shrink-0 text-primary" aria-hidden />
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="text-xs font-semibold uppercase tracking-wide text-primary">
					Mã tham gia
				</span>
				<span className="font-mono text-base font-bold tracking-[0.18em] text-foreground">
					{joinToken}
				</span>
				<span className="text-xs text-muted">
					Nhập mã này trên điện thoại ở mục Bán nhanh để quét barcode chung giỏ.
				</span>
			</div>
			<button
				type="button"
				onClick={copyToken}
				className="flex min-h-11 items-center gap-1.5 rounded-[10px] border border-primary/40 bg-white px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft"
				aria-label="Sao chép mã tham gia"
			>
				<Copy className="size-4" aria-hidden />
				{copied ? "Đã sao" : "Sao chép"}
			</button>
		</div>
	);
}
