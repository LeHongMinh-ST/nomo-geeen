"use client";

import Link from "next/link";
import { use } from "react";
import { SupplierForm } from "@/components/app/supplier/supplier-form";
import { getSupplier } from "@/lib/suppliers";

export default function SuaNhaCungCapPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const supplier = getSupplier(id);

	if (!supplier) {
		return (
			<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center lg:mx-0">
				<h1 className="text-lg font-semibold text-foreground">
					Không tìm thấy nhà cung cấp
				</h1>
				<Link
					href="/nha-cung-cap"
					className="flex h-12 items-center rounded-[10px] bg-primary px-6 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
				>
					Về danh sách nhà cung cấp
				</Link>
			</div>
		);
	}

	return <SupplierForm mode="edit" supplier={supplier} />;
}
