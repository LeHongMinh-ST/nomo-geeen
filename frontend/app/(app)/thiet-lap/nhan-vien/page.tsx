import type { Metadata } from "next";
import { StaffManagement } from "@/components/app/settings/staff-management";

export const metadata: Metadata = {
	title: "Nhân viên · NomoGreen",
};

export default function StaffPage() {
	return <StaffManagement />;
}
