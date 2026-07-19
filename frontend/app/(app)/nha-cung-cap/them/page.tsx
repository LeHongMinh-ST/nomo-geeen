import type { Metadata } from "next";
import { SupplierForm } from "@/components/app/supplier/supplier-form";

export const metadata: Metadata = {
	title: "Thêm nhà cung cấp · NomoGreen",
};

export default function ThemNhaCungCapPage() {
	return <SupplierForm mode="create" />;
}
