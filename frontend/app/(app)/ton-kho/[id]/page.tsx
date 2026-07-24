"use client";
import { use } from "react";
import { AdjustmentDetail } from "@/components/app/inventory/adjustment-detail";
import { InventoryDetail } from "@/components/app/inventory/inventory-detail";
export default function ChiTietTonKhoPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams?: Promise<{ adjustment?: string }>;
}) {
	const { id } = use(params);
	const query = searchParams ? use(searchParams) : {};
	if (query.adjustment) return <AdjustmentDetail id={query.adjustment} />;
	return <InventoryDetail productId={id} />;
}
