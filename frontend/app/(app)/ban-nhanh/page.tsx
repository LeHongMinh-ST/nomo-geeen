import type { Metadata } from "next";
import { QuickSale } from "@/components/app/sales/quick-sale";

export const metadata: Metadata = {
	title: "Bán nhanh · NomoGreen",
};

export default function BanNhanhPage() {
	return <QuickSale />;
}
