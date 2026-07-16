"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Header cho các màn con của Thiết lập — mobile-first.
 * Nút quay lại + tiêu đề + mô tả ngắn (DESIGN.md §11).
 */

export function SettingHeader({
	title,
	description,
}: {
	title: string;
	description?: string;
}) {
	const router = useRouter();

	return (
		<div className="flex items-start gap-3">
			<button
				type="button"
				onClick={() => router.back()}
				aria-label="Quay lại"
				className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
			>
				<ArrowLeft className="size-5" aria-hidden />
			</button>
			<div className="flex flex-col gap-1 pt-0.5">
				<h1 className="text-2xl font-bold tracking-tight text-foreground">
					{title}
				</h1>
				{description ? (
					<p className="text-base text-[#616161]">{description}</p>
				) : null}
			</div>
		</div>
	);
}
