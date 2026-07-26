import type { Metadata } from "next";
import { BusinessGroupSettings } from "@/components/app/settings/business-group-settings";

export const metadata: Metadata = {
	title: "Nhóm kinh doanh · NomoGreen",
};

export default function BusinessGroupPage() {
	return <BusinessGroupSettings />;
}
