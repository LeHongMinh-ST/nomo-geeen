import type { Metadata } from "next";
import { HomeDashboard } from "@/components/app/home-dashboard";

export const metadata: Metadata = {
	title: "Trang chủ · NomoGreen",
};

export default function TrangChuPage() {
	return <HomeDashboard />;
}
