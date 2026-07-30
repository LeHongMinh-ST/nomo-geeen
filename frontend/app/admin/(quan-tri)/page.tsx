import type { Metadata } from "next";
import { AdminDashboardLive } from "@/components/admin/admin-dashboard-live";

export const metadata: Metadata = {
	title: "Bảng điều khiển · Quản trị NomoGreen",
	robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
	return <AdminDashboardLive />;
}
