import type { Metadata } from "next";
import { ProductForm } from "@/components/app/product/product-form";
import { SettingHeader } from "@/components/app/setting-header";

export const metadata: Metadata = {
	title: "Thêm sản phẩm · NomoGreen",
};

export default function ThemSanPhamPage() {
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 lg:mx-0">
			<SettingHeader
				title="Thêm sản phẩm"
				description="Điền thông tin hàng hóa. Trường có dấu * là bắt buộc."
			/>
			<ProductForm mode="create" />
		</div>
	);
}
