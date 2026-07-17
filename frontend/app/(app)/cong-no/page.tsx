import type { Metadata } from "next";
import { DebtList } from "@/components/app/debt/debt-list";

export const metadata: Metadata = {
	title: "Công nợ · NomoGreen",
};

export default function CongNoPage() {
	return <DebtList />;
}
