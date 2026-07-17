import type { Metadata } from "next";
import { HandbookList } from "@/components/app/handbook/handbook-list";

export const metadata: Metadata = {
	title: "Sổ tay · NomoGreen",
};

export default function SoTayPage() {
	return <HandbookList />;
}
