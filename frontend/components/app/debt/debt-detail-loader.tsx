"use client";

import { useCallback, useEffect, useState } from "react";
import type { DebtAccount, DebtPaymentMethod } from "@/lib/debts";
import {
	createDebtVoucher,
	type DebtDetailResponse,
	type DebtPartyType,
	getDebtDetail,
} from "@/lib/tenant-debts-api";
import { DebtDetail } from "./debt-detail";

function voucherMethod(method: string | undefined) {
	return method === "BANK_TRANSFER"
		? "transfer"
		: method === "QR"
			? "qr"
			: method === "CASH"
				? "cash"
				: undefined;
}

export function debtDetailToAccount(data: DebtDetailResponse): DebtAccount {
	const type = data.party.partyType;
	const voucherById = new Map(
		data.vouchers.map((voucher) => [voucher.id, voucher]),
	);
	return {
		id: data.party.id,
		direction: type === "CUSTOMER" ? "receivable" : "payable",
		name: data.party.name,
		phone: data.party.phone ?? "",
		address: data.party.address ?? undefined,
		partyLabel: type === "CUSTOMER" ? "Khách hàng" : "Nhà cung cấp",
		entries: data.entries.map((entry) => ({
			id: entry.id,
			date: entry.occurredAt.slice(0, 10),
			kind:
				entry.direction === "DECREASE"
					? "payment"
					: entry.entryType === "OPENING"
						? "opening"
						: "charge",
			amount: entry.amount,
			method:
				entry.direction === "DECREASE"
					? voucherMethod(voucherById.get(entry.refId ?? "")?.method)
					: undefined,
			note: entry.note ?? undefined,
			ref: entry.refId ?? undefined,
		})),
	};
}

export function DebtDetailLoader({
	id,
	type,
}: {
	id: string;
	type: DebtPartyType;
}) {
	const [account, setAccount] = useState<DebtAccount | null>(null);
	const [error, setError] = useState(false);

	const load = useCallback(() => getDebtDetail(type, id), [id, type]);
	useEffect(() => {
		let active = true;
		void load()
			.then((data) => {
				if (active) setAccount(debtDetailToAccount(data));
			})
			.catch(() => {
				if (active) setError(true);
			});
		return () => {
			active = false;
		};
	}, [load]);

	const handlePayment = useCallback(
		async (amount: number, method: DebtPaymentMethod) => {
			await createDebtVoucher({
				voucherType: type === "CUSTOMER" ? "RECEIPT" : "PAYMENT",
				partyType: type,
				partyId: id,
				amount,
				method:
					method === "cash"
						? "CASH"
						: method === "transfer"
							? "BANK_TRANSFER"
							: "QR",
			});
			const refreshed = await load();
			const next = debtDetailToAccount(refreshed);
			setAccount(next);
			return next;
		},
		[id, load, type],
	);

	if (error)
		return (
			<p className="text-base text-[#c62828]">Không thể tải sổ công nợ.</p>
		);
	if (!account)
		return <p className="text-base text-[#616161]">Đang tải sổ công nợ...</p>;
	return <DebtDetail account={account} onPayment={handlePayment} />;
}
