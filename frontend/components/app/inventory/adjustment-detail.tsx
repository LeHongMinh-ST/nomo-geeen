"use client";

import { ArrowLeft, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";
import {
	getTenantStockAdjustment,
	type StockAdjustment,
} from "@/lib/tenant-stock-adjustments-api";

const reasonLabels: Record<string, string> = {
	DAMAGE: "Hư hỏng",
	LOSS: "Thất thoát",
	COUNT_CORRECTION: "Điều chỉnh kiểm kê",
	EXPIRY: "Hết hạn",
};

export function AdjustmentDetail({ id }: { id: string }) {
	const router = useRouter();
	const [adjustment, setAdjustment] = useState<StockAdjustment | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		getTenantStockAdjustment(id)
			.then((value) => {
				if (active) {
					setAdjustment(value);
					setError(null);
				}
			})
			.catch((reason) => {
				if (active)
					setError(
						reason instanceof Error
							? reason.message
							: "Không thể tải phiếu điều chỉnh",
					);
			});
		return () => {
			active = false;
		};
	}, [id]);

	if (error)
		return (
			<div
				role="alert"
				className="rounded-[16px] border border-dashed border-destructive bg-card px-6 py-14 text-center text-destructive"
			>
				{error}
			</div>
		);
	if (!adjustment)
		return (
			<div className="rounded-[16px] border border-border bg-card px-6 py-14 text-center">
				Đang tải phiếu điều chỉnh...
			</div>
		);

	return (
		<section
			className="flex w-full max-w-3xl flex-col gap-5"
			aria-labelledby="adjustment-detail-title"
		>
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/ton-kho")}
					aria-label="Quay lại lịch sử điều chỉnh"
					className="flex size-11 items-center justify-center rounded-[10px] border border-border bg-card"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div>
					<h1 id="adjustment-detail-title" className="text-2xl font-bold">
						{adjustment.docNo}
					</h1>
					<p className="text-base text-[#616161]">
						Phiếu điều chỉnh · {formatDate(adjustment.createdAt)}
					</p>
				</div>
			</div>
			<div className="grid gap-3 sm:grid-cols-3">
				<Info
					label="Trạng thái"
					value={adjustment.status === "COMPLETED" ? "Đã hoàn tất" : "Bản nháp"}
				/>
				<Info label="Kho" value={adjustment.warehouseId} />
				<Info label="Số dòng" value={String(adjustment.lines.length)} />
			</div>
			<div className="rounded-[16px] border border-border bg-card p-5">
				<p className="text-sm font-semibold text-[#616161]">Ghi chú</p>
				<p className="mt-1 text-base">
					{adjustment.note || "Không có ghi chú"}
				</p>
			</div>
			<div className="rounded-[16px] border border-border bg-card p-5">
				<h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#616161]">
					<ClipboardList className="size-4" aria-hidden />
					Sản phẩm điều chỉnh
				</h2>
				<div className="divide-y divide-border">
					{adjustment.lines.map((line) => (
						<div
							key={line.id}
							className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_auto]"
						>
							<div>
								<p className="font-semibold">{line.productId}</p>
								<p className="text-[#616161]">
									Lô: {line.batchId || "Không có lô"} · Lý do:{" "}
									{reasonLabels[line.reasonCode] ?? line.reasonCode}
								</p>
							</div>
							<div className="text-left sm:text-right">
								<p className="font-semibold">
									{line.delta.startsWith("-") ? "−" : "+"}
									{line.delta.replace(/^[+-]/, "")}
								</p>
								<p className="text-[#616161]">
									Trước {line.qtyBefore} · Sau {line.qtyAfter}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
			{adjustment.status === "COMPLETED" ? (
				<p className="rounded-[10px] border border-[#c8e6c9] bg-[#e8f5e9] px-4 py-3 text-sm text-[#2e7d32]">
					Phiếu đã hoàn tất và chỉ đọc.
				</p>
			) : null}
		</section>
	);
}

function Info({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-[16px] border border-border bg-card p-4">
			<p className="text-sm text-[#616161]">{label}</p>
			<p className="mt-1 break-all font-semibold">{value}</p>
		</div>
	);
}
