"use client";

import { use } from "react";
import { DebtDetailLoader } from "@/components/app/debt/debt-detail-loader";

export default function ChiTietCongNoPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ partyType?: string }>;
}) {
	const { id } = use(params);
	const { partyType } = use(searchParams);
	return (
		<DebtDetailLoader
			id={id}
			type={partyType === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER"}
		/>
	);
}
