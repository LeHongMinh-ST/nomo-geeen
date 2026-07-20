"use client";

import Link from "next/link";
import { use } from "react";
import { useEffect, useState } from "react";
import { ProductDetail } from "@/components/app/product/product-detail";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import {
	getProductLookups,
	getTenantProduct,
	mapTenantProduct,
} from "@/lib/tenant-products-api";

export default function ChiTietSanPhamPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const [state, setState] = useState<{
		status: "loading" | "ready" | "error";
		product?: ReturnType<typeof mapTenantProduct>;
	}>({ status: "loading" });

	useEffect(() => {
		let active = true;
		void Promise.all([getTenantProduct(id), getProductLookups()])
			.then(([row, lookups]) => {
				if (active)
					setState({
						status: "ready",
						product: mapTenantProduct(row, lookups),
					});
			})
			.catch(() => {
				if (active) setState({ status: "error" });
			});
		return () => {
			active = false;
		};
	}, [id]);

	if (state.status === "loading") return <ListSkeleton rows={5} />;
	const product = state.product;

	if (!product) {
		return (
			<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center lg:mx-0">
				<h1 className="text-lg font-semibold text-foreground">
					Không tìm thấy sản phẩm
				</h1>
				<p className="text-base text-[#616161]">
					Sản phẩm có thể đã bị xóa hoặc không tồn tại.
				</p>
				<Link
					href="/san-pham"
					className="flex h-12 items-center rounded-[10px] bg-primary px-6 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
				>
					Về danh sách sản phẩm
				</Link>
			</div>
		);
	}

	return <ProductDetail product={product} />;
}
