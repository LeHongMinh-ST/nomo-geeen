"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { CustomerDetail } from "@/components/app/customer/customer-detail";
import { type Customer, getCustomer } from "@/lib/tenant-customers-api";

export default function CustomerDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [error, setError] = useState(false);
	useEffect(() => {
		getCustomer(id)
			.then(setCustomer)
			.catch(() => setError(true));
	}, [id]);
	if (error) return <NotFound />;
	if (!customer)
		return <p className="text-[#616161]">Đang tải khách hàng...</p>;
	return <CustomerDetail customer={customer} />;
}

function NotFound() {
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
			<h1 className="text-lg font-semibold">Không tìm thấy khách hàng</h1>
			<Link
				href="/khach-hang"
				className="rounded-[10px] bg-primary px-6 py-3 font-semibold text-white"
			>
				Về danh sách khách hàng
			</Link>
		</div>
	);
}
