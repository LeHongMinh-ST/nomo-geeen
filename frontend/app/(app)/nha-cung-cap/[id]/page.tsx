"use client";

import { use } from "react";
import { SupplierDetail } from "@/components/app/supplier/supplier-detail";

export default function ChiTietNhaCungCapPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	return <SupplierDetail id={id} />;
}
