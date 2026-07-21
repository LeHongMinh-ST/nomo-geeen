"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { CustomerForm } from "@/components/app/customer/customer-form";
import { type Customer, getCustomer } from "@/lib/tenant-customers-api";

export default function EditCustomerPage({
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
	if (error)
		return (
			<div className="text-center">
				<p>Không tìm thấy khách hàng</p>
				<Link href="/khach-hang" className="text-primary">
					Về danh sách khách hàng
				</Link>
			</div>
		);
	if (!customer)
		return <p className="text-[#616161]">Đang tải khách hàng...</p>;
	return <CustomerForm mode="edit" customer={customer} />;
}
