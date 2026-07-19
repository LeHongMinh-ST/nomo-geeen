"use client";

import Link from "next/link";
import { use } from "react";
import { OrderDetail } from "@/components/app/sales/order-detail";
import { getOrder } from "@/lib/orders";

export default function ChiTietDonPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const order = getOrder(id);

	if (!order) {
		return (
			<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center lg:mx-0">
				<h1 className="text-lg font-semibold text-foreground">
					Không tìm thấy đơn
				</h1>
				<p className="text-base text-[#616161]">
					Đơn có thể đã bị xóa hoặc không tồn tại.
				</p>
				<Link
					href="/don-ban-hang"
					className="flex h-12 items-center rounded-[10px] bg-primary px-6 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
				>
					Về danh sách đơn
				</Link>
			</div>
		);
	}

	return <OrderDetail order={order} />;
}
