/**
 * Kiểu dữ liệu + mock cho module Công nợ (base_spec §12 Debt Management).
 * FE-only: dữ liệu mẫu tại chỗ, thay bằng API ở task backend.
 *
 * Hai chiều nợ:
 *  - receivable (Phải thu): khách hàng đang nợ cửa hàng.
 *  - payable    (Phải trả): cửa hàng đang nợ nhà cung cấp.
 *
 * Số dư = Đầu kỳ + Phát sinh (bán chịu / nhập nợ) − Đã thu/trả.
 * Trạng thái tính theo TODAY cố định để không lệch giữa server và client (hydrate).
 */

/** Mốc "hôm nay" cố định cho mock — khớp docs/currentDate. */
export const TODAY = "2026-07-17";

export type DebtDirection = "receivable" | "payable";

export type DebtStatus = "current" | "due-soon" | "overdue" | "paid";

/** Hình thức thu/trả (base_spec §12). */
export type DebtPaymentMethod = "cash" | "transfer" | "qr";

/**
 * Một dòng biến động công nợ.
 *  - opening: số dư mang sang đầu kỳ.
 *  - charge : phát sinh nợ (bán chịu với khách / nhập nợ với NCC).
 *  - payment: một lần thu (khách trả) / trả (trả NCC).
 * `amount` luôn dương; ý nghĩa cộng/trừ suy ra từ `kind`.
 */
export type DebtEntryKind = "opening" | "charge" | "payment";

export type DebtEntry = {
	id: string;
	date: string;
	kind: DebtEntryKind;
	amount: number;
	/** Chỉ với payment. */
	method?: DebtPaymentMethod;
	/** Mã chứng từ liên quan (DH-0007, PN-0012...). */
	ref?: string;
	note?: string;
};

export type DebtAccount = {
	id: string;
	direction: DebtDirection;
	/** Tên khách / nhà cung cấp. */
	name: string;
	/** SĐT — định danh chính khi ghi nợ (base_spec §18). */
	phone: string;
	address?: string;
	/** Nhãn loại đối tác (Nông hộ, Đại lý, Nhà cung cấp...). */
	partyLabel: string;
	/** Hạn thanh toán (ISO YYYY-MM-DD). */
	dueDate?: string;
	entries: DebtEntry[];
};

export const paymentMethodLabel: Record<DebtPaymentMethod, string> = {
	cash: "Tiền mặt",
	transfer: "Chuyển khoản",
	qr: "Quét QR",
};

export const debtStatusLabel: Record<DebtStatus, string> = {
	current: "Còn nợ",
	"due-soon": "Sắp đến hạn",
	overdue: "Quá hạn",
	paid: "Đã tất toán",
};

/** Class badge trạng thái (DESIGN.md §13 — nền + chữ, không chỉ màu). */
export const debtStatusBadgeClass: Record<DebtStatus, string> = {
	current: "bg-[#fff8e1] text-[#f57f17]",
	"due-soon": "bg-[#fff3e0] text-[#e65100]",
	overdue: "bg-[#ffebee] text-[#c62828]",
	paid: "bg-[#e8f5e9] text-[#2e7d32]",
};

/* ------------------------------- Selectors ------------------------------- */

export function debtOpening(a: DebtAccount): number {
	return a.entries
		.filter((e) => e.kind === "opening")
		.reduce((s, e) => s + e.amount, 0);
}

/** Tổng phát sinh nợ (bán chịu / nhập nợ). */
export function debtCharged(a: DebtAccount): number {
	return a.entries
		.filter((e) => e.kind === "charge")
		.reduce((s, e) => s + e.amount, 0);
}

/** Tổng đã thu (khách) / đã trả (NCC). */
export function debtPaid(a: DebtAccount): number {
	return a.entries
		.filter((e) => e.kind === "payment")
		.reduce((s, e) => s + e.amount, 0);
}

/** Số còn lại phải thu/trả. */
export function debtOutstanding(a: DebtAccount): number {
	return Math.max(0, debtOpening(a) + debtCharged(a) - debtPaid(a));
}

