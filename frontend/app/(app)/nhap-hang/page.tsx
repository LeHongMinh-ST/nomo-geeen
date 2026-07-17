import type { Metadata } from "next";
import { PurchaseList } from "@/components/app/purchase/purchase-list";

export const metadata: Metadata = {
	title: "Nhập hàng · NomoGreen",
};

export default function NhapHangPage() {
	return <PurchaseList />;
}
