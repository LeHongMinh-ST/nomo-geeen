import type { Metadata } from "next";
import { SupplierList } from "@/components/app/supplier/supplier-list";

export const metadata: Metadata = {
	title: "Nhà cung cấp · NomoGreen",
};

export default function NhaCungCapPage() {
	return <SupplierList />;
}
