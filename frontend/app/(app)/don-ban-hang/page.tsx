import type { Metadata } from "next";
import { OrderList } from "@/components/app/sales/order-list";

export const metadata: Metadata = {
	title: "Đơn bán hàng · NomoGreen",
};

export default function DonBanHangPage() {
	return <OrderList />;
}
