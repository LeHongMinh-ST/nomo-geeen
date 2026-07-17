import type { Metadata } from "next";
import { CategoryManager } from "@/components/app/product/category-manager";

export const metadata: Metadata = {
	title: "Quản lý danh mục · NomoGreen",
};

export default function DanhMucPage() {
	return <CategoryManager />;
}
