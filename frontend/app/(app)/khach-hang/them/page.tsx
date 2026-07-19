import type { Metadata } from "next";
import { CustomerForm } from "@/components/app/customer/customer-form";

export const metadata: Metadata = {
	title: "Thêm khách hàng · NomoGreen",
};

export default function ThemKhachHangPage() {
	return <CustomerForm mode="create" />;
}
