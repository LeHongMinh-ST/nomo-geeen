"use client";

import { use } from "react";
import { PurchaseDetail } from "@/components/app/purchase/purchase-detail";

export default function ChiTietPhieuNhapPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	return <PurchaseDetail purchaseId={id} />;
}
