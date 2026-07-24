import type { Metadata } from "next";
import { ReportsPage } from "@/components/app/reports/reports-page";

export const metadata: Metadata = {
	title: "Báo cáo · NomoGreen",
};

export default function BaoCaoPage() {
	return <ReportsPage />;
}
