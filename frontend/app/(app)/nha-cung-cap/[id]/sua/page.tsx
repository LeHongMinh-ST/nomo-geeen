"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { SupplierForm } from "@/components/app/supplier/supplier-form";
import {
	getTenantSupplier,
	type TenantSupplier,
} from "@/lib/tenant-suppliers-api";

export default function SuaNhaCungCapPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const [supplier, setSupplier] = useState<TenantSupplier | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	useEffect(() => {
		void getTenantSupplier(id)
			.then(setSupplier)
			.catch((e) =>
				setError(
					e instanceof Error ? e.message : "Không thể tải nhà cung cấp.",
				),
			)
			.finally(() => setLoading(false));
	}, [id]);
	if (loading)
		return <p className="text-base text-[#616161]">Đang tải nhà cung cấp...</p>;
	if (!supplier)
		return (
			<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
				<h1 className="text-lg font-semibold">Không tìm thấy nhà cung cấp</h1>
				<p className="text-base text-[#616161]">
					{error || "Nhà cung cấp có thể đã bị xóa hoặc không tồn tại."}
				</p>
				<Link
					href="/nha-cung-cap"
					className="flex h-12 items-center rounded-[10px] bg-primary px-6 text-base font-semibold text-white"
				>
					Về danh sách nhà cung cấp
				</Link>
			</div>
		);
	return <SupplierForm mode="edit" supplier={supplier} />;
}
