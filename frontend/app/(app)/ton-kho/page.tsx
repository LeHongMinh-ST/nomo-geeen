import type { Metadata } from "next";
import { InventoryList } from "@/components/app/inventory/inventory-list";

export const metadata: Metadata = {
	title: "Tồn kho · NomoGreen",
};

export default function TonKhoPage() {
	return <InventoryList />;
}
