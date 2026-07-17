import type { Metadata } from "next";
import { ProductList } from "@/components/app/product/product-list";

export const metadata: Metadata = {
	title: "Sản phẩm · NomoGreen",
};

export default function SanPhamPage() {
	return <ProductList />;
}
