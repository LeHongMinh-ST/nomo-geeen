import type { Metadata } from "next";
import { OrderForm } from "@/components/app/sales/order-form";

export const metadata: Metadata = {
	title: "Tạo đơn · NomoGreen",
};

export default function TaoDonPage() {
	return <OrderForm />;
}
