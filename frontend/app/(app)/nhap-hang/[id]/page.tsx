"use client";

import Link from "next/link";
import { use } from "react";
import { PurchaseDetail } from "@/components/app/purchase/purchase-detail";
import { getPurchase } from "@/lib/purchases";

export default function ChiTietPhieuNhapPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const purchase = getPurchase(id);

	if (!purchase) {
		return (
			<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center lg:mx-0">
				<h1 className="text-lg font-semibold text-foreground">
					Không tìm thấy phiếu nhập
				</h1>
				<p className="text-base text-[#616161]">
					Phiếu có thể đã bị xóa hoặc không tồn tại.
				</p>
				<Link
					href="/nhap-hang"
					className="flex h-12 items-center rounded-[10px] bg-primary px-6 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32]"
				>
					Về danh sách phiếu nhập
				</Link>
			</div>
		);
	}

	return <PurchaseDetail purchase={purchase} />;
}
