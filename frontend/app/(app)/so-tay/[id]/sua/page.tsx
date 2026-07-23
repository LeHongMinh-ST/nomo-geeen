"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { DiseaseForm } from "@/components/app/handbook/disease-form";
import { SettingHeader } from "@/components/app/setting-header";
import type { Disease } from "@/lib/handbook";
import { getDisease } from "@/lib/handbook";
import { getHandbookEntry, toDisease } from "@/lib/tenant-handbook-api";

export default function SuaSoTayPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const [disease, setDisease] = useState<Disease | null | undefined>(undefined);

	useEffect(() => {
		let cancelled = false;
		getHandbookEntry(id)
			.then((entry) => {
				if (!cancelled) setDisease(toDisease(entry));
			})
			.catch(() => {
				if (!cancelled) setDisease(getDisease(id) ?? null);
			});
		return () => {
			cancelled = true;
		};
	}, [id]);

	if (disease === undefined) {
		return <p className="text-base text-[#9e9e9e]">Đang tải…</p>;
	}

	if (!disease) {
		return (
			<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center lg:mx-0">
				<h1 className="text-lg font-semibold text-foreground">
					Không tìm thấy mục sổ tay
				</h1>
				<p className="text-base text-[#616161]">
					Mục này có thể đã bị xóa hoặc không tồn tại.
				</p>
				<Link
					href="/so-tay"
					className="flex h-12 items-center rounded-[10px] bg-primary px-6 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
				>
					Về danh sách sổ tay
				</Link>
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 lg:mx-0">
			<SettingHeader
				title="Sửa sổ tay"
				description="Cập nhật bệnh và kinh nghiệm xử lý."
			/>
			<DiseaseForm mode="edit" disease={disease} />
		</div>
	);
}
