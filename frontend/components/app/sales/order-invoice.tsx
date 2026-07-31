"use client";

import { jsPDF } from "jspdf";
import { Download, Printer } from "lucide-react";
import { formatDateTime, formatVND } from "@/lib/format";
import type { SalesOrderDetail } from "@/lib/tenant-sales-api";

const paymentLabel: Record<string, string> = {
	CASH: "Tiền mặt",
	BANK_TRANSFER: "Chuyển khoản",
	QR: "QR",
	DEBT: "Ghi nợ",
};

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

function invoiceDate(value: string | null): string {
	if (!value) return "—";
	return formatDateTime(value);
}

function invoiceDateHtml(value: string | null): string {
	return escapeHtml(invoiceDate(value));
}

function moneyHtml(value: number): string {
	return `${escapeHtml(formatVND(value))} ₫`;
}

export function buildInvoiceHtml(order: SalesOrderDetail): string {
	const customer = order.customer?.name || "Khách lẻ";
	const payment = order.paymentMethod
		? (paymentLabel[order.paymentMethod] ?? order.paymentMethod)
		: "Chưa thanh toán";
	const lines = order.lines
		.map(
			(line, index) => `
				<tr>
					<td>${index + 1}</td>
					<td>${escapeHtml(line.productName)}<small>${escapeHtml(line.qty)} ${escapeHtml(line.unitName)}</small></td>
					<td>${moneyHtml(line.unitPrice)}</td>
					<td>${moneyHtml(line.lineTotal)}</td>
				</tr>`,
		)
		.join("");

	return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>Hóa đơn ${escapeHtml(order.docNo)}</title>
<style>
@page{size:80mm auto;margin:5mm}*{box-sizing:border-box}body{margin:0;color:#1b1f1b;font:12px/1.45 Arial,sans-serif}.invoice{width:70mm;margin:0 auto}.center{text-align:center}.brand{font-size:15px;font-weight:700}.title{margin:10px 0 2px;font-size:17px;font-weight:700}.rule{border-top:1px dashed #777;margin:8px 0}.meta{display:grid;grid-template-columns:auto 1fr;gap:2px 6px;margin:8px 0}.meta b{font-weight:700}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #333;padding:4px 3px;text-align:right;vertical-align:top}th:nth-child(2),td:nth-child(2){text-align:left}th{font-weight:700}td small{display:block;color:#555}.total{border-top:2px solid #1b1f1b;margin-top:8px;padding-top:6px;font-size:15px;font-weight:700}.summary{display:flex;justify-content:space-between;gap:8px;margin-top:3px}.thanks{text-align:center;margin-top:12px}.note{margin-top:8px;font-style:italic}.foot{border-top:1px dashed #777;margin-top:10px;padding-top:8px;font-size:11px}
</style></head><body><main class="invoice">
<header class="center"><div class="brand">NomoGreen</div><div>Phần mềm bán hàng vật tư nông nghiệp</div><div class="rule"></div><div class="title">HÓA ĐƠN THANH TOÁN</div><div>Số: <b>${escapeHtml(order.docNo)}</b></div></header>
<section class="meta"><b>Ngày:</b><span>${invoiceDateHtml(order.soldAt ?? order.createdAt)}</span><b>Khách hàng:</b><span>${escapeHtml(customer)}</span>${order.customer?.phone ? `<b>SĐT:</b><span>${escapeHtml(order.customer.phone)}</span>` : ""}${order.customer?.address ? `<b>Địa chỉ:</b><span>${escapeHtml(order.customer.address)}</span>` : ""}</section>
<table><thead><tr><th>#</th><th>Tên hàng</th><th>ĐG</th><th>TT</th></tr></thead><tbody>${lines}</tbody></table>
<section><div class="summary"><span>Tiền hàng</span><b>${moneyHtml(order.subtotal)}</b></div><div class="summary"><span>Chiết khấu</span><b>−${moneyHtml(order.discountAmount)}</b></div><div class="summary total"><span>TỔNG THANH TOÁN</span><span>${moneyHtml(order.total)}</span></div><div class="summary"><span>${escapeHtml(payment)}</span><span>${moneyHtml(order.amountPaid)}</span></div>${order.changeAmount > 0 ? `<div class="summary"><span>Trả lại khách</span><span>${moneyHtml(order.changeAmount)}</span></div>` : ""}${order.debtAmount > 0 ? `<div class="summary"><span>Công nợ</span><b>${moneyHtml(order.debtAmount)}</b></div>` : ""}</section>
${order.note ? `<p class="note">Ghi chú: ${escapeHtml(order.note)}</p>` : ""}<p class="thanks">Trân trọng cảm ơn quý khách!</p><footer class="foot">Hóa đơn này được tạo từ dữ liệu đơn hàng trên NomoGreen. Không phải hóa đơn điện tử có mã cơ quan thuế.</footer>
</main></body></html>`;
}

async function loadInvoiceFont(): Promise<string> {
	const response = await fetch("/fronts/BeVietnamPro-Regular.ttf");
	if (!response.ok) throw new Error("Không thể tải phông chữ hóa đơn");
	const bytes = new Uint8Array(await response.arrayBuffer());
	let binary = "";
	for (let index = 0; index < bytes.length; index += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	}
	return btoa(binary);
}

function invoicePageFormat(order: SalesOrderDetail): [number, number] {
	const rowHeight = order.lines.reduce((height, line) => {
		return height + (line.productName.length > 22 ? 12 : 8);
	}, 0);
	return [80, Math.max(150, 92 + rowHeight)];
}

function renderInvoicePage(pdf: jsPDF, order: SalesOrderDetail): void {
	const width = 80;
	const left = 6;
	const right = 74;
	let y = 10;
	const line = (
		text: string,
		size = 8,
		align: "left" | "center" | "right" = "left",
	) => {
		pdf.setFontSize(size);
		pdf.text(
			text,
			align === "center" ? width / 2 : align === "right" ? right : left,
			y,
			{ align },
		);
		y += size >= 12 ? 7 : 5;
	};

	line("NomoGreen", 13, "center");
	line("Phần mềm bán hàng vật tư nông nghiệp", 7, "center");
	y += 2;
	pdf.setLineDashPattern([1, 1], 0);
	pdf.line(left, y, right, y);
	y += 7;
	line("HÓA ĐƠN THANH TOÁN", 12, "center");
	line(`Số: ${order.docNo}`, 8, "center");
	y += 2;
	line(`Ngày: ${invoiceDate(order.soldAt ?? order.createdAt)}`);
	line(`Khách hàng: ${order.customer?.name || "Khách lẻ"}`);
	if (order.customer?.phone) line(`SĐT: ${order.customer.phone}`);
	if (order.customer?.address) line(`Địa chỉ: ${order.customer.address}`);
	y += 2;

	const tableTop = y;
	const columns = [left, 12, 45, 61, right];
	pdf.rect(left, tableTop, right - left, 8);
	for (const x of columns.slice(1, -1)) pdf.line(x, tableTop, x, tableTop + 8);
	pdf.setFontSize(7);
	pdf.text("#", 9, tableTop + 5, { align: "center" });
	pdf.text("Tên hàng", 14, tableTop + 5);
	pdf.text("ĐG", 53, tableTop + 5, { align: "center" });
	pdf.text("TT", 67.5, tableTop + 5, { align: "center" });
	y = tableTop + 8;
	for (const [index, item] of order.lines.entries()) {
		const nameLines = pdf.splitTextToSize(item.productName, 29) as string[];
		const height = Math.max(8, nameLines.length * 4 + 3);
		pdf.rect(left, y, right - left, height);
		for (const x of columns.slice(1, -1)) pdf.line(x, y, x, y + height);
		pdf.text(String(index + 1), 9, y + 5, { align: "center" });
		pdf.text(nameLines, 14, y + 4);
		pdf.text(formatVND(item.unitPrice), 58.5, y + 5, { align: "right" });
		pdf.text(formatVND(item.lineTotal), 72.5, y + 5, { align: "right" });
		y += height;
	}

	y += 6;
	const summary = (label: string, value: string, bold = false) => {
		pdf.setFontSize(bold ? 10 : 8);
		pdf.text(label, left, y);
		pdf.text(value, right, y, { align: "right" });
		y += bold ? 7 : 5;
	};
	pdf.setLineDashPattern([], 0);
	pdf.line(left, y - 3, right, y - 3);
	summary("Tiền hàng", `${formatVND(order.subtotal)} ₫`);
	summary("Chiết khấu", `−${formatVND(order.discountAmount)} ₫`);
	summary("TỔNG THANH TOÁN", `${formatVND(order.total)} ₫`, true);
	summary(
		paymentLabel[order.paymentMethod ?? ""] ?? "Chưa thanh toán",
		`${formatVND(order.amountPaid)} ₫`,
	);
	if (order.changeAmount > 0)
		summary("Trả lại khách", `${formatVND(order.changeAmount)} ₫`);
	if (order.debtAmount > 0)
		summary("Công nợ", `${formatVND(order.debtAmount)} ₫`, true);
	if (order.note) {
		const noteLines = pdf.splitTextToSize(
			`Ghi chú: ${order.note}`,
			68,
		) as string[];
		pdf.setFontSize(8);
		pdf.text(noteLines, left, y);
		y += noteLines.length * 4 + 2;
	}
	y += 3;
	line("Trân trọng cảm ơn quý khách!", 8, "center");
	pdf.setFontSize(6.5);
	pdf.text(
		"Hóa đơn tạo từ đơn hàng NomoGreen; không phải hóa đơn điện tử có mã cơ quan thuế.",
		width / 2,
		y,
		{
			align: "center",
			maxWidth: 68,
		},
	);
}

async function createInvoicePdf(first: SalesOrderDetail): Promise<jsPDF> {
	const font = await loadInvoiceFont();
	const pdf = new jsPDF({ unit: "mm", format: invoicePageFormat(first) });
	pdf.addFileToVFS("BeVietnamPro-Regular.ttf", font);
	pdf.addFont("BeVietnamPro-Regular.ttf", "BeVietnamPro", "normal");
	pdf.setFont("BeVietnamPro");
	pdf.setTextColor(27, 31, 27);
	return pdf;
}

export async function downloadOrderInvoice(
	order: SalesOrderDetail,
): Promise<void> {
	const pdf = await createInvoicePdf(order);
	renderInvoicePage(pdf, order);
	pdf.save(`hoa-don-${order.docNo}.pdf`);
}

/** Gộp nhiều hóa đơn thành một file PDF, mỗi đơn một trang khổ 80mm. */
export async function downloadOrderInvoices(
	orders: SalesOrderDetail[],
): Promise<void> {
	const [first, ...rest] = orders;
	if (!first) return;
	const pdf = await createInvoicePdf(first);
	renderInvoicePage(pdf, first);
	for (const order of rest) {
		pdf.addPage(invoicePageFormat(order));
		pdf.setFont("BeVietnamPro");
		renderInvoicePage(pdf, order);
	}
	pdf.save(`hoa-don-${orders.length}-don.pdf`);
}

export function OrderInvoiceActions({ order }: { order: SalesOrderDetail }) {
	const print = () => {
		const frame = document.getElementById(
			`order-invoice-print-${order.id}`,
		) as HTMLIFrameElement | null;
		frame?.contentWindow?.focus();
		frame?.contentWindow?.print();
	};

	return (
		<fieldset
			className="flex flex-col gap-3 border-0 p-0 sm:flex-row"
			aria-label="Tác vụ hóa đơn"
		>
			<button
				type="button"
				className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[10px] border border-border bg-card px-4 text-base font-semibold hover:bg-soft"
				onClick={() => void downloadOrderInvoice(order)}
			>
				<Download className="size-5" aria-hidden="true" />
				Tải PDF hóa đơn
			</button>
			<button
				type="button"
				className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-base font-semibold text-white hover:bg-[#4f9c3a]"
				onClick={print}
			>
				<Printer className="size-5" aria-hidden="true" />
				In hóa đơn
			</button>
		</fieldset>
	);
}

export function OrderInvoicePrint({ order }: { order: SalesOrderDetail }) {
	return (
		<iframe
			id={`order-invoice-print-${order.id}`}
			title={`Hóa đơn ${order.docNo}`}
			className="order-invoice-print absolute left-[-9999px] h-px w-px border-0"
			srcDoc={buildInvoiceHtml(order)}
		/>
	);
}