function toUTC(iso: string): number {
	const [y, m, d] = iso.split("-").map(Number);
	return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

/** Số ngày từ `fromIso` đến `toIso` (âm nếu toIso đã qua). */
export function daysBetween(fromIso: string, toIso: string): number {
	return Math.round((toUTC(toIso) - toUTC(fromIso)) / 86_400_000);
}

export function debtStatus(a: DebtAccount): DebtStatus {
	if (debtOutstanding(a) <= 0) return "paid";
	if (!a.dueDate) return "current";
	const days = daysBetween(TODAY, a.dueDate);
	if (days < 0) return "overdue";
	if (days <= 7) return "due-soon";
	return "current";
}

/** Màu số nợ lớn (DESIGN.md §16 — Warning còn hạn, Error quá hạn). */
export function debtAmountColor(a: DebtAccount): string {
	const st = debtStatus(a);
	if (st === "overdue") return "text-[#c62828]";
	if (st === "paid") return "text-[#2e7d32]";
	return "text-[#f57f17]";
}

/** Mô tả hạn thanh toán ngắn gọn, đời thường. */
export function debtDueText(a: DebtAccount): string {
	const st = debtStatus(a);
	if (st === "paid") return "Đã tất toán";
	if (!a.dueDate) return "Chưa hẹn hạn";
	const days = daysBetween(TODAY, a.dueDate);
	if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
	if (days === 0) return "Đến hạn hôm nay";
	return `Còn ${days} ngày đến hạn`;
}

const statusRank: Record<DebtStatus, number> = {
	overdue: 0,
	"due-soon": 1,
	current: 2,
	paid: 3,
};

/** Sắp xếp ưu tiên (DESIGN.md §16): quá hạn → sắp đến hạn → nợ nhiều nhất. */
export function compareDebtUrgency(a: DebtAccount, b: DebtAccount): number {
	const ra = statusRank[debtStatus(a)];
	const rb = statusRank[debtStatus(b)];
	if (ra !== rb) return ra - rb;
	// Cùng nhóm quá hạn / sắp đến hạn: đến hạn sớm hơn lên trước.
	if (ra <= 1) return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
	// Còn hạn: nợ nhiều hơn lên trước.
	return debtOutstanding(b) - debtOutstanding(a);
}

/** Thêm một lần thu/trả (cập nhật cục bộ FE — chưa nối API). */
export function withPayment(
	a: DebtAccount,
	amount: number,
	method: DebtPaymentMethod,
	note?: string,
): DebtAccount {
	const entry: DebtEntry = {
		id: `pay-${a.id}-${a.entries.length}`,
		date: TODAY,
		kind: "payment",
		amount,
		method,
		note,
	};
	return { ...a, entries: [...a.entries, entry] };
}

/* --------------------------------- Mock ---------------------------------- */

type ChargeSeed = { date: string; amount: number; ref?: string; note?: string };
type PaySeed = {
	date: string;
	amount: number;
	method: DebtPaymentMethod;
	note?: string;
};

function makeAccount(
	base: Omit<DebtAccount, "entries">,
	opening: { date: string; amount: number } | null,
	charges: ChargeSeed[],
	payments: PaySeed[],
): DebtAccount {
	const entries: DebtEntry[] = [];
	let n = 0;
	const push = (e: Omit<DebtEntry, "id">) => {
		entries.push({ id: `${base.id}-e${n++}`, ...e });
	};
	if (opening) push({ kind: "opening", ...opening });
	for (const c of charges) push({ kind: "charge", ...c });
	for (const p of payments) push({ kind: "payment", ...p });
	entries.sort((x, y) => x.date.localeCompare(y.date));
	return { ...base, entries };
}

/** Phải thu — khách đang nợ cửa hàng. kh1/kh3/kh5 khớp customers.ts. */
export const receivables: DebtAccount[] = [
	makeAccount(
		{
			id: "kh3",
			direction: "receivable",
			name: "Trang trại Thành Công",
			phone: "0909111222",
			address: "Xã Long Hòa",
			partyLabel: "Trang trại",
			dueDate: "2026-07-14",
		},
		{ date: "2026-06-30", amount: 1_200_000 },
		[{ date: "2026-07-06", amount: 4_900_000, ref: "DH-0210" }],
		[{ date: "2026-07-08", amount: 1_250_000, method: "cash" }],
	),
	makeAccount(
		{
			id: "kh1",
			direction: "receivable",
			name: "Anh Ba",
			phone: "0912345678",
			address: "Tổ 3, Ấp Bình Thành",
			partyLabel: "Nông hộ",
			dueDate: "2026-07-20",
		},
		{ date: "2026-06-30", amount: 500_000 },
		[{ date: "2026-07-12", amount: 900_000, ref: "DH-0007" }],
		[{ date: "2026-07-14", amount: 200_000, method: "transfer" }],
	),
	makeAccount(
		{
			id: "r-saukey",
			direction: "receivable",
			name: "Chú Sáu Rẫy",
			phone: "0918777888",
			address: "Ấp Phú Thành",
			partyLabel: "Nông hộ",
			dueDate: "2026-07-11",
		},
		null,
		[{ date: "2026-07-01", amount: 2_300_000, ref: "DH-0195" }],
		[],
	),
	makeAccount(
		{
			id: "r-tanphat",
			direction: "receivable",
			name: "Đại lý Tân Phát",
			phone: "0938444555",
			address: "QL1A, Cai Lậy",
			partyLabel: "Đại lý",
			dueDate: "2026-08-05",
		},
		null,
		[
			{ date: "2026-07-05", amount: 2_000_000, ref: "DH-0201" },
			{ date: "2026-07-12", amount: 1_600_000, ref: "DH-0209" },
		],
		[],
	),
	makeAccount(
		{
			id: "r-camia",
			direction: "receivable",
			name: "Cô Tám Mía",
			phone: "0977555111",
			partyLabel: "Khách lẻ",
			dueDate: "2026-07-19",
		},
		null,
		[{ date: "2026-07-09", amount: 780_000, ref: "DH-0204" }],
		[],
	),
	makeAccount(
		{
			id: "kh5",
			direction: "receivable",
			name: "Anh Năm Tèo",
			phone: "0977333444",
			address: "Ấp Tân Hưng",
			partyLabel: "Nông hộ",
			dueDate: "2026-08-15",
		},
		null,
		[{ date: "2026-07-15", amount: 320_000, ref: "DH-0212" }],
		[],
	),
	makeAccount(
		{
			id: "r-dongtien",
			direction: "receivable",
			name: "HTX Đồng Tiến",
			phone: "0908999000",
			address: "Xã Mỹ Thành",
			partyLabel: "Đại lý",
			dueDate: "2026-08-10",
		},
		{ date: "2026-06-25", amount: 2_000_000 },
		[{ date: "2026-07-04", amount: 3_900_000, ref: "DH-0199" }],
		[{ date: "2026-07-10", amount: 500_000, method: "qr" }],
	),
	makeAccount(
		{
			id: "r-hailua",
			direction: "receivable",
			name: "Anh Hai Lúa",
			phone: "0916222444",
			partyLabel: "Nông hộ",
			dueDate: "2026-07-09",
		},
		null,
		[{ date: "2026-06-28", amount: 1_050_000, ref: "DH-0188" }],
		[],
	),
	makeAccount(
		{
			id: "r-bayrau",
			direction: "receivable",
			name: "Chị Bảy Rau",
			phone: "0933666777",
			partyLabel: "Khách lẻ",
			dueDate: "2026-07-21",
		},
		null,
		[{ date: "2026-07-08", amount: 600_000, ref: "DH-0203" }],
		[{ date: "2026-07-13", amount: 140_000, method: "cash" }],
	),
];

/** Phải trả — cửa hàng đang nợ nhà cung cấp. */
export const payables: DebtAccount[] = [
	makeAccount(
		{
			id: "ncc-binhdien",
			direction: "payable",
			name: "Vật tư Bình Điền",
			phone: "0283822xxxx",
			address: "KCN Long An",
			partyLabel: "Nhà cung cấp",
			dueDate: "2026-07-13",
		},
		{ date: "2026-06-20", amount: 3_000_000 },
		[{ date: "2026-07-03", amount: 12_000_000, ref: "PN-0031" }],
		[{ date: "2026-07-07", amount: 2_500_000, method: "transfer" }],
	),
	makeAccount(
		{
			id: "ncc-bayer",
			direction: "payable",
			name: "Bayer Việt Nam",
			phone: "0283911xxxx",
			partyLabel: "Nhà cung cấp",
			dueDate: "2026-07-22",
		},
		null,
		[{ date: "2026-07-05", amount: 6_800_000, ref: "PN-0033" }],
		[],
	),
	makeAccount(
		{
			id: "ncc-loctroi",
			direction: "payable",
			name: "Tập đoàn Lộc Trời",
			phone: "0296384xxxx",
			address: "An Giang",
			partyLabel: "Nhà cung cấp",
			dueDate: "2026-08-01",
		},
		null,
		[
			{ date: "2026-07-02", amount: 5_000_000, ref: "PN-0029" },
			{ date: "2026-07-11", amount: 4_200_000, ref: "PN-0035" },
		],
		[],
	),
	makeAccount(
		{
			id: "ncc-syngenta",
			direction: "payable",
			name: "Syngenta Việt Nam",
			phone: "0283822yyyy",
			partyLabel: "Nhà cung cấp",
			dueDate: "2026-07-10",
		},
		null,
		[{ date: "2026-06-29", amount: 3_650_000, ref: "PN-0027" }],
		[{ date: "2026-07-06", amount: 500_000, method: "cash" }],
	),
	makeAccount(
		{
			id: "ncc-damcamau",
			direction: "payable",
			name: "Đạm Cà Mau",
			phone: "0290383xxxx",
			address: "Cà Mau",
			partyLabel: "Nhà cung cấp",
			dueDate: "2026-08-08",
		},
		{ date: "2026-06-18", amount: 1_700_000 },
		[{ date: "2026-07-09", amount: 3_000_000, ref: "PN-0034" }],
		[],
	),
];

export function debtAccounts(direction: DebtDirection): DebtAccount[] {
	return direction === "receivable" ? receivables : payables;
}

export function getDebt(id: string): DebtAccount | undefined {
	return [...receivables, ...payables].find((a) => a.id === id);
}

/** Tổng còn phải thu/trả của một danh sách. */
export function sumOutstanding(list: DebtAccount[]): number {
	return list.reduce((s, a) => s + debtOutstanding(a), 0);
}

/** Số tài khoản đang quá hạn. */
export function countOverdue(list: DebtAccount[]): number {
	return list.filter((a) => debtStatus(a) === "overdue").length;
}
