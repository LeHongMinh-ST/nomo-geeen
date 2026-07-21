"use client";
import { use } from "react";
import { InventoryDetail } from "@/components/app/inventory/inventory-detail";
export default function ChiTietTonKhoPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	return <InventoryDetail productId={id} />;
}
