import type { Metadata } from "next";
import { CustomerList } from "@/components/app/customer/customer-list";

export const metadata: Metadata = {
	title: "Khách hàng · NomoGreen",
};

export default function KhachHangPage() {
	return <CustomerList />;
}
