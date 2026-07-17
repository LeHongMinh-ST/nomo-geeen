import type { Metadata } from "next";
import { PurchaseForm } from "@/components/app/purchase/purchase-form";

export const metadata: Metadata = {
	title: "Tạo phiếu nhập · NomoGreen",
};

export default function TaoPhieuNhapPage() {
	return <PurchaseForm />;
}
