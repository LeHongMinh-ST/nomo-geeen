import type { Metadata } from "next";
import { DiseaseForm } from "@/components/app/handbook/disease-form";
import { SettingHeader } from "@/components/app/setting-header";

export const metadata: Metadata = {
	title: "Thêm sổ tay · NomoGreen",
};

export default function ThemSoTayPage() {
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 lg:mx-0">
			<SettingHeader
				title="Thêm sổ tay"
				description="Ghi lại bệnh và kinh nghiệm xử lý. Trường có dấu * là bắt buộc."
			/>
			<DiseaseForm mode="create" />
		</div>
	);
}
